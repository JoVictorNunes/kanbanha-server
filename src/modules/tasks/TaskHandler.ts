import { ACKNOWLEDGEMENTS } from "@/constants";
import withErrorHandler from "@/modules/common/error/withErrorHandler";
import withReadErrorHandler from "@/modules/common/error/withReadErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
  Task,
  CreateTaskData,
  DeleteTaskData,
  UpdateTaskData,
  MoveTaskData,
} from "@/io";
import { CreateTaskSchema, DeleteTaskSchema, UpdateTaskSchema } from "./validation";
import prisma from "../../services/prisma";

type Nullable<T> = {
  [Key in keyof T]: T[Key] | null;
};

export default class TaskHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.move = this.move.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.UPDATE, withErrorHandler(this.update));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.MOVE, withErrorHandler(this.move));
  }

  async create(data: CreateTaskData, callback: ResponseCallback) {
    await CreateTaskSchema.validateAsync(data);
    const task = await prisma.$transaction(async (ctx) => {
      const { assignees, date, description, dueDate, status, teamId } = data;
      const index = await ctx.task.count({
        where: {
          teamId,
          status,
        },
      });
      const createdAt = new Date();
      let times: Partial<{
        finishedAt: Date;
        inDevelopmentAt: Date;
        inReviewAt: Date;
      }>;
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
      return ctx.task.create({
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
          index,
          ...times,
        },
      });
    });
    const teamMembers = await prisma.member.findMany({
      where: {
        teams: {
          some: {
            teamId: data.teamId,
          },
        },
      },
    });
    const teamMemberIds = teamMembers.map((member) => member.id);
    callback(ACKNOWLEDGEMENTS.CREATED);
    this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.CREATE, {
      ...task,
      assignees: data.assignees,
      status: task.status as "active" | "ongoing" | "review" | "finished",
    });
  }

  async read(callback: ReadCallback<Task[]>) {
    const currentMember = this.socket.data.member!;
    const tasks = await prisma.task.findMany({
      where: {
        team: {
          members: {
            some: {
              member: {
                id: currentMember.id,
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
    const taskData = tasks.map((t) => {
      const { assignees, ...rest } = t;
      return {
        ...rest,
        assignees: assignees.map((a) => a.memberId),
        status: rest.status as "active" | "ongoing" | "review" | "finished",
      };
    });
    callback(taskData);
  }

  async update(data: UpdateTaskData, callback: ResponseCallback) {
    await UpdateTaskSchema.validateAsync(data);
    const { assignees, date, description, dueDate, id } = data;
    const task = await prisma.task.update({
      where: { id },
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
    const taskData = {
      ...task,
      status: task.status as "active" | "ongoing" | "review" | "finished",
      assignees: task.assignees.map((a) => a.memberId),
    };
    const teamMembers = await prisma.member.findMany({
      where: {
        teams: {
          some: {
            team: {
              tasks: {
                some: {
                  id,
                },
              },
            },
          },
        },
      },
    });
    const teamMemberIds = teamMembers.map((member) => member.id);
    this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.UPDATE, taskData);
    callback(ACKNOWLEDGEMENTS.DELETED);
  }

  async delete(taskId: DeleteTaskData, callback: ResponseCallback) {
    await DeleteTaskSchema.validateAsync(taskId);
    await prisma.$transaction([
      prisma.assigneesOnTask.deleteMany({ where: { taskId } }),
      prisma.task.delete({ where: { id: taskId } }),
    ]);
    const teamMembers = await prisma.member.findMany({
      where: {
        teams: {
          some: {
            team: {
              tasks: {
                some: {
                  id: taskId,
                },
              },
            },
          },
        },
      },
    });
    const teamMemberIds = teamMembers.map((member) => member.id);
    callback(ACKNOWLEDGEMENTS.CREATED);
    this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, taskId);
  }

  async move(data: MoveTaskData, callback: ResponseCallback) {
    const { index, status, taskId } = data;
    const tasks = await prisma.$transaction(async (ctx) => {
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
    const teamMembers = await prisma.member.findMany({
      where: {
        teams: {
          some: {
            team: {
              tasks: {
                some: {
                  id: taskId,
                },
              },
            },
          },
        },
      },
    });
    const teamMemberIds = teamMembers.map((member) => member.id);
    tasks.forEach((task) => {
      this.io.to(teamMemberIds).emit(SERVER_TO_CLIENT_EVENTS.TASKS.UPDATE, task);
    });
    callback(ACKNOWLEDGEMENTS.CREATED);
  }
}
