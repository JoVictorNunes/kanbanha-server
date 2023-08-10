import BaseException from "./BaseException";

export class NotFoundException extends BaseException {
  constructor(message: string = "Not Found Exception") {
    super(404, message);
  }
}

export default NotFoundException;
