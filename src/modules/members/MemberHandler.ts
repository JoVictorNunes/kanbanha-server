import { ACKNOWLEDGEMENTS } from "@/constants";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  Member,
  UpdateMemberData,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import { UpdateMemberSchema } from "./validation";
import prisma from "@/services/prisma";

export default class MemberHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.UPDATE, withErrorHandler(this.update));
  }

  async read(callback: ReadCallback<Member[]>) {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        online: true,
        role: true,
      },
    });
    callback(members);
  }

  async update(data: UpdateMemberData, callback: ResponseCallback) {
    await UpdateMemberSchema.validateAsync(data);
    const currentMember = this.socket.data.member!;
    const updatedMember = await prisma.member.update({
      where: {
        id: currentMember.id,
      },
      data: {
        name: data.name,
        role: data.role,
      },
    });
    const memberProjects = await prisma.projectMembership.findMany({
      where: {
        memberId: currentMember.id,
      },
      select: {
        projectId: true,
      },
    });
    const projectIds = memberProjects.map((t) => t.projectId);
    const members = await prisma.projectMembership.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
        memberId: {
          not: currentMember.id,
        },
      },
      include: { member: true },
    });
    const memberIds = members.map(({ member }) => member.id);
    this.io.to(memberIds).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.UPDATE, updatedMember);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }
}
