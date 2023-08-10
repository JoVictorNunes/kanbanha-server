import Joi from "joi";
import tasksService from "../../services/tasks.service";
import teamsService from "../../services/teams.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  taskId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:move", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { status, taskId } = data;
      console.log(taskId, status)
      const task = await tasksService.move(taskId, status);

      if (!task) return;

      const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
      const teamOwner = await teamsService.getTeamOwner(task.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      io.to(membersToNotify).emit("tasks:update", task);
      callback({ code: 201, message: "Moved" });
    } catch {}
  });
}
