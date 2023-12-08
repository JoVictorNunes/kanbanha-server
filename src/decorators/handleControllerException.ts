import { Request, Response } from "express";
import { ValidationError } from "joi";
import { BadRequestException, BaseException, InternalServerException } from "@/exceptions";

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
      const exception = new InternalServerException();
      response.status(exception.code).json(exception);
    }
  };
}
