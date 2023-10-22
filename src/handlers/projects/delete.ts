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

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.PROJECTS.DELETE,
    withErrrorHandler(async (projectId, callback) => {
      await scheme.validateAsync(projectId);
      const currentMember = socket.data.member!;
      if (!projectsService.isOwnedByMember(projectId, currentMember.id)) {
        throw new UnauthorizedException("You do not have permission for deleting this project.");
      }
      const membersInTheProject = await projectsService.getMembersInProject(projectId);
      const { deletedTasks, deletedTeams } = await projectsService.delete(projectId);
      deletedTasks.forEach((task) => {
        io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, task.id);
      });
      deletedTeams.forEach((team) => {
        io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, team.id);
      });
      io.to(membersInTheProject).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.DELETE, projectId);
      callback(ACKNOWLEDGEMENTS.DELETED);
    })
  );
}
