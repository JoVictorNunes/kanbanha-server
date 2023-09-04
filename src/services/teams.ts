import prisma from "./prisma";

class TeamsService {
  async create(projectId: string, name: string, memberIds: string[]) {
    return prisma.$transaction(async (ctx) => {
      const team = ctx.team.create({
        data: {
          name,
          project: {
            connect: {
              id: projectId,
            },
          },
          members: {
            create: [
              ...memberIds.map((memberId) => ({
                member: { connect: { id: memberId } },
              })),
            ],
          },
        },
      });
      return team;
    });
  }

  async readByMember(memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const teams = ctx.team.findMany({
        where: {
          OR: [
            { project: { ownerId: memberId } },
            { members: { some: { member: { id: memberId } } } },
          ],
        },
        include: { members: { select: { memberId: true } } },
      });
      return teams;
    });
  }

  async update(teamId: string, name: string) {
    return prisma.$transaction(async (ctx) => {
      const team = ctx.team.update({
        where: { id: teamId },
        data: { name },
        include: { members: { select: { memberId: true } }, project: true },
      });
      return team;
    });
  }

  async delete(teamId: string) {
    return prisma.$transaction(async (ctx) => {
      const assignees = await ctx.assigneesOnTask.deleteMany({
        where: { task: { teamId } },
      });
      const tasks = await ctx.task.deleteMany({ where: { teamId } });
      const membersOnTeam = await ctx.membersOnTeam.deleteMany({ where: { teamId } });
      const deletedTeam = ctx.team.delete({ where: { id: teamId }, include: { project: true } });
      return deletedTeam;
    });
  }

  async getMembersInTeam(teamId: string) {
    return prisma.$transaction(async (ctx) => {
      const members = await ctx.membersOnTeam.findMany({
        where: { teamId },
        select: { memberId: true },
      });
      const memberIds = members.map((member) => member.memberId);
      return memberIds;
    });
  }

  async getTeamOwner(teamId: string) {
    return prisma.$transaction(async (ctx) => {
      const team = await ctx.team.findUniqueOrThrow({
        where: { id: teamId },
        include: { project: true },
      });
      return team.project.ownerId;
    });
  }

  async isOwnedByMember(teamId: string, memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const team = await ctx.team.findUniqueOrThrow({
        where: { id: teamId },
        include: { project: true },
      });

      return team.project.ownerId === memberId;
    });
  }
}

export const teamsService = new TeamsService();
export default teamsService;
