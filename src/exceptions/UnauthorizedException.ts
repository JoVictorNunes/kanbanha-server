import BaseException from "./BaseException";

export class UnauthorizedException extends BaseException {
  constructor(message: string = "Unauthorized Exception") {
    super(401, message);
  }
}

export default UnauthorizedException;
