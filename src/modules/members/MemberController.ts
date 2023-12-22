import Joi from "joi";
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
import handleControllerException from "@/decorators/handleControllerException";
import prisma from "@/services/prisma";

const SECRET = process.env.SECRET || "";

export interface MemberControllerI {
  signIn: (req: Request, res: Response) => Promise<void>;
  signUp: (req: Request, res: Response) => Promise<void>;
  checkAuth: (req: Request, res: Response) => Promise<void>;
}

const signInDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const signUpDTO = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(3).max(50).required(),
  role: Joi.string().min(3).max(20),
});

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
      logger.debug("A member signed in:", member);
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
      logger.debug("A member signed up:", member);
    });
  }

  @handleControllerException
  async checkAuth(req: Request, res: Response) {
    const { token } = req.query;
    if (!token) {
      throw new BadRequestException("You must provide an authentication token in the URL query.");
    }
    if (typeof token !== 'string') {
      throw new BadRequestException("Invalid auth token.");
    }
    verify(token, SECRET, (error) => {
      if (error) {
        throw new UnauthorizedException();
      }
      return res.status(200).end();
    });
  }
}
