import { buildServer } from "./server.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const start = async () => {
  const app = await buildServer();

  try {
    await app.listen({
      port: env.port,
      host: "0.0.0.0"
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();

