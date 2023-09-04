import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import { teamsService } from "@/services";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(CLIENT_TO_SERVER_EVENTS.TEAMS.READ, async (callback) => {
    try {
      const currentMember = socket.data.member!;
      const teams = await teamsService.readByMember(currentMember.id);
      const response = teams.map((t) => ({
        id: t.id,
        name: t.name,
        projectId: t.projectId,
        members: t.members.map((m) => m.memberId),
      }));
      callback(response);
    } catch (e) {
      callback([]);
    }
  });
}
