import Joi from "joi";
import projectService from "../../services/projects.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.string().uuid().required();

export default function del(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("projects:delete", async (projectId, callback) => {
    try {
      await scheme.validateAsync(projectId);
      const currentMember = socket.data.member!;
      const membersInTheProject = await projectService.getMembersInProject(projectId);
      const membersToNotify = [...membersInTheProject, currentMember.id];
      await projectService.delete(projectId);
      io.to(membersToNotify).emit("projects:delete", projectId);
    } catch (e) {
      if (e instanceof Joi.ValidationError) {
        callback({ code: 400, message: e.message });
        return;
      }
      callback({ code: 500, message: "Internal server error" });
    }
  });
}
