import Joi from "joi";
import membersService from "../../services/members.service";
import { BadRequestException, BaseException, InternalServerException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("members:delete", async (callback) => {
    try {
      const currentMember = socket.data.member!;
      const membersKnownByMember = await membersService.getMembersKnownBy(currentMember.id);
      await membersService.delete(currentMember.id);
      io.to(membersKnownByMember).emit("members:delete", currentMember.id);
      callback({ code: 201, message: "Deleted" });

      // Give some time for the user to receive the response.
      setTimeout(() => {
        socket.disconnect();
      }, 3000);
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
