import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import { CLIENT_TO_SERVER_EVENTS, SERVER_TO_CLIENT_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import { teamsService } from "@/services";

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.DELETE, async (teamId, callback) => {
    try {
      await scheme.validateAsync(teamId);
      const membersInTheTeam = await teamsService.getMembersInTeam(teamId);
      const deletedTeam = await teamsService.delete(teamId);
      const membersToNotify = [...membersInTheTeam, deletedTeam.project.ownerId];
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.DELETE, teamId);
      callback(ACKNOWLEDGEMENTS.DELETED);
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
