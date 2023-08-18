import Joi from "joi";
import tasksService from "../../services/tasks.service";
import teamsService from "../../services/teams.service";
import { InternalServerException } from "../../exceptions";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  taskId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
  index: Joi.number().required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:move", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { index, status, taskId } = data;
      const updatedTasks = await tasksService.move(taskId, status, index);

      if (updatedTasks.length === 0) return;

      const membersInTheTeam = await teamsService.getMembersInTeam(updatedTasks[0].teamId);
      const teamOwner = await teamsService.getTeamOwner(updatedTasks[0].teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      updatedTasks.forEach((task) => {
        io.to(membersToNotify).emit("tasks:update", task);
      });
      callback({ code: 201, message: "Moved" });
    } catch (e) {
      const exception = new InternalServerException();
      callback(exception);
    }
  });
}
