import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import { membersService } from "@/services";

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  password: Joi.string().alphanum().min(8).max(16).required(),
  role: Joi.string().min(3).max(12),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.CREATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      await membersService.create(data);
      callback(ACKNOWLEDGEMENTS.CREATED);
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
