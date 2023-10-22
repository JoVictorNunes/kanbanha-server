import Joi from "joi";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";
import type { ResponseCallback } from "@/io";

const withErrrorHandler = <D extends object | string, C extends ResponseCallback>(
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
      callback(new InternalServerException());
    }
  };
};

export default withErrrorHandler;
