import teamsService from "../../services/teams.service";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on("teams:read", async (callback) => {
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
