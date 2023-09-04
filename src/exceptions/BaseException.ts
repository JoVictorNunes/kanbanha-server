export class BaseException extends Error {
  constructor(public code: number, public message: string) {
    super(message);
  }
}

export default BaseException;
