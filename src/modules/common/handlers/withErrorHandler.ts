import { Prisma } from "@prisma/client";
import Joi from "joi";
import {
  BadRequestException,
  BaseException,
  ConflictException,
  InternalServerException,
  NotFoundException,
} from "@/exceptions";
import { PRISMA_ERROR_CODES } from "@/constants";
import type { ResponseCallback } from "@/io";

const withErrorHandler = <D extends object | string, C extends ResponseCallback>(
  handler: (data: D, callback: C) => Promise<void>
) => {
  return async (data: D, callback: C) => {
    try {
      await handler(data, callback);
    } catch (e) {
      if (e instanceof BaseException) {
        callback(e);
        return;
      }
      if (e instanceof Joi.ValidationError) {
        callback(new BadRequestException(e.message));
        return;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) {
          callback(new ConflictException());
          return;
        }
        if (e.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
          callback(new NotFoundException());
        }
      }
      callback(new InternalServerException());
    }
  };
};

export default withErrorHandler;
