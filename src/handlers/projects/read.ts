import { projectsService } from "@/services";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.PROJECTS.READ, async (callback) => {
    try {
      const member = socket.data.member!;
      const projects = await projectsService.readByMember(member.id);
      callback(projects);
    } catch {
      callback([]);
    }
  });
}
