import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  Project,
  ProjectsCreateData,
  ProjectsDeleteData,
  ProjectsUpdateData,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import { CreateProjectSchema, DeleteProjectSchema, UpdateProjectSchema } from "../validation";
import projectsService from "../services/ProjectService";
import { ACKNOWLEDGEMENTS } from "@/constants";
import inviteService from "@/modules/invites/services/InviteService";
import { UnauthorizedException } from "@/exceptions";
import withErrorHandler from "@/modules/common/handlers/withErrorHandler";
import withReadErrorHandler from "@/modules/common/handlers/withReadErrorHandler";
import logger from "@/modules/common/logger";

class ProjectHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: ProjectsCreateData, callback: ResponseCallback) {
    await CreateProjectSchema.validateAsync(data);
    const { name, invited } = data;
    const currentMember = this.socket.data.member!;
    const ownerId = currentMember.id;
    const createdProject = await projectsService.create({ name, ownerId });
    const project = { ...createdProject, ownerId, members: [ownerId] };
    this.io.to(ownerId).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.CREATE, project);
    callback(ACKNOWLEDGEMENTS.CREATED);

    if (invited) {
      const deduplicatedInvited = new Set(invited);
      deduplicatedInvited.delete(currentMember.email);
      for (const email of deduplicatedInvited) {
        try {
          const invite = await inviteService.create(project.id, email);
          this.io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
        } catch (e) {
          logger.debug(`Failed to invite ${email}`, { reason: e });
        }
      }
    }
  }

  async delete(projectId: ProjectsDeleteData, callback: ResponseCallback) {
    await DeleteProjectSchema.validateAsync(projectId);
    const currentMember = this.socket.data.member!;
    if (!projectsService.isOwnedByMember(projectId, currentMember.id)) {
      throw new UnauthorizedException("You do not have permission for deleting this project.");
    }
    const membersInTheProject = await projectsService.getMembersInProject(projectId);
    const { deletedTasks, deletedTeams } = await projectsService.delete(projectId);
    deletedTasks.forEach((task) => {
      this.io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, task.id);
    });
    deletedTeams.forEach((team) => {
      this.io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, team.id);
    });
    this.io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.DELETE, projectId);
    callback(ACKNOWLEDGEMENTS.DELETED);
  }

  async read(callback: ReadCallback<Project[]>) {
    const currentMember = this.socket.data.member!;
    const projects = await projectsService.readByMember(currentMember.id);
    const projectsMapped = projects.map((project) => {
      const owner = project.members.find((member) => member.owner)!;
      return {
        ...project,
        ownerId: owner.memberId,
        members: project.members.map((m) => m.memberId),
      };
    });
    callback(projectsMapped);
  }

  async update(data: ProjectsUpdateData, callback: ResponseCallback) {
    await UpdateProjectSchema.validateAsync(data);
    const { id, name } = data;
    const currentMember = this.socket.data.member!;
    if (!projectsService.isOwnedByMember(id, currentMember.id)) {
      throw new UnauthorizedException("You do not have permission for updating this project.");
    }
    const updatedProject = await projectsService.update(id, name);
    const owner = updatedProject.members.find((m) => m.owner)!;
    const projectMapped = {
      ...updatedProject,
      ownerId: owner.memberId,
      members: updatedProject.members.map((m) => m.memberId),
    };
    const membersInTheProject = await projectsService.getMembersInProject(id);
    this.io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, projectMapped);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }
}

export default ProjectHandler;
