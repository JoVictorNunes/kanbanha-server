import BaseException from "./BaseException";

export class InternalServerException extends BaseException {
  constructor(message: string = "Internal Server Exception") {
    super(500, message);
  }
}

export default InternalServerException;
