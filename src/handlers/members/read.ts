import { membersService } from "@/services";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.MEMBERS.READ, async (callback) => {
    try {
      const members = await membersService.readAll();
      callback(members);
    } catch {
      callback([]);
    }
  });
}
