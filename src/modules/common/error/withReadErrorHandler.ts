import type { ReadCallback } from "@/io";
import logger from "@/services/logger";

type Handler<D> = (callback: ReadCallback<D>) => Promise<void>

const withReadErrorHandler = <D>(handler: Handler<D>) => {
  return async (callback: ReadCallback<D>) => {
    try {
      await handler(callback);
    } catch (e) {
      logger.error("Handler call error", { reason: e });
      callback([] as unknown as D);
    }
  };
};

export default withReadErrorHandler;
