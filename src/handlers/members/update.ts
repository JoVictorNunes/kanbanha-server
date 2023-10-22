import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { membersService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  role: Joi.string().min(3).max(40),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.MEMBERS.UPDATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const currentMember = socket.data.member!;
      const updatedMember = await membersService.update(currentMember.id, data);
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.UPDATE, updatedMember);
      callback(ACKNOWLEDGEMENTS.UPDATED);
    })
  );
}
