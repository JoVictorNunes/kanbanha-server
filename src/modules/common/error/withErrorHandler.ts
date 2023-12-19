import Joi from "joi";
import { Prisma } from "@prisma/client";
import {
  BadRequestException,
  BaseException,
  ConflictException,
  InternalServerException,
  NotFoundException,
} from "@/exceptions";
import { PRISMA_ERROR_CODES } from "@/constants";
import type { ResponseCallback } from "@/io";
import logger from "@/services/logger";

type Handler<D, C> = (data: D, callback: C) => Promise<void>;
type Data = object | string;

const withErrorHandler = <D extends Data, C extends ResponseCallback>(handler: Handler<D, C>) => {
  return async (data: D, callback: C) => {
    try {
      await handler(data, callback);
    } catch (e) {
      logger.error("Handler call error", { reason: e });
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
          callback(new ConflictException(e.message));
          return;
        }
        if (e.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) {
          callback(new NotFoundException(e.message));
          return;
        }
      }
      callback(new InternalServerException());
    }
  };
};

export default withErrorHandler;
