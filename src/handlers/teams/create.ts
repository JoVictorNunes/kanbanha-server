import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/enums";
import {
  BadRequestException,
  BaseException,
  InternalServerException,
  UnauthorizedException,
} from "@/exceptions";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { teamsService, projectsService } from "@/services";

const scheme = Joi.object({
  projectId: Joi.string().uuid().required(),
  members: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()),
  name: Joi.string().min(3).max(12),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.CREATE, async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { projectId, members, name } = data;
      const currentMember = socket.data.member!;
      if (!projectsService.isOwnedByMember(projectId, currentMember.id)) {
        throw new UnauthorizedException(
          "You do not have permission to create a team for this project."
        );
      }
      const deduplicatedMeberIds = Array.from(new Set([...members, currentMember.id]));
      const team = await teamsService.create(projectId, name, deduplicatedMeberIds);
      const createdTeam = {
        id: team.id,
        name: team.name,
        projectId: team.projectId,
        members,
      };

      io.to(deduplicatedMeberIds).emit(SERVER_TO_CLIENT_EVENTS.TEAMS.CREATE, createdTeam);
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
