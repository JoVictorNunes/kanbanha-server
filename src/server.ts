import { createServer } from "node:http";
import app from "./app";

const httpServer = createServer(app);

export default httpServer;
