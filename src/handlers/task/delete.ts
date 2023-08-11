import Joi from "joi";
import tasksService from "../../services/tasks.service";
import teamsService from "../../services/teams.service";
import { InternalServerException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:delete", async (taskId, callback) => {
    try {
      await scheme.validateAsync(taskId);
      const task = await tasksService.delete(taskId);
      const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
      const teamOwner = await teamsService.getTeamOwner(task.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      callback({ code: 201, message: "Deleted" });
      io.to(membersToNotify).emit("tasks:delete", taskId);
    } catch (e) {
      const exception = new InternalServerException();
      callback(exception);
    }
  });
}
