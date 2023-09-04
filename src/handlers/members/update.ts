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

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  role: Joi.string().min(3).max(40),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.UPDATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const currentMember = socket.data.member!;
      const updatedMember = await membersService.update(currentMember.id, data);
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      io.to(membersKnownByMember).emit(SERVER_TO_CLIENT_EVENTS.MEMBERS.UPDATE, updatedMember);
      callback(ACKNOWLEDGEMENTS.UPDATED);
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
