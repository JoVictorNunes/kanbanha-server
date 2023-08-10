import Joi from "joi";
import tasksService from "../../services/tasks.service";
import teamsService from "../../services/teams.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  assignees: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  id: Joi.string().uuid().required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:update", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const task = await tasksService.update(data.id, data);
      const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
      const teamOwner = await teamsService.getTeamOwner(task.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      io.to(membersToNotify).emit("tasks:update", task);
      callback({ code: 201, message: "Deleted" });
    } catch {}
  });
}
