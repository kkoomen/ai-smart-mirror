import type { FastifyPluginAsync } from "fastify";
import type { UserLanguageMutationRequestDto } from "../contracts/api.js";
import { parsePositiveInt } from "../lib/validation.js";
import { updateUserLanguageRouteSchema, userIdParamRouteSchema } from "../schemas/users.js";
import {
  getUser,
  getUserAgendaToday,
  getUserWeather,
  listUsers,
  updateUserLanguage
} from "../services/users-service.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/users", async () => listUsers());

  app.get("/api/users/:id", { schema: userIdParamRouteSchema }, async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const result = await getUser(id);

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return result;
  });

  app.get("/api/users/:id/agenda/today", { schema: userIdParamRouteSchema }, async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const result = await getUserAgendaToday(id);

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return result;
  });

  app.get("/api/users/:id/weather", { schema: userIdParamRouteSchema }, async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const result = await getUserWeather(id);

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return result;
  });

  app.post("/api/users/:id/language", { schema: updateUserLanguageRouteSchema }, async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const body = request.body as Partial<UserLanguageMutationRequestDto>;

    if (body?.preferredLanguage !== "en" && body?.preferredLanguage !== "zh") {
      return reply.status(400).send({
        ok: false,
        error: "preferredLanguage must be en or zh"
      });
    }

    const result = await updateUserLanguage(id, body.preferredLanguage);

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return result;
  });
};
