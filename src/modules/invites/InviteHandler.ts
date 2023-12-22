import {
  Invite,
  CreateInviteData,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  AccepteInviteData,
} from "@/io";
import logger from "@/services/logger";
import prisma from "@/services/prisma";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import { ACKNOWLEDGEMENTS, CLIENT_TO_SERVER_EVENTS, SERVER_TO_CLIENT_EVENTS } from "@/constants";
import { NotFoundException, UnauthorizedException } from "@/exceptions";

export default class InviteHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.accept = this.accept.bind(this);
    this.read = this.read.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.ACCEPT, withErrorHandler(this.accept));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.READ, withReadErrorHandler(this.read));
  }

  async createInvite(email: string, projectId: string, text: string) {
    return prisma.invite.create({
      data: {
        member: {
          connect: {
            email,
          },
        },
        project: {
          connect: {
            id: projectId,
          },
        },
        text,
      },
    });
  }

  async create(data: CreateInviteData, callback: ResponseCallback) {
    const { invited, projectId } = data;
    const currentMember = this.socket.data.member!;
    const currentMemberId = currentMember.id;
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMemberId,
          projectId,
        },
      },
    });
    const hasPermission = membership && membership.owner;
    if (!hasPermission) {
      throw new UnauthorizedException("You do not have permission for this action.");
    }
    const invitePromises = invited.map((email) => {
      return this.createInvite(
        email,
        project.id,
        `You have been invited to participate in the ${project.name} project.`
      );
    });
    const inviteResults = await Promise.allSettled(invitePromises);
    inviteResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const invite = result.value;

        // We also send the invite to the project's owner so that he can track who is invited.
        this.io
          .to([invite.memberId, currentMemberId])
          .emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
      } else {
        const { reason } = result;
        logger.debug(`Failed to create invite. projectId=${project.id}.`, { reason });
      }
    });
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async accept(data: AccepteInviteData, callback: ResponseCallback) {
    const { id: inviteId } = data;
    const currentMember = this.socket.data.member!;
    const currentMemberId = currentMember.id;
    const invite = await prisma.invite.findFirstOrThrow({
      where: {
        id: inviteId,
        memberId: currentMemberId,
      },
      include: {
        project: true,
      },
    });
    if (invite.accepted) {
      callback(ACKNOWLEDGEMENTS.UPDATED);
      return;
    }
    if (!invite.project) {
      throw new NotFoundException("This project does not exist.");
    }
    const updatedInvite = await prisma.invite.update({
      where: {
        id: inviteId,
      },
      data: {
        accepted: true,
      },
    });
    const project = await prisma.project.update({
      where: {
        id: invite.project.id,
      },
      data: {
        members: {
          create: {
            owner: false,
            member: {
              connect: {
                id: invite.memberId,
              },
            },
          },
        },
      },
      include: {
        members: true,
      },
    });
    const projectMemberIds = project.members.map((member) => member.memberId);
    const ownership = project.members.find((member) => member.owner)!;
    this.io.to(projectMemberIds).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, {
      id: project.id,
      members: project.members.map((m) => m.memberId),
      name: project.name,
      ownerId: ownership.memberId,
    });
    this.io.to([currentMemberId, ownership.memberId]).emit(SERVER_TO_CLIENT_EVENTS.INVITES.UPDATE, {
      ...updatedInvite,
      memberId: currentMemberId,
    });
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Invite[]>) {
    const currentMember = this.socket.data.member!;
    const invites = await prisma.invite.findMany({
      where: {
        OR: [
          {
            memberId: currentMember.id,
          },
          {
            project: {
              members: {
                some: {
                  memberId: currentMember.id,
                  owner: true,
                },
              },
            },
          },
        ],
      },
    });
    callback(invites);
  }
}
