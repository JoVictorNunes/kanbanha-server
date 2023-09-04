import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { tasksService, teamsService } from "@/services";

const scheme = Joi.object({
  taskId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
  index: Joi.number().required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.MOVE, async (data, callback) => {
    try {
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
