import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import { membersService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  password: Joi.string().alphanum().min(8).max(16).required(),
  role: Joi.string().min(3).max(12),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.MEMBERS.CREATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      await membersService.create(data);
      callback(ACKNOWLEDGEMENTS.CREATED);
    })
  );
}
