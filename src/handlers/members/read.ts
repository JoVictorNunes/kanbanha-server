import { membersService } from "@/services";
import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import withReadErrrorHandler from "@/handlers/withReadErrorHandler";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.MEMBERS.READ,
    withReadErrrorHandler(async (callback) => {
      const members = await membersService.readAll();
      callback(members);
    })
  );
}
