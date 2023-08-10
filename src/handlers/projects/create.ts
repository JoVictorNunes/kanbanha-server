import { Prisma } from "@prisma/client";
import Joi from "joi";
import projectService from "../../services/projects.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

const scheme = Joi.object({
  name: Joi.string().min(3).max(12).required(),
}).required();

export default function create(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("projects:create", async (data, callback) => {
    try {
      await scheme.validateAsync(data);
      const { name } = data;
      const currentMember = socket.data.member!;
      const project = await projectService.create({
        name,
        ownerId: currentMember.id,
      });
      callback({ code: 201, message: "Created" });
      io.to(currentMember.id).emit("projects:create", project);
    } catch (e) {
      if (e instanceof Joi.ValidationError) {
        callback({ code: 400, message: e.message });
        return;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          callback({ code: 409, message: e.message });
          return;
        }
        if (e.code === "P2025") {
          callback({ code: 404, message: e.message });
          return;
        }
      }
      callback({ code: 500, message: "Internal server error" });
    }
  });
}
