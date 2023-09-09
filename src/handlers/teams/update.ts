import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import {
  BadRequestException,
  BaseException,
  InternalServerException,
  UnauthorizedException,
} from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { teamsService } from "@/services";

const scheme = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.UPDATE, async (data, callback) => {
    try {
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
