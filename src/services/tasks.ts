import prisma from "./prisma";

type Nullable<T> = {
  [Key in keyof T]: T[Key] | null;
};

class TasksService {
  async create(data: {
    date: number;
    description: string;
    dueDate: number;
    assignees: string[];
    teamId: string;
    status: "active" | "ongoing" | "review" | "finished";
  }) {
    return prisma.$transaction(async (ctx) => {
      const { assignees, date, description, dueDate, status, teamId } = data;
      const createdAt = new Date();
      let times: Partial<{ finishedAt: Date; inDevelopmentAt: Date; inReviewAt: Date }>;
      switch (status) {
        case "ongoing": {
          times = {
            inDevelopmentAt: new Date(),
          };
          break;
        }
        case "review": {
          times = {
            inDevelopmentAt: new Date(),
            inReviewAt: new Date(),
          };
          break;
        }
        case "finished": {
          times = {
            inDevelopmentAt: new Date(),
            inReviewAt: new Date(),
            finishedAt: new Date(),
          };
          break;
        }
        case "active":
        default: {
          times = {};
        }
      }
      const task = ctx.task.create({
        data: {
          assignees: {
            create: [
              ...assignees.map((assignee) => ({
                member: {
                  connect: {
                    id: assignee,
                  },
                },
              })),
            ],
          },
          createdAt,
          date: new Date(date),
          description,
          dueDate: new Date(dueDate),
          status,
          team: {
            connect: {
              id: teamId,
            },
          },
          index: await ctx.task.count({ where: { teamId, status } }),
          ...times,
        },
      });
      return task;
    });
  }

  async readByMember(memberId: string) {
    return prisma.$transaction(async (ctx) => {
      const tasks = await ctx.task.findMany({
        where: {
          team: {
            members: {
              some: {
                member: {
                  id: memberId,
                },
              },
            },
          },
        },
        include: {
          assignees: {
            select: {
              memberId: true,
            },
          },
        },
      });
      const tasksMapped = tasks.map((t) => {
        const { assignees, ...rest } = t;
        return {
          ...rest,
          assignees: assignees.map((a) => a.memberId),
          status: rest.status as "active" | "ongoing" | "review" | "finished",
        };
      });
      return tasksMapped;
    });
  }

  async update(
    taskId: string,
    data: { date: number; description: string; dueDate: number; assignees: string[] }
  ) {
    return prisma.$transaction(async (ctx) => {
      const { assignees, date, description, dueDate } = data;
      const task = await ctx.task.update({
        where: { id: taskId },
        data: {
          date: new Date(date),
          description,
          dueDate: new Date(dueDate),
          assignees: {
            create: [
              ...assignees.map((assignee) => ({
                member: {
                  connect: {
                    id: assignee,
                  },
                },
              })),
            ],
          },
        },
        include: {
          assignees: {
            select: {
              memberId: true,
            },
          },
        },
      });
      const mappedTask = {
        ...task,
        status: task.status as "active" | "ongoing" | "review" | "finished",
        assignees: task.assignees.map((a) => a.memberId),
      };
      return mappedTask;
    });
  }

  async delete(taskId: string) {
    return prisma.$transaction(async (ctx) => {
      const assignees = await ctx.assigneesOnTask.deleteMany({ where: { taskId } });
      const task = ctx.task.delete({ where: { id: taskId } });
      return task;
    });
  }

  async move(taskId: string, status: string, index: number) {
    return prisma.$transaction(async (ctx) => {
      const task = await ctx.task.findUniqueOrThrow({ where: { id: taskId } });
      if (task.status === status) {
        if (task.index === index) return [];
        let minBound: number, maxBound: number, operation: "increment" | "decrement";
        if (index > task.index) {
          minBound = task.index;
          maxBound = index + 1;
          operation = "decrement";
        } else {
          minBound = index - 1;
          maxBound = task.index;
          operation = "increment";
        }
        await ctx.task.updateMany({
          where: { teamId: task.teamId, status, index: { gt: minBound, lt: maxBound } },
          data: { index: { [operation]: 1 } },
        });
        const updatedTask = await ctx.task.update({
          where: { id: taskId },
          data: { index },
          include: { assignees: { select: { memberId: true } } },
        });
        const allTasks = await ctx.task.findMany({
          where: { teamId: task.teamId, status },
          include: { assignees: { select: { memberId: true } } },
        });
        return allTasks.map((t) => ({
          ...t,
          status: t.status as "active" | "ongoing" | "review" | "finished",
          assignees: t.assignees.map((a) => a.memberId),
        }));
      }

      const changes: Partial<
        Nullable<{
          inDevelopmentAt: Date;
          inReviewAt: Date;
          finishedAt: Date;
        }>
      > = {};

      switch (status) {
        case "active": {
          changes.inDevelopmentAt = null;
          changes.inReviewAt = null;
          changes.finishedAt = null;
          break;
        }
        case "ongoing": {
          if (task.status === "active") {
            changes.inDevelopmentAt = new Date();
          }

          if (task.status === "review") {
            changes.inReviewAt = null;
          }

          if (task.status === "finished") {
            changes.inReviewAt = null;
            changes.finishedAt = null;
          }

          break;
        }
        case "review": {
          if (task.status === "active") {
            changes.inDevelopmentAt = new Date();
            changes.inReviewAt = new Date();
          }

          if (task.status === "ongoing") {
            changes.inReviewAt = new Date();
          }

          if (task.status === "finished") {
            changes.finishedAt = null;
          }

          break;
        }
        case "finished": {
          if (task.status === "active") {
            changes.inDevelopmentAt = new Date();
            changes.inReviewAt = new Date();
            changes.finishedAt = new Date();
          }

          if (task.status === "ongoing") {
            changes.inReviewAt = new Date();
            changes.finishedAt = new Date();
          }

          if (task.status === "review") {
            changes.finishedAt = new Date();
          }

          break;
        }
      }

      await ctx.task.updateMany({
        where: { teamId: task.teamId, status: task.status, index: { gt: task.index } },
        data: { index: { decrement: 1 } },
      });
      const updatedTasksOfTheLastStatus = await ctx.task.findMany({
        where: { teamId: task.teamId, status: task.status, index: { gt: task.index } },
        include: { assignees: { select: { memberId: true } } },
      });
      await ctx.task.updateMany({
        where: { teamId: task.teamId, status, index: { gte: index } },
        data: { index: { increment: 1 } },
      });
      const updatedTasksOfTheNewStatus = await ctx.task.findMany({
        where: { teamId: task.teamId, status, index: { gte: index } },
        include: { assignees: { select: { memberId: true } } },
      });
      const updatedTask = await ctx.task.update({
        where: { id: taskId },
        data: { ...changes, status, index },
        include: { assignees: { select: { memberId: true } } },
      });
      return [updatedTask, ...updatedTasksOfTheLastStatus, ...updatedTasksOfTheNewStatus].map(
        (t) => ({
          ...t,
          status: t.status as "active" | "ongoing" | "review" | "finished",
          assignees: t.assignees.map((a) => a.memberId),
        })
      );
    });
  }
}

export const tasksService = new TasksService();
export default tasksService;
