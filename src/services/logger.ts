import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "error",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export default logger;
