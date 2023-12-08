import prisma from "@/modules/database/services/prisma";
import { UUID } from "@/io";
import { UnauthorizedException } from "@/exceptions";

class InviteService {
  async create(projectId: string, email: string) {
    return prisma.$transaction(async (ctx) => {
      const project = await ctx.project.findUniqueOrThrow({ where: { id: projectId } });
      const invite = ctx.invite.create({
        data: {
          member: { connect: { email } },
          project: { connect: { id: projectId } },
          text: `You have been invited to participate in the ${project.name} project.`,
        },
      });
      return invite;
    });
  }

  async readByMember(memberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      return ctx.invite.findMany({ where: { memberId } });
    });
  }

  async accept(inviteId: UUID, currentMemberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      const invite = await ctx.invite.findUniqueOrThrow({ where: { id: inviteId } });
      if (invite.memberId !== currentMemberId) {
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
        updatedProject: {
          ...memberOnProject.project,
          ownerId: owner.memberId,
          members: memberOnProject.project.members.map((m) => m.memberId),
        },
        updatedInvite,
      };
    });
  }
}

export const inviteService = new InviteService();
export default inviteService;
