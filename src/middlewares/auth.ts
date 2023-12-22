import { UnauthorizedException } from "@/exceptions";
import { KanbanhaSocket, MemberData } from "@/io";
import { verify } from "jsonwebtoken";

const SECRET = process.env.SECRET || "";

export default function auth(socket: KanbanhaSocket, next: (error?: Error) => void) {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new UnauthorizedException("You must provide an authentication token."));
  }
  if (typeof token !== "string") {
    return next(new UnauthorizedException("Invalid authentication token."));
  }
  verify(token, SECRET, (error, payload) => {
    if (error) {
      return next(new UnauthorizedException("Invalid authentication token."));
    }
    socket.data.member = payload as MemberData;
    next();
  });
}
