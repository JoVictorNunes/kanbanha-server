import { createHash } from "node:crypto";
import prisma from "./prisma.service";

class MembersService {
  async create(data: { email: string; name: string; password: string; role: string }) {
    return prisma.$transaction(async (ctx) => {
      const { email, name, password, role } = data;
      const hash = createHash("sha256");
      hash.update(password);
      const hashedPassword = hash.digest("hex");
      const member = ctx.member.create({
        data: {
          email,
          name,
          online: false,
          password: hashedPassword,
          role,
        },
      });
      return member;
    });
  }

  async read() {
    return prisma.$transaction(async (ctx) => {
      const members = ctx.member.findMany({
        select: { password: false, email: true, id: true, name: true, online: true, role: true },
      });
      return members;
    });
  }

  async update(memberId: string, data: { email: string; name: string; role: string }) {
    return prisma.$transaction(async (ctx) => {
      const { email, name, role } = data;

      const updatedMember = ctx.member.update({
        where: { id: memberId },
        data: {
          email,
          name,
          role,
        },
      });
      return updatedMember;
    });
  }

  async delete(memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const member = ctx.member.delete({ where: { id: memberId } });
      return member;
    });
  }

  async getMembersKnownBy(memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const memberTeams = await ctx.membersOnTeam.findMany({
        where: { memberId },
        select: { teamId: true },
      });
      const teamIds = memberTeams.map((t) => t.teamId);
      const teams = await ctx.team.findMany({
        where: { id: { in: teamIds } },
        include: { project: true },
      });
      const members = await ctx.membersOnTeam.findMany({
        where: { teamId: { in: teamIds } },
        select: { memberId: true },
      });
      const memberIds = members.map((m) => m.memberId);
      const ownerIds = teams.map((t) => t.project.ownerId);
      const deduplicatedMemberIds = Array.from(new Set([...memberIds, ...ownerIds]));
      return deduplicatedMemberIds;
    });
  }
}

export default new MembersService();
