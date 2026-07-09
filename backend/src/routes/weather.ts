import type { FastifyPluginAsync } from "fastify";
import { getWeatherForLocation } from "../lib/weather.js";
import { isString } from "../lib/validation.js";
import { weatherQueryRouteSchema } from "../schemas/weather.js";

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

    return {
      weather: await getWeatherForLocation(location || undefined)
    };
  });
};
