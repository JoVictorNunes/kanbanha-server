import tasksService from "../../services/tasks.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("tasks:read", async (callback) => {
    try {
      const currentMember = socket.data.member!;
      const tasks = await tasksService.readByMember(currentMember.id);
      callback(tasks);
    } catch {
      callback([]);
    }
  });
}
