import "dotenv/config";
import express from "express";
import cors from "cors";
import { createHash } from "node:crypto";
import { sign, verify } from "jsonwebtoken";
import { ValidationError } from "joi";
import { Prisma } from "@prisma/client";
import registerProjectsHandlers from "./handlers/projects";
import registerTasksHandlers from "./handlers/task";
import registerTeamsHandlers from "./handlers/teams";
import registerMembersHandlers from "./handlers/members";
import prisma from "./services/prisma.service";
import signUpDTO from "./dto/signUp.dto";
import {
  BadRequestException,
  BaseException,
  ConflictException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "./exceptions";
import signInDTO from "./dto/signIn.dto";
import app from "./app";
import httpServer from "./server";
import io, { type SocketData } from "./io";

const SECRET = process.env.SECRET || "";
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.post("/signIn", async (req, res) => {
  try {
    await signInDTO.validateAsync(req.body);
    const { email, password } = req.body;
    const hash = createHash("sha256");
    hash.update(password);
    const hashedPassword = hash.digest("hex");
    const member = await prisma.member.findUnique({
      where: {
        email,
      },
    });
    if (!member) {
      throw new NotFoundException("Member does not exist.");
    }
    if (member.password !== hashedPassword) {
      throw new UnauthorizedException("Invalid password.");
    }
    const payload = {
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
    };
    sign(payload, SECRET, { expiresIn: "2h" }, (error, token) => {
      if (error) {
        const exception = new InternalServerException();
        return res.status(exception.code).json(exception);
      }

      res.status(201).json({ token });
    });
  } catch (e) {
    if (e instanceof BaseException) {
      return res.status(e.code).json(e);
    }
    if (e instanceof ValidationError) {
      const exception = new BadRequestException(e.message);
      return res.status(exception.code).json(exception);
    }
    const exception = new InternalServerException();
    res.status(exception.code).json(exception);
  }
});

app.post("/signUp", async (req, res) => {
  try {
    await signUpDTO.validateAsync(req.body);
    const { email, password, name, role } = req.body;
    const hash = createHash("sha256");
    hash.update(password);
    const hashedPassword = hash.digest("hex");

    const member = await prisma.member.create({
      data: {
        name,
        role,
        email,
        password: hashedPassword,
        online: false,
      },
    });

    console.log("A new member was created:", member);

    res.status(201).json({
      id: member.id,
      name: member.name,
      role: member.role,
      email: member.email,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const exception = new ConflictException("Resource already exists on the server.");
        return res.status(exception.code).json(exception);
      }
    }
    if (e instanceof BaseException) {
      return res.status(e.code).json(e);
    }
    if (e instanceof ValidationError) {
      const exception = new BadRequestException(e.message);
      return res.status(exception.code).json(exception);
    }
    const exception = new InternalServerException();
    res.status(exception.code).json(exception);
  }
});

app.get("/checkAuth", (req, res) => {
  try {
    const { token } = req.query as { token: string | undefined };
    if (!token) {
      throw new BadRequestException("You must provide an authentication token in the URL query.");
    }
    verify(token, SECRET, (error) => {
      if (error) {
        return res.status(401).end();
      }
      return res.status(200).end();
    });
  } catch (e) {
    if (e instanceof BaseException) {
      return res.status(e.code).json(e);
    }
  }
});

io.use((socket, next) => {
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
    socket.data.member = payload as SocketData["member"];
    next();
  });
});

io.on("connection", async (socket) => {
  const member = socket.data.member!;

  console.log("A connection was established...");
  console.log(`Member connected: name=${member.name} id=${member.id}`);

  socket.use(([event], next) => {
    console.log(`Member ${member.name} id=${member.id} sent a message: event=${event}`);
    next();
  });

  socket.join(member.id);
  registerProjectsHandlers(io, socket);
  registerTeamsHandlers(io, socket);
  registerMembersHandlers(io, socket);
  registerTasksHandlers(io, socket);

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
