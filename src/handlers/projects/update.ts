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
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.UPDATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { id, name } = data;
      const currentMember = socket.data.member!;
      const updatedProject = await projectsService.update(id, name);
      const membersInTheProject = await projectsService.getMembersInProject(id);
      const membersToNotify = [...membersInTheProject, currentMember.id];
      callback(ACKNOWLEDGEMENTS.UPDATED);
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, updatedProject);
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
