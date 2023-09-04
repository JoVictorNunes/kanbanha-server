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

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TASKS.DELETE, async (taskId, callback) => {
    try {
      await scheme.validateAsync(taskId);
      const task = await tasksService.delete(taskId);
      const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
      const teamOwner = await teamsService.getTeamOwner(task.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      callback(ACKNOWLEDGEMENTS.CREATED);
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.DELETE, taskId);
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
