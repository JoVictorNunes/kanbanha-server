import projectService from "../../services/projects.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("projects:read", async (callback) => {
    try {
      const member = socket.data.member!;
      const projects = await projectService.readByMember(member.id);
      callback(projects);
    } catch {
      callback([]);
    }
  });
}
