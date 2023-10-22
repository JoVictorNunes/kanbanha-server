import { CLIENT_TO_SERVER_EVENTS, type KanbanhaServer, type KanbanhaSocket } from "@/io";
import { tasksService } from "@/services";
import withReadErrrorHandler from "@/handlers/withReadErrorHandler";

export default function read(io: KanbanhaServer, socket: KanbanhaSocket) {
  socket.on(
    CLIENT_TO_SERVER_EVENTS.TASKS.READ,
    withReadErrrorHandler(async (callback) => {
      const currentMember = socket.data.member!;
      const tasks = await tasksService.readByMember(currentMember.id);
      callback(tasks);
    })
  );
}
