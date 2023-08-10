import BaseException from "./BaseException";

export class BadRequestException extends BaseException {
  constructor(message: string = "Bad Request Exception") {
    super(400, message);
  }
}

export default BadRequestException;
