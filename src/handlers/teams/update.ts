import Joi from "joi";
import teamsService from "../../services/teams.service";
import { BaseException, UnauthorizedException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  teamId: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("teams:update", async (data, callback) => {
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
      const membersToNotify = [...membersInTheTeam, team.project.ownerId];
      const msg = {
        id: team.id,
        members: membersInTheTeam,
        name: team.name,
        projectId: team.projectId,
      };
      io.to(membersToNotify).emit("teams:update", msg);
      callback({ code: 200, message: "Team updated" });
    } catch (e) {
      if (e instanceof BaseException) {
        callback(e);
        return;
      }
      callback({ code: 500, message: "Internal server error" });
    }
  });
}
