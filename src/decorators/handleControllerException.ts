import { Request, Response } from "express";
import { ValidationError } from "joi";
import {
  BadRequestException,
  BaseException,
  ConflictException,
  InternalServerException,
  NotFoundException,
} from "@/exceptions";
import { Prisma } from "@prisma/client";
import { PRISMA_ERROR_CODES } from "@/constants";

type Controller = (request: Request, response: Response) => Promise<void>;

export default function handleControllerException(
  controller: Controller,
  context: ClassMethodDecoratorContext
) {
  return async function (request: Request, response: Response) {
    try {
      await controller(request, response);
    } catch (e) {
      if (e instanceof BaseException) {
        response.status(e.code).json(e);
        return;
      }
      if (e instanceof ValidationError) {
        const exception = new BadRequestException(e.message);
        response.status(exception.code).json(exception);
        return;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
          const exception = new ConflictException(e.message);
          response.status(exception.code).json(exception);
          return;
        }
        if (e.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
          const exception = new NotFoundException(e.message);
          response.status(exception.code).json(exception);
          return;
        }
      }
      const exception = new InternalServerException();
      response.status(exception.code).json(exception);
    }
  };
}
