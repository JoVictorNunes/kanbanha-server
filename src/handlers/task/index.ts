import create from "./create";
import read from "./read";
import update from "./update";
import del from "./delete";
import move from "./move";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function registerTasksHandlers(io: KanbanhaServer, socket: KanbanhaSocket) {
  [create, read, update, del, move].forEach((handler) => {
    handler(io, socket);
  });
}
