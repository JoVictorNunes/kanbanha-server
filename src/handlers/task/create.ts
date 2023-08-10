import Joi from "joi";
import tasksService from "../../services/tasks.service";
import teamsService from "../../services/teams.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  assignees: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  teamId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:create", async (data) => {
    try {
      await scheme.validateAsync(data);
      const task = await tasksService.create(data);
      const membersInTheTeam = await teamsService.getMembersInTeam(data.teamId);
      const teamOwner = await teamsService.getTeamOwner(data.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner]
      io.to(membersToNotify).emit("tasks:create", {
        ...task,
        assignees: data.assignees,
        status: task.status as "active" | "ongoing" | "review" | "finished",
      });
    } catch (e) {
      console.log(e)
    }
  });
}
