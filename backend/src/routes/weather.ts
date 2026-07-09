import type { FastifyPluginAsync } from "fastify";
import { isString } from "../lib/validation.js";
import { weatherQueryRouteSchema } from "../schemas/weather.js";
import { getWeather } from "../services/weather-service.js";

export const weatherRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/weather", { schema: weatherQueryRouteSchema }, async (request, reply) => {
    const query = request.query as { location?: unknown };
    const location = isString(query?.location) ? query.location.trim() : "";

    if (isString(query?.location) && query.location.trim().length === 0) {
      return reply.status(400).send({
        ok: false,
        error: "location is required"
      });
    }

    return getWeather(location || undefined);
  });
};
