import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { mirrorRoutes } from "./routes/mirror.js";
import { weatherRoutes } from "./routes/weather.js";
import { usersRoutes } from "./routes/users.js";
import { voiceRoutes } from "./routes/voice.js";
import { publicTransportRoutes } from "./routes/public-transport.js";

export const buildApp = async () => {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: env.clientOrigin
  });

  await app.register(mirrorRoutes);
  await app.register(weatherRoutes);
  await app.register(usersRoutes);
  await app.register(voiceRoutes);
  await app.register(publicTransportRoutes);

  return app;
};
