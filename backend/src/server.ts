import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

export const buildServer = async () => {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: env.clientOrigin
  });

  app.get("/api/hello", async () => {
    return {
      message: "hello world"
    };
  });

  app.get("/api/health", async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        ok: true,
        database: "ready"
      };
    } catch {
      return {
        ok: false,
        database: "error"
      };
    }
  });

  return app;
};

