import prisma from "@/services/prisma";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import logger from "@/services/logger";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  Project,
  CreateProjectData,
  DeleteProjectData,
  UpdateProjectData,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { UnauthorizedException } from "@/exceptions";
import { CreateProjectSchema, DeleteProjectSchema, UpdateProjectSchema } from "./validation";

class ProjectHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: CreateProjectData, callback: ResponseCallback) {
    await CreateProjectSchema.validateAsync(data);
    const { name, invited } = data;
    const currentMember = this.socket.data.member!;
    const ownerId = currentMember.id;
    const project = await prisma.project.create({
      data: {
        name,
        members: {
          create: [
            {
              owner: true,
              member: {
                connect: {
                  id: ownerId,
                },
              },
            },
          ],
        },
      },
    });
    const projectData = {
      ...project,
      ownerId,
      members: [ownerId],
    };
    this.io.to(ownerId).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.CREATE, projectData);
    callback(ACKNOWLEDGEMENTS.CREATED);

    if (invited) {
      for (const email of invited) {
        try {
          const invite = await prisma.invite.create({
            data: {
              member: {
                connect: {
                  email,
                },
              },
              project: {
                connect: {
                  id: project.id,
                },
              },
              text: `You have been invited to participate in the ${project.name} project.`,
            },
          });
          this.io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
        } catch (e) {
          logger.debug(`Failed to invite ${email} to ${project.name} project.`, { reason: e });
        }
      }
    }
  }

  async delete(data: DeleteProjectData, callback: ResponseCallback) {
    await DeleteProjectSchema.validateAsync(data);
    const { id: projectId } = data;
    const currentMember = this.socket.data.member!;
    const deletedProject = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
      include: {
        teams: {
          include: {
            tasks: true,
            members: true,
          },
        },
        invites: true,
        members: true,
      },
    });
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMember.id,
          projectId: projectId,
        },
      },
    });
    const hasPermission = membership && membership.owner;
    if (!hasPermission) {
      throw new UnauthorizedException("You do not have permission to delete this project.");
    }
    await prisma.$transaction([
      prisma.assignee.deleteMany({
        where: {
          task: {
            team: {
              projectId,
            },
          },
        },
      }),
      prisma.teamMembership.deleteMany({
        where: {
          team: {
            projectId,
          },
        },
      }),
      prisma.projectMembership.deleteMany({
        where: {
          projectId,
        },
      }),
      prisma.invite.updateMany({
        where: {
          projectId,
        },
        data: {
          projectId: null,
        },
      }),
      prisma.task.deleteMany({
        where: {
          team: {
            projectId,
          },
        },
      }),
      prisma.team.deleteMany({
        where: {
          projectId,
        },
      }),
      prisma.project.delete({
        where: {
          id: projectId,
        },
      }),
    ]);
    deletedProject.teams.forEach((team) => {
      const teamMemberIds = team.members.map((m) => m.memberId);
      this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, team.id);
      team.tasks.forEach((task) => {
        this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, task.id);
      });
    });
    const projectMemberIds = deletedProject.members.map((m) => m.memberId);
    this.io.to(projectMemberIds).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.DELETE, projectId);
    callback(ACKNOWLEDGEMENTS.DELETED);
  }

  async read(callback: ReadCallback<Project[]>) {
    const currentMember = this.socket.data.member!;
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            memberId: currentMember.id,
          },
        },
      },
      include: { members: true },
    });
    const projectsData = projects.map((project) => {
      const owner = project.members.find((member) => member.owner)!;
      return {
        ...project,
        ownerId: owner.memberId,
        members: project.members.map((m) => m.memberId),
      };
    });
    callback(projectsData);
  }

  async update(data: UpdateProjectData, callback: ResponseCallback) {
    await UpdateProjectSchema.validateAsync(data);
    const { id: projectId, name } = data;
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
      throw new UnauthorizedException("You do not have permission to update this project.");
    }
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
    const projectMembers = await prisma.member.findMany({
      where: { projects: { some: { projectId } } },
    });
    const projectData = {
      ...updatedProject,
      ownerId: currentMember.id,
      members: projectMembers.map((m) => m.id),
    };
    const projectMemberIds = projectMembers.map((m) => m.id);
    this.io.to(projectMemberIds).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, projectData);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }
}

export default ProjectHandler;
