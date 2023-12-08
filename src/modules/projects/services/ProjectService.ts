import { UUID } from "@/io";
import prisma from "@/modules/database/services/prisma";

class ProjectService {
  async create(data: { name: string; ownerId: UUID }) {
    return prisma.$transaction(async (ctx) => {
      const { name, ownerId } = data;
      const project = ctx.project.create({
        data: {
          name,
          members: { create: [{ owner: true, member: { connect: { id: ownerId } } }] },
        },
      });
      return project;
    });
  }

  async readByMember(memberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      const projects = ctx.project.findMany({
        where: { members: { some: { member: { id: memberId } } } },
        include: { members: true },
      });
      return projects;
    });
  }

  async getMembersInProject(projectId: UUID) {
    return prisma.$transaction(async (ctx) => {
      const membersInTheProject = await ctx.membersOnProject.findMany({
        where: { projectId },
        select: { memberId: true },
      });
      const memberIds = membersInTheProject.map((member) => member.memberId);
      return memberIds;
    });
  }

  async update(projectId: string, name: string) {
    return prisma.$transaction(async (ctx) => {
      const project = ctx.project.update({
        where: { id: projectId },
        data: { name },
        include: { members: true },
      });
      return project;
    });
  }

  async delete(projectId: string) {
    return prisma.$transaction(async (ctx) => {
      const assigneesOnTaskFilter = { task: { team: { project: { id: projectId } } } };
      const deletedAssigneesOnTasks = await ctx.assigneesOnTask.findMany({
        where: assigneesOnTaskFilter,
      });
      await ctx.assigneesOnTask.deleteMany({ where: assigneesOnTaskFilter });

      const taskFilter = { team: { project: { id: projectId } } };
      const deletedTasks = await ctx.task.findMany({ where: taskFilter });
      await ctx.task.deleteMany({ where: taskFilter });

      const membersOnTeamFilter = { team: { project: { id: projectId } } };
      const deletedMembersOnTeam = await ctx.membersOnTeam.findMany({
        where: membersOnTeamFilter,
      });
      await ctx.membersOnTeam.deleteMany({ where: membersOnTeamFilter });

      const teamFilter = { project: { id: projectId } };
      const deletedTeams = await ctx.team.findMany({ where: teamFilter });
      await ctx.team.deleteMany({ where: teamFilter });

      const membersOnProjectFilter = { project: { id: projectId } };
      const deletedMembersOnProject = await ctx.membersOnProject.findMany({
        where: membersOnProjectFilter,
      });
      await ctx.membersOnProject.deleteMany({ where: membersOnProjectFilter });

      const deletedProject = await ctx.project.delete({ where: { id: projectId } });

      return {
        deletedProject,
        deletedAssigneesOnTasks,
        deletedTasks,
        deletedMembersOnTeam,
        deletedTeams,
        deletedMembersOnProject,
      };
    });
  }

  async isOwnedByMember(projectId: UUID, memberId: UUID) {
    return prisma.$transaction(async (ctx) => {
      const memberOnProject = await ctx.membersOnProject.findFirstOrThrow({
        where: { projectId, owner: true },
      });
      return memberOnProject.memberId === memberId;
    });
  }
}

export const projectService = new ProjectService();
export default projectService;
