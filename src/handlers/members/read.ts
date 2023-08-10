import membersService from "../../services/members.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("members:read", async (callback) => {
    try {
      const members = await membersService.read();
      callback(members);
    } catch {
      callback([]);
    }
  });
}
