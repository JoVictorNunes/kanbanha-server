import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { UnauthorizedException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { projectsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.PROJECTS.UPDATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const { id, name } = data;
      const currentMember = socket.data.member!;
      if (!projectsService.isOwnedByMember(id, currentMember.id)) {
        throw new UnauthorizedException("You do not have permission for updating this project.");
      }
      const updatedProject = await projectsService.update(id, name);
      const owner = updatedProject.members.find((m) => m.owner)!;
      const projectMapped = {
        ...updatedProject,
        ownerId: owner.memberId,
        members: updatedProject.members.map((m) => m.memberId),
      };
      const membersInTheProject = await projectsService.getMembersInProject(id);
      io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.UPDATE, projectMapped);
      callback(ACKNOWLEDGEMENTS.UPDATED);
    })
  );
}