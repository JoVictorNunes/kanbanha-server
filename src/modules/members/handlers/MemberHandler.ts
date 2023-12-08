import { ACKNOWLEDGEMENTS } from "@/constants";
import withErrorHandler from "@/modules/common/handlers/withErrorHandler";
import withReadErrorHandler from "@/modules/common/handlers/withReadErrorHandler";
import {
  CLIENT_TO_SERVER_EVENTS,
  KanbanhaServer,
  KanbanhaSocket,
  Member,
  MemberCreateData,
  MemberDeleteData,
  MemberUpdateData,
  ReadCallback,
  ResponseCallback,
  SERVER_TO_CLIENT_EVENTS,
} from "@/io";
import { CreateMemberSchema, DeleteMemberSchema, UpdateMemberSchema } from "../validation";
import membersService from "../services/MemberService";

export default class MemberHandler {
  constructor(private io: KanbanhaServer, private socket: KanbanhaSocket) {
    this.create = this.create.bind(this);
    this.delete = this.delete.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
  }

  registerHandlers() {
    // this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.CREATE, withErrorHandler(this.create));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.DELETE, withErrorHandler(this.delete));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.READ, withReadErrorHandler(this.read));
    this.socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.UPDATE, withErrorHandler(this.update));
  }

  async create(data: MemberCreateData, callback: ResponseCallback) {
    await CreateMemberSchema.validateAsync(data);
    await membersService.create(data);
    callback(ACKNOWLEDGEMENTS.CREATED);
  }

  async read(callback: ReadCallback<Member[]>) {
    const members = await membersService.readAll();
    callback(members);
  }

  async update(data: MemberUpdateData, callback: ResponseCallback) {
    await UpdateMemberSchema.validateAsync(data);
    const currentMember = this.socket.data.member!;
    const updatedMember = await membersService.update(currentMember.id, data);
    const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
    this.io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.UPDATE, updatedMember);
    callback(ACKNOWLEDGEMENTS.UPDATED);
  }

  async delete(data: MemberDeleteData, callback: ResponseCallback) {
    await DeleteMemberSchema.validateAsync(data);
    const currentMember = this.socket.data.member!;
    const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
    await membersService.delete(currentMember.id);
    this.io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.DELETE, currentMember.id);
    callback(ACKNOWLEDGEMENTS.DELETED);
    this.socket.disconnect();
  }
}
