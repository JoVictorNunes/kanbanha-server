import withErrorHandler from "@/modules/common/handlers/withErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
  Team,
  TeamsCreateData,
  TeamsDeleteData,
  TeamsUpdateData,
} from "@/io";
import { CreateTeamSchema, DeleteTeamSchema, UpdateTeamSchema } from "../validation";
import { UnauthorizedException } from "@/exceptions";
import { ACKNOWLEDGEMENTS } from "@/constants";
import teamsService from "../services/TeamService";
import projectsService from "@/modules/projects/services/ProjectService";
import withReadErrorHandler from "@/modules/common/handlers/withReadErrorHandler";

export default class TeamHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: TeamsCreateData, callback: ResponseCallback) {
    await CreateTeamSchema.validateAsync(data);
    const { projectId, members, name } = data;
    const currentMember = this.socket.data.member!;
    if (!projectsService.isOwnedByMember(projectId, currentMember.id)) {
      throw new UnauthorizedException(
        "You do not have permission to create a team for this project."
      );
    }
    const deduplicatedMeberIds = Array.from(new Set([...members, currentMember.id]));
    const team = await teamsService.create(projectId, name, deduplicatedMeberIds);
    const createdTeam = {
      id: team.id,
      name: team.name,
      projectId: team.projectId,
      members,
    };

    this.io.to(deduplicatedMeberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.CREATE, createdTeam);
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Team[]>) {
    const currentMember = this.socket.data.member!;
    const teams = await teamsService.readByMember(currentMember.id);
    const response = teams.map((t) => ({
      id: t.id,
      name: t.name,
      projectId: t.projectId,
      members: t.members.map((m) => m.memberId),
    }));
    callback(response);
  }

  async update(data: TeamsUpdateData, callback: ResponseCallback) {
    await UpdateTeamSchema.validateAsync(data);
    const { name, teamId } = data;
    const currentMember = this.socket.data.member!;
    const isOwnedByMember = await teamsService.isOwnedByMember(teamId, currentMember.id);
    if (!isOwnedByMember) {
      throw new UnauthorizedException();
    }
    const team = await teamsService.update(teamId, name);
    const membersInTheTeam = team.members.map((member) => member.memberId);
    const membersToNotify = [...membersInTheTeam];
    const msg = {
      id: team.id,
      members: membersInTheTeam,
      name: team.name,
      projectId: team.projectId,
    };
    this.io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.UPDATE, msg);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }

  async delete(teamId: TeamsDeleteData, callback: ResponseCallback) {
    await DeleteTeamSchema.validateAsync(teamId);
    const membersInTheTeam = await teamsService.getMembersInTeam(teamId);
    const deletedTeam = await teamsService.delete(teamId);
    const membersToNotify = [...membersInTheTeam];
    this.io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, teamId);
    callback(ACKNOWLEDGEMENTS.DELETED);
  }
}
