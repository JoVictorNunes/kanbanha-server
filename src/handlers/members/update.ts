import Joi from "joi";
import membersService from "../../services/members.service";
import { BadRequestException, BaseException, InternalServerException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).max(40).required(),
  role: Joi.string().min(3).max(40),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("members:update", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const currentMember = socket.data.member!;
      const updatedMember = await membersService.update(currentMember.id, data);
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      io.to(membersKnownByMember).emit("members:update", updatedMember);
      callback({ code: 201, message: "Updated" });
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
