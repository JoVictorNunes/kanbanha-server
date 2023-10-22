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
  teamId: Joi.string().uuid().required(),
  status: Joi.string().equal("active", "ongoing", "review", "finished").required(),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TASKS.CREATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const task = await tasksService.create(data);
      const membersInTheTeam = await teamsService.getMembersInTeam(data.teamId);
      const teamOwner = await teamsService.getTeamOwner(data.teamId);
      const membersToNotify = [...membersInTheTeam, teamOwner];
      callback(ACKNOWLEDGEMENTS.CREATED);
      io.to(membersToNotify).emit(SERVER_TO_CLIENT_EVENTS.TASKS.CREATE, {
        ...task,
        assignees: data.assignees,
        status: task.status as "active" | "ongoing" | "review" | "finished",
      });
    })
  );
}
