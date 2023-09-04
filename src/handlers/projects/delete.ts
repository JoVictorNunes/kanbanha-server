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

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.DELETE, async (projectId, callback) => {
    try {
      await scheme.validateAsync(projectId);
      const currentMember = socket.data.member!;
      const membersInTheProject = await projectsService.getMembersInProject(projectId);
      const membersToNotify = [...membersInTheProject, currentMember.id];
      await projectsService.delete(projectId);
      callback(ACKNOWLEDGEMENTS.DELETED);
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.DELETE, projectId);
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
