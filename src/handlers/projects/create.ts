import Joi from "joi";
import { ACKNOWLEDGEMENTS } from "@/constants";
import {
  CLIENT_TO_SERVER_EVENTS,
  SERVER_TO_CLIENT_EVENTS,
  type KanbanhaServer,
  type KanbanhaSocket,
} from "@/io";
import { invitesService, logger, projectsService } from "@/services";
import withErrrorHandler from "@/handlers/withErrorHandler";

const scheme = Joi.object({
  name: Joi.string().min(3).max(12).required(),
  invited: Joi.array().items(Joi.string().email()),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.PROJECTS.CREATE,
    withErrrorHandler(async (data, callback) => {
      await scheme.validateAsync(data);
      const { name, invited } = data;
      const currentMember = socket.data.member!;
      const ownerId = currentMember.id;
      const createdProject = await projectsService.create({ name, ownerId });
      const project = { ...createdProject, ownerId, members: [ownerId] };
      io.to(ownerId).emit(SERVER_TO_CLIENT_EVENTS.PROJECTS.CREATE, project);
      callback(ACKNOWLEDGEMENTS.CREATED);

      if (invited) {
        // TODO: This should be batched.
        const deduplicatedInvited = new Set(invited);
        deduplicatedInvited.delete(currentMember.email);
        for (const email of deduplicatedInvited) {
          try {
            const invite = await invitesService.create(project.id, email);
            io.to(invite.memberId).emit(SERVER_TO_CLIENT_EVENTS.INVITES.CREATE, invite);
          } catch (e) {
            logger.debug(`Failed to invite ${email}`, { reason: e });
          }
        }
      }
    })
  );
}
