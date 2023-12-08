import {
  CLIENT_TO_SERVER_EVENTS,
  Invite,
  InviteCreateData,
  KanbanhaServer,
  KanbanhaSocket,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import withErrorHandler from "@/modules/common/handlers/withErrorHandler";
import withReadErrorHandler from "@/modules/common/handlers/withReadErrorHandler";
import invitesService from "@/modules/invites/services/InviteService";
import projectsService from "@/modules/projects/services/ProjectService";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { AcceptInviteSchema, CreateInviteSchema } from "@/modules/invites/validation";

export default class InviteHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.accept = this.accept.bind(this);
    this.read = this.read.bind(this);
  }

  registerHandlers() {
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.ACCEPT, withErrorHandler(this.accept));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.READ, withReadErrorHandler(this.read));
  }

  async create(data: InviteCreateData, callback: ResponseCallback) {
    await CreateInviteSchema.validateAsync(data);
    const { invited, projectId } = data;
    const currentMember = this.socket.data.member!;
    const deduplicatedInvited = new Set(invited);
    deduplicatedInvited.delete(currentMember.email);
    for (const email of deduplicatedInvited) {
      try {
        const invite = await invitesService.create(projectId, email);
        this.io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
      } catch {}
    }
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async accept(inviteId: string, callback: ResponseCallback) {
    await AcceptInviteSchema.validateAsync(inviteId);
    const currentMember = this.socket.data.member!;
    const { updatedProject, updatedInvite } = await invitesService.accept(
      inviteId,
      currentMember.id
    );
    const membersInTheProject = await projectsService.getMembersInProject(updatedProject.id);
    this.io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, updatedProject);
    this.io.to(updatedInvite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.UPDATE, updatedInvite);
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Invite[]>) {
    const currentMember = this.socket.data.member!;
    const members = await invitesService.readByMember(currentMember.id);
    callback(members);
  }
}
