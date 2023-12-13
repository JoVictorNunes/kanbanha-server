import withErrorHandler from "@/modules/common/error/withErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
  Team,
  CreateTeamData,
  DeleteTeamData,
  UpdateTeamData,
} from "@/io";
import { CreateTeamSchema, DeleteTeamSchema, UpdateTeamSchema } from "./validation";
import { UnauthorizedException } from "@/exceptions";
import { ACKNOWLEDGEMENTS } from "@/constants";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import prisma from "../../services/prisma";

export default class TeamHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: CreateTeamData, callback: ResponseCallback) {
    await CreateTeamSchema.validateAsync(data);
    const { projectId, members, name } = data;
    const currentMember = this.socket.data.member!;
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMember.id,
          projectId: projectId,
        },
      },
    });
    const isOwnedByMember = membership && membership.owner;
    if (!isOwnedByMember) {
      throw new UnauthorizedException(
        "You do not have permission to create a team for this project."
      );
    }
    const memberIds = members ? members : [currentMember.id];
    if (!memberIds.includes(currentMember.id)) {
      memberIds.push(currentMember.id);
    }
    const projectMembers = await prisma.member.findMany({
      where: {
        projects: {
          some: { projectId },
        },
      },
    });
    const projectMemberIds = projectMembers.map((m) => m.id);
    const filteredMemberIds = memberIds.filter((memberId) => projectMemberIds.includes(memberId));
    const createdTeam = await prisma.team.create({
      data: {
        name,
        project: {
          connect: { id: projectId },
        },
        members: {
          create: [
            ...filteredMemberIds.map((memberId) => ({
              member: {
                connect: {
                  id: memberId,
                },
              },
            })),
          ],
        },
      },
    });
    const teamData = {
      ...createdTeam,
      members: memberIds,
    };
    this.io.to(memberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.CREATE, teamData);
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Team[]>) {
    const currentMember = this.socket.data.member!;
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            memberId: currentMember.id,
          },
        },
      },
      include: {
        members: {
          select: {
            memberId: true,
          },
        },
      },
    });
    const teamData = teams.map((team) => ({
      ...team,
      members: team.members.map((member) => member.memberId),
    }));
    callback(teamData);
  }

  async update(data: UpdateTeamData, callback: ResponseCallback) {
    await UpdateTeamSchema.validateAsync(data);
    const { name, teamId } = data;
    const currentMember = this.socket.data.member!;
    const team = await prisma.team.findUniqueOrThrow({
      where: {
        id: teamId,
      },
    });
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMember.id,
          projectId: team.projectId,
        },
      },
    });
    const isOwnedByMember = membership && membership.owner;
    if (!isOwnedByMember) {
      throw new UnauthorizedException();
    }
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { name },
      include: {
        members: {
          select: {
            memberId: true,
          },
        },
        project: true,
      },
    });
    const teamMemberIds = updatedTeam.members.map((member) => member.memberId);
    const teamData = {
      ...updatedTeam,
      members: teamMemberIds,
      projectId: team.projectId,
    };
    this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.UPDATE, teamData);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }

  async delete(data: DeleteTeamData, callback: ResponseCallback) {
    await DeleteTeamSchema.validateAsync(data);
    const { id: teamId } = data
    const currentMember = this.socket.data.member!;
    const team = await prisma.team.findUniqueOrThrow({
      where: {
        id: teamId,
      },
    });
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMember.id,
          projectId: team.projectId,
        },
      },
    });
    const isOwnedByMember = membership && membership.owner;
    if (!isOwnedByMember) {
      throw new UnauthorizedException();
    }
    const deletedTeam = await prisma.team.findUniqueOrThrow({
      where: {
        id: teamId,
      },
      include: {
        tasks: true,
        members: true,
      },
    });
    await prisma.$transaction([
      prisma.assignee.deleteMany({
        where: {
          task: {
            teamId,
          },
        },
      }),
      prisma.teamMembership.deleteMany({
        where: {
          teamId,
        },
      }),
      prisma.task.deleteMany({
        where: {
          teamId,
        },
      }),
      prisma.team.delete({
        where: {
          id: teamId,
        },
      }),
    ]);
    const teamMemberIds = deletedTeam.members.map((m) => m.memberId);
    this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, teamId);
    deletedTeam.tasks.forEach((task) => {
      this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, task.id);
    });
    callback(ACKNOWLEDGEMENTS.DELETED);
  }
}
