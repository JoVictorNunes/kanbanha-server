import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { teamsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TEAMS.DELETE,
    withErrrorHandler(async (teamId, callback) => {
      await scheme.validateAsync(teamId);
      const membersInTheTeam = await teamsService.getMembersInTeam(teamId);
      const deletedTeam = await teamsService.delete(teamId);
      const membersToNotify = [...membersInTheTeam];
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, teamId);
      callback(ACKNOWLEDGEMENTS.DELETED);
    })
  );
}
