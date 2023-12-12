import {
  CLIENT_TO_SERVER_EVENTS,
  Invite,
  CreateInviteData,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { AcceptInviteSchema, CreateInviteSchema } from "@/modules/invites/validation";
import prisma from "../../services/prisma";

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
    for (const email of invited) {
      try {
        const invite = await prisma.invite.create({
          data: {
            text: `You have been invited to participate in the ${projectId} project.`,
            project: { connect: { id: projectId } },
            member: { connect: { email } },
          },
          include: { member: true },
        });
        this.io
          .to(invite.memberId)
          .emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, { ...invite, memberId: invite.memberId });
      } catch {}
    }
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async accept(inviteId: string, callback: ResponseCallback) {
    await AcceptInviteSchema.validateAsync(inviteId);
    const currentMember = this.socket.data.member!;
    const invite = await prisma.invite.update({
      where: { id: inviteId },
      data: { accepted: true },
    });
    const project = await prisma.project.update({
      where: { id: invite.projectId },
      data: {
        members: {
          create: {
            owner: false,
            member: {
              connect: { id: invite.memberId },
            },
          },
        },
      },
      include: { members: true },
    });
    const projectMemberIds = project.members.map((member) => member.memberId);
    const owner = project.members.find((member) => member.owner)!;
    this.io.to(projectMemberIds).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, {
      id: project.id,
      members: project.members.map((m) => m.memberId),
      name: project.name,
      ownerId: owner.memberId,
    });
    this.io
      .to(currentMember.id)
      .emit(SERVER_TO_CLIENT_EVENTS.INVITES.UPDATE, { ...invite, memberId: currentMember.id });
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Invite[]>) {
    const currentMember = this.socket.data.member!;
    const invites = await prisma.invite.findMany({
      where: {
        memberId: currentMember.id,
      },
    });
    callback(invites.map((i) => ({ ...i, memberId: currentMember.id })));
  }
}
