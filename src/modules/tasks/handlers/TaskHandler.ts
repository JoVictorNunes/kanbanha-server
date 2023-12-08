import { ACKNOWLEDGEMENTS } from "@/constants";
import withErrorHandler from "@/modules/common/handlers/withErrorHandler";
import withReadErrorHandler from "@/modules/common/handlers/withReadErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
  Task,
  TasksCreateData,
  TasksDeleteData,
  TasksUpdateData,
} from "@/io";
import { CreateTaskSchema, DeleteTaskSchema, UpdateTaskSchema } from "../validation";
import teamsService from "@/modules/teams/services/TeamService";
import tasksService from "../services/TaskService";

export default class TaskHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: TasksCreateData, callback: ResponseCallback) {
    await CreateTaskSchema.validateAsync(data);
    const task = await tasksService.create(data);
    const membersInTheTeam = await teamsService.getMembersInTeam(data.teamId);
    const teamOwner = await teamsService.getTeamOwner(data.teamId);
    const membersToNotify = [...membersInTheTeam, teamOwner];
    callback(ACKNOWLEDGEMENTS.CREATED);
    this.io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.CREATE, {
      ...task,
      assignees: data.assignees,
      status: task.status as "active" | "ongoing" | "review" | "finished",
    });
  }

  async read(callback: ReadCallback<Task[]>) {
    const currentMember = this.socket.data.member!;
    const tasks = await tasksService.readByMember(currentMember.id);
    callback(tasks);
  }

  async update(data: TasksUpdateData, callback: ResponseCallback) {
    await UpdateTaskSchema.validateAsync(data);
    const task = await tasksService.update(data.id, data);
    const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
    const teamOwner = await teamsService.getTeamOwner(task.teamId);
    const membersToNotify = [...membersInTheTeam, teamOwner];
    this.io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.UPDATE, task);
    callback(ACKNOWLEDGEMENTS.DELETED);
  }

  async delete(taskId: TasksDeleteData, callback: ResponseCallback) {
    await DeleteTaskSchema.validateAsync(taskId);
    const task = await tasksService.delete(taskId);
    const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
    const teamOwner = await teamsService.getTeamOwner(task.teamId);
    const membersToNotify = [...membersInTheTeam, teamOwner];
    callback(ACKNOWLEDGEMENTS.CREATED);
    this.io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, taskId);
  }
}
