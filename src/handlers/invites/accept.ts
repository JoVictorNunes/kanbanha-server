import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { invitesService, projectsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.string().uuid().required();

export default function accept(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.INVITES.ACCEPT,
    withErrrorHandler(async (inviteId, callback) => {
      await scheme.validateAsync(inviteId);
      const currentMember = socket.data.member!;
      const { updatedProject, updatedInvite } = await invitesService.accept(
        inviteId,
        currentMember.id
      );
      const membersInTheProject = await projectsService.getMembersInProject(updatedProject.id);
      io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, updatedProject);
      io.to(updatedInvite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.UPDATE, updatedInvite);
      callback(ACKNOWLEDGEMENTS.CREATED);
    })
  );
}
