import "dotenv/config";
import express from "express";
import cors from "cors";
import { verify } from "jsonwebtoken";
import { UnauthorizedException } from "@/exceptions";
import app from "@/app";
import httpServer from "@/server";
import io from "@/io";
import prisma from "@/services/prisma";
import logger from "@/services/logger";
import MemberController from "@/modules/members/MemberController";
import ProjectHandler from "@/modules/projects/ProjectHandler";
import TeamHandler from "@/modules/teams/TeamHandler";
import TaskHandler from "@/modules/tasks/TaskHandler";
import MemberHandler from "@/modules/members/MemberHandler";
import InviteHandler from "@/modules/invites/InviteHandler";
import auth from "@/middlewares/auth";

const SECRET = process.env.SECRET || "";
const PORT = Number(process.env.PORT) || 3000;

process.on("uncaughtException", (error) => {
  console.log("uncaughtException", error);
  process.exit(1);
});

const memberController = new MemberController();

app.use(cors());
app.use(express.json());
app.post("/signIn", memberController.signIn);
app.post("/signUp", memberController.signUp);
app.get("/checkAuth", memberController.checkAuth);
io.use(auth);

io.on("connection", async (socket) => {
  const member = socket.data.member!;

  logger.debug("A connection was established.");
  logger.debug(`Member connected: name=${member.name} id=${member.id}`);

  socket.use(([event], next) => {
    logger.debug(`Event ${event} received from member name=${member.name} id=${member.id}.`);
    next();
  });

  socket.use((_, next) => {
    const token: string | undefined = socket.handshake.auth.token;
    if (!token) {
      const exception = new UnauthorizedException("You must provide an authentication token.");
      return next(exception);
    }
    verify(token, SECRET, (error) => {
      if (error) {
        const exception = new UnauthorizedException("Invalid authentication token.");
        return next(exception);
      }
      next();
    });
  });

  socket.on("error", (error) => {
    logger.debug(`Disconnecting member name=${member.name} id=${member.id}`, { reason: error });
    socket.disconnect(true);
  });

  socket.join(member.id);

  const projectHandler = new ProjectHandler(io, socket);
  const teamHandler = new TeamHandler(io, socket);
  const taskHandler = new TaskHandler(io, socket);
  const memberHandler = new MemberHandler(io, socket);
  const inviteHandler = new InviteHandler(io, socket);
  projectHandler.registerHandlers();
  teamHandler.registerHandlers();
  taskHandler.registerHandlers();
  memberHandler.registerHandlers();
  inviteHandler.registerHandlers();

  io.emit("members:member_connected", member.id);

  await prisma.member.update({
    where: {
      id: member.id,
    },
    data: {
      online: true,
    },
  });

  socket.on("disconnect", async () => {
    io.emit("members:member_disconnected", member.id);
    await prisma.member.update({
      where: {
        id: member.id,
      },
      data: {
        online: false,
      },
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Running on :${PORT}`);
});
