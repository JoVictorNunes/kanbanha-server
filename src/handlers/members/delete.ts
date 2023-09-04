import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { membersService } from "@/services";

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.DELETE, async (callback) => {
    try {
      const currentMember = socket.data.member!;
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      await membersService.delete(currentMember.id);
      io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.DELETE, currentMember.id);
      callback(ACKNOWLEDGEMENTS.DELETED);
      socket.disconnect();
    } catch (e) {
      if (e instanceof BaseException) {
        callback(e);
        return;
      }
      if (e instanceof Joi.ValidationError) {
        callback(new BadRequestException(e.message));
        return;
      }
      callback(new InternalServerException());
    }
  });
}
