import create from "./create";
import read from "./read";
import accept from "./accept";
import type { KanbanhaServer, KanbanhaSocket } from "@/io";

export default function registerInvitesHandlers(io: KanbanhaServer, socket: KanbanhaSocket) {
  [create, read, accept].forEach((handler) => {
    handler(io, socket);
  });
}
