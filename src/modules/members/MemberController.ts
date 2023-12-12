import { createHash } from "node:crypto";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "@/exceptions";
import { logger } from "@/services/logger";
import { signInDTO, signUpDTO } from "@/modules/members/validation";
import handleControllerException from "@/decorators/handleControllerException";
import prisma from "@/services/prisma";

const SECRET = process.env.SECRET || "";

export interface MemberControllerI {
  signIn: (req: Request, res: Response) => Promise<void>;
  signUp: (req: Request, res: Response) => Promise<void>;
  checkAuth: (req: Request, res: Response) => Promise<void>;
}

export default class MemberController implements MemberControllerI {
  @handleControllerException
  async signIn(req: Request, res: Response) {
    await signInDTO.validateAsync(req.body);
    const { email, password } = req.body;
    const hash = createHash("sha256");
    hash.update(password);
    const hashedPassword = hash.digest("hex");
    const member = await prisma.member.findUniqueOrThrow({ where: { email } });
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
  }

  @handleControllerException
  async signUp(req: Request, res: Response) {
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
      },
    });

    logger.debug("A member signed up:", member);

    res.status(201).json({
      id: member.id,
      name: member.name,
      role: member.role,
      email: member.email,
    });
  }

  @handleControllerException
  async checkAuth(req: Request, res: Response) {
    const { token } = req.query as { token: string | undefined };
    if (!token) {
      throw new BadRequestException("You must provide an authentication token in the URL query.");
    }
    verify(token, SECRET, (error) => {
      if (error) {
        throw new UnauthorizedException();
      }
      return res.status(200).end();
    });
  }
}