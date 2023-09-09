import { createHash } from "node:crypto";
import prisma from "./prisma";
import { UUID } from "@/io";

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

  async readAll() {
    return prisma.$transaction(async (ctx) => {
      const members = ctx.member.findMany({
        select: { password: false, email: true, id: true, name: true, online: true, role: true },
      });
      return members;
    });
  }

  async findByEmail(email: string) {
    return prisma.$transaction(async (ctx) => {
      const member = await ctx.member.findUnique({
        where: {
          email,
        },
      });
      return member;
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
      const memberProjects = await ctx.membersOnProject.findMany({
        where: { memberId },
        select: { projectId: true },
      });
      const projectIds = memberProjects.map((t) => t.projectId);
      const members = await ctx.membersOnProject.findMany({
        where: { projectId: { in: projectIds } },
      });
      const memberIds = members.map((m) => m.memberId);
      const deduplicatedMemberIds = Array.from(new Set(memberIds));
      return deduplicatedMemberIds;
    });
  }
}

export const membersService = new MembersService();
export default membersService;
