import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { invitesService, projectsService } from "@/services";

const scheme = Joi.string().uuid().required();

export default function accept(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.ACCEPT, async (inviteId, callback) => {
    try {
      await scheme.validateAsync(inviteId);
      const currentMember = socket.data.member!;
      const updatedProject = await invitesService.accept(inviteId, currentMember.id);
      const membersInTheProject = await projectsService.getMembersInProject(updatedProject.id);
      callback(ACKNOWLEDGEMENTS.CREATED);
      io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, updatedProject);
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
