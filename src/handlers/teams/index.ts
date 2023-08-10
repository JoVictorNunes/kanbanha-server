import create from "./create";
import read from "./read";
import update from "./update";
import del from "./delete";
import type { KanbanhaServer, KanbanhaSocket } from "../../io";

export default function registerTeamsHandlers(io: KanbanhaServer, socket: KanbanhaSocket) {
  [create, read, update, del].forEach((handler) => {
    handler(io, socket);
  });
}
