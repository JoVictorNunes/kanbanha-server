import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import { UnauthorizedException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { teamsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TEAMS.UPDATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const { name, teamId } = data;
      const currentMember = socket.data.member!;
      const isOwnedByMember = await teamsService.isOwnedByMember(teamId, currentMember.id);
      if (!isOwnedByMember) {
        throw new UnauthorizedException();
      }
      const team = await teamsService.update(teamId, name);
      const membersInTheTeam = team.members.map((member) => member.memberId);
      const membersToNotify = [...membersInTheTeam];
      const msg = {
        id: team.id,
        members: membersInTheTeam,
        name: team.name,
        projectId: team.projectId,
      };
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.UPDATE, msg);
      callback(ACKNOWLEDGEMENTS.UPDATED);
    })
  );
}
