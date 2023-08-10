export class BaseException extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export default BaseException;
