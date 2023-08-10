import Joi from "joi";
import teamsService from "../../services/teams.service";
import projectsService from "../../services/projects.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  projectId: Joi.string().uuid().required(),
  members: Joi.array().items(Joi.string().uuid().required(), Joi.string().uuid()),
  name: Joi.string().min(3).max(12),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("teams:create", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { projectId, members, name } = data;
      const currentMember = socket.data.member!;
      if (!projectsService.isOwnedByMember(projectId, currentMember.id)) {
        callback({
          code: 401,
          message: "You do not have permission to create a team for this project.",
        });
        return;
      }
      const membersInTheProject = await projectsService.getMembersInProject(projectId);
      const membersWhoDoNotKnowAboutTheProject = members.filter(
        (m) => !membersInTheProject.includes(m)
      );
      const team = await teamsService.create(projectId, name, members);
      const createdTeam = {
        id: team.id,
        name: team.name,
        projectId: team.projectId,
        members,
      };
      const membersToNotify = [...members, currentMember.id];

      io.to(membersToNotify).emit("teams:create", createdTeam);

      if (membersWhoDoNotKnowAboutTheProject.length > 0) {
        io.to(membersWhoDoNotKnowAboutTheProject).emit("projects:create", {
          id: projectId,
          name,
          ownerId: currentMember.id,
        });
      }

      const response = { code: 201, message: "Created" };
      callback(response);
    } catch (e) {
      callback({ code: 500, message: "Internal server error." });
    }
  });
}
