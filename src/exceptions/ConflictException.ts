import BaseException from "./BaseException";

export class ConflictException extends BaseException {
  constructor(message: string = "Conflict Exception") {
    super(409, message);
  }
}

export default ConflictException;
