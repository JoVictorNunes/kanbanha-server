import { UnauthorizedException } from "@/exceptions";
import { KanbanhaSocket, SocketData } from "@/io";
import { verify } from "jsonwebtoken";

const SECRET = process.env.SECRET || "";

export default function auth(socket: KanbanhaSocket, next: (error?: Error) => void) {
  const token: string | undefined = socket.handshake.auth.token;
  if (!token) {
    const exception = new UnauthorizedException("You must provide an authentication token.");
    return next(exception);
  }
  verify(token, SECRET, (error, payload) => {
    if (error) {
      const exception = new UnauthorizedException("Invalid authentication token.");
      return next(exception);
    }
    socket.data = { member: payload } as SocketData;
    next();
  });
}
