import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { tasksService, teamsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  taskId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
  index: Joi.number().required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TASKS.MOVE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const { index, status, taskId } = data;
      const updatedTasks = await tasksService.move(taskId, status, index);

      if (updatedTasks.length === 0) return;

      const membersInTheTeam = await teamsService.getMembersInTeam(updatedTasks[0].teamId);
      const teamOwner = await teamsService.getTeamOwner(updatedTasks[0].teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      updatedTasks.forEach((task) => {
        io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.UPDATE, task);
      });
      callback(ACKNOWLEDGEMENTS.CREATED);
    })
  );
}
