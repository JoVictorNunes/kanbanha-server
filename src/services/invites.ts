import { UUID } from "@/io";
import prisma from "./prisma";
import { UnauthorizedException } from "@/exceptions";

class InvitesService {
  async create(projectId: string, email: string, notify = false) {
    return prisma.$transaction(async (ctx) => {
      const invite = ctx.invite.create({
        data: {
          member: { connect: { email } },
          project: { connect: { id: projectId } },
        },
      });
      if (notify) {
        // Send email...
      }
      return invite;
    });
  }

  async readByMember(memberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      return ctx.invite.findMany({ where: { memberId } });
    });
  }

  async accept(inviteId: UUID, memberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      const invite = await ctx.invite.findUniqueOrThrow({ where: { id: inviteId } });
      if (invite.memberId !== memberId) {
        throw new UnauthorizedException();
      }
      const memberOnProject = await ctx.membersOnProject.create({
        data: {
          member: { connect: { id: invite.memberId } },
          project: { connect: { id: invite.projectId } },
          owner: false,
        },
        include: { project: { include: { members: true } } },
      });
      const updatedInvite = await ctx.invite.update({
        where: { id: inviteId },
        data: { accepted: true },
      });
      const owner = memberOnProject.project.members.find((m) => m.owner)!;
      return {
        ...memberOnProject.project,
        ownerId: owner.memberId,
        members: memberOnProject.project.members.map((m) => m.memberId),
      };
    });
  }
}

export const invitesService = new InvitesService();
export default invitesService;
