import Joi from "joi";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";
import teamsService from "../../services/teams.service";

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("teams:delete", async (teamId, callback) => {
    try {
      await scheme.validateAsync(teamId);
      const membersInTheTeam = await teamsService.getMembersInTeam(teamId);
      const deletedTeam = await teamsService.delete(teamId);
      const membersToNotify = [...membersInTheTeam, deletedTeam.project.ownerId];
      io.to(membersToNotify).emit("teams:delete", teamId);
      callback({ code: 200, message: "Team deleted" });
    } catch (e) {}
  });
}
