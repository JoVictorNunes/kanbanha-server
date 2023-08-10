import { Prisma } from "@prisma/client";
import Joi from "joi";
import projectService from "../../services/projects.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(12).required(),
}).required();

export default function update(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("projects:update", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { id, name } = data;
      const currentMember = socket.data.member!;
      const updatedProject = await projectService.update(id, name);
      const membersInTheProject = await projectService.getMembersInProject(id);
      const membersToNotify = [...membersInTheProject, currentMember.id];
      io.to(membersToNotify).emit("projects:update", updatedProject);
    } catch (e) {
      if (e instanceof Joi.ValidationError) {
        callback({ code: 400, message: e.message });
        return;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2001") {
          callback({ code: 404, message: e.message });
          return;
        }
      }
      callback({ code: 500, message: "Internal server error" });
    }
  });
}
