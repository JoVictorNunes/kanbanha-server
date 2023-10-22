import type { ReadCallback } from "@/io";

const withReadErrrorHandler = <D>(handler: (callback: ReadCallback<D>) => Promise<void>) => {
  return async (callback: ReadCallback<D>) => {
    try {
      await handler(callback);
    } catch (e) {
      callback([] as unknown as D);
    }
  };
};

export default withReadErrrorHandler;
