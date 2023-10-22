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
  assignees: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()).required(),
  date: Joi.number().integer().required(),
  description: Joi.string().min(3).max(200).required(),
  dueDate: Joi.number().integer().required(),
  id: Joi.string().uuid().required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TASKS.UPDATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const task = await tasksService.update(data.id, data);
      const membersInTheTeam = await teamsService.getMembersInTeam(task.teamId);
      const teamOwner = await teamsService.getTeamOwner(task.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.UPDATE, task);
      callback(ACKNOWLEDGEMENTS.DELETED);
    })
  );
}
