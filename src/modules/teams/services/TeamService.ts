import prisma from "@/modules/database/services/prisma";
import projectsService from "@/modules/projects/services/ProjectService";

class TeamService {
  async create(projectId: string, name: string, memberIds: string[]) {
    return prisma.$transaction(async (ctx) => {
      const membersInTheProject = await projectsService.getMembersInProject(projectId);
      const filteredMemberIds = memberIds.filter((memberId) =>
        membersInTheProject.includes(memberId)
      );
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
              ...filteredMemberIds.map((memberId) => ({
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
          members: { some: { member: { id: memberId } } },
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
      });
      const owner = await ctx.membersOnProject.findFirstOrThrow({
        where: { owner: true, projectId: team.projectId },
      });
      return owner.memberId;
    });
  }

  async isOwnedByMember(teamId: string, memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const team = await ctx.team.findUniqueOrThrow({
        where: { id: teamId },
      });
      const owner = await ctx.membersOnProject.findFirstOrThrow({
        where: { owner: true, projectId: team.projectId },
      });

      return owner.memberId === memberId;
    });
  }
}

export const teamService = new TeamService();
export default teamService;
