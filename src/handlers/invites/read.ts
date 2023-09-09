import { invitesService } from "@/services";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.INVITES.READ, async (callback) => {
    try {
      const currentMember = socket.data.member!;
      const members = await invitesService.readByMember(currentMember.id);
      callback(members);
    } catch {
      callback([]);
    }
  });
}
