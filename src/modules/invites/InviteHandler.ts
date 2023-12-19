import {
  CLIENT_TO_SERVER_EVENTS,
  Invite,
  CreateInviteData,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
  AccepteInviteData,
} from "@/io";
import logger from "@/services/logger";
import prisma from "@/services/prisma";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { AcceptInviteSchema, CreateInviteSchema } from "@/modules/invites/validation";
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

  async create(data: CreateInviteData, callback: ResponseCallback) {
    await CreateInviteSchema.validateAsync(data);
    const { invited, projectId } = data;
    const currentMember = this.socket.data.member!;
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });
    const membership = await prisma.projectMembership.findUnique({
      where: {
        memberId_projectId: {
          memberId: currentMember.id,
          projectId,
        },
      },
    });
    const hasPermission = membership && membership.owner;
    if (!hasPermission) {
      throw new UnauthorizedException("You do not have permission for this action.");
    }
    for (const email of invited) {
      try {
        const invite = await prisma.invite.create({
          data: {
            text: `You have been invited to participate in the ${project.name} project.`,
            project: {
              connect: {
                id: projectId,
              },
            },
            member: {
              connect: {
                email,
              },
            },
          },
        });
        this.io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
      } catch {
        logger.debug(`Failed to invite ${email} to ${project.name} project.`);
      }
    }
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async accept(data: AccepteInviteData, callback: ResponseCallback) {
    await AcceptInviteSchema.validateAsync(data);
    const { id: inviteId } = data;
    const currentMember = this.socket.data.member!;
    const invite = await prisma.invite.findFirstOrThrow({
      where: {
        id: inviteId,
        memberId: currentMember.id,
      },
      include: {
        project: true,
      },
    });
    if (invite.accepted) {
      callback(ACKNOWLEDGEMENTS.CREATED);
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
    const owner = project.members.find((member) => member.owner)!;
    this.io.to(projectMemberIds).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, {
      id: project.id,
      members: project.members.map((m) => m.memberId),
      name: project.name,
      ownerId: owner.memberId,
    });
    this.io.to(currentMember.id).emit(SERVER_TO_CLIENT_EVENTS.INVITES.UPDATE, {
      ...updatedInvite,
      memberId: currentMember.id,
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
