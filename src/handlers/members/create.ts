import Joi from "joi";
import membersService from "../../services/members.service";
import { BadRequestException, BaseException, InternalServerException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  password: Joi.string().alphanum().min(8).max(16).required(),
  role: Joi.string().min(3).max(12),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("members:create", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      await membersService.create(data);
      callback({ code: 201, message: "Created" });
    } catch (e) {
      if (e instanceof BaseException) {
        callback(e);
        return;
      }
      if (e instanceof Joi.ValidationError) {
        const exception = new BadRequestException(e.message);
        callback(exception);
        return;
      }
      const exception = new InternalServerException();
      callback(exception);
    }
  });
}
