import prisma from "./prisma";

class ProjectsService {
  async create(data: { name: string; ownerId: string }) {
    return prisma.$transaction(async (ctx) => {
      const { name, ownerId } = data;
      const project = ctx.project.create({
        data: {
          name,
          owner: {
            connect: {
              id: ownerId,
            },
          },
        },
      });
      return project;
    });
  }

  async readByMember(memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const projects = ctx.project.findMany({
        where: {
          OR: [
            {
              ownerId: memberId,
            },
            {
              teams: {
                some: {
                  members: {
                    some: {
                      member: {
                        id: memberId,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      });
      return projects;
    });
  }

  async getMembersInProject(projectId: string) {
    return prisma.$transaction(async (ctx) => {
      const membersInTheProject = await ctx.membersOnTeam.findMany({
        where: { team: { projectId } },
        select: { memberId: true },
      });
      const memberIds = membersInTheProject.map((member) => member.memberId);
      const deduplicatedMeberIds = Array.from(new Set<string>(memberIds));
      return deduplicatedMeberIds;
    });
  }

  async update(projectId: string, name: string) {
    return prisma.$transaction(async (ctx) => {
      const updatedProject = ctx.project.update({
        where: { id: projectId },
        data: { name },
      });
      return updatedProject;
    });
  }

  async delete(projectId: string) {
    return prisma.$transaction(async (ctx) => {
      const assignees = await ctx.assigneesOnTask.deleteMany({
        where: { task: { team: { projectId } } },
      });
      const tasks = await ctx.task.deleteMany({ where: { team: { projectId } } });
      const membersOnTeam = await ctx.membersOnTeam.deleteMany({ where: { team: { projectId } } });
      const teams = await ctx.team.deleteMany({ where: { projectId } });
      const deletedProject = ctx.project.delete({ where: { id: projectId } });
      return deletedProject;
    });
  }

  async isOwnedByMember(projectId: string, memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const project = await ctx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      return project.ownerId === memberId;
    });
  }
}

export const projectsService = new ProjectsService();
export default projectsService;
