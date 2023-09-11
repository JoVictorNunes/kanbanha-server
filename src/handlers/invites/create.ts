import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { invitesService } from "@/services";

const scheme = Joi.object({
  projectId: Joi.string().uuid().required(),
  invited: Joi.array().items(Joi.string().email()).required(),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.CREATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { invited, projectId } = data;
      const currentMember = socket.data.member!;
      const deduplicatedInvited = new Set(invited);
      deduplicatedInvited.delete(currentMember.email);
      for (const email of deduplicatedInvited) {
        try {
          const invite = await invitesService.create(projectId, email);
          io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
        } catch {}
      }
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
