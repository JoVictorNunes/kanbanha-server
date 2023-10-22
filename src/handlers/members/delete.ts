import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { membersService } from "@/services";
import withErrrorHandler from "@/handlers//withErrorHandler";

const scheme = Joi.object().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.MEMBERS.DELETE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const currentMember = socket.data.member!;
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      await membersService.delete(currentMember.id);
      io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.DELETE, currentMember.id);
      callback(ACKNOWLEDGEMENTS.DELETED);
      socket.disconnect();
    })
  );
}
