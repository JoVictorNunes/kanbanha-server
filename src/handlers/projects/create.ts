import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { projectsService } from "@/services";

const scheme = Joi.object({
  name: Joi.string().min(3).max(12).required(),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.CREATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { name } = data;
      const currentMember = socket.data.member!;
      const project = await projectsService.create({
        name,
        ownerId: currentMember.id,
      });
      callback(ACKNOWLEDGEMENTS.CREATED);
      io.to(currentMember.id).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.CREATE, project);
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
