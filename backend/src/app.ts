import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { healthRoutes } from "./routes/health.js";
import { mirrorRoutes } from "./routes/mirror.js";
import { usersRoutes } from "./routes/users.js";
import { voiceRoutes } from "./routes/voice.js";
import { ensureMirrorState } from "./lib/mirror-state.js";

export const buildApp = async () => {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: env.clientOrigin
  });

  await ensureMirrorState();

  await app.register(healthRoutes);
  await app.register(mirrorRoutes);
  await app.register(usersRoutes);
  await app.register(voiceRoutes);

  return app;
};
