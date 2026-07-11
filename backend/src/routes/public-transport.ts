import type { FastifyPluginAsync } from "fastify";
import { parsePositiveInt } from "../lib/validation.js";
import { getPublicTransportTrips } from "../services/public-transport-service.js";

export const publicTransportRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/transport/ns", async (request, reply) => {
    const userId = parsePositiveInt((request.query as { userId?: unknown }).userId);
    if (!userId) return reply.status(400).send({ ok: false, error: "invalid user id" });

    const trips = await getPublicTransportTrips(userId);
    return trips ?? reply.status(404).send({ ok: false, error: "user not found" });
  });
};
