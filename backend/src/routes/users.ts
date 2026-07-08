import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { buildAgendaForUser } from "../lib/mock-data.js";
import { getWeatherForLocation } from "../lib/weather.js";
import { parsePositiveInt } from "../lib/validation.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/users", async () => {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      users
    };
  });

  app.get("/api/users/:id", async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return {
      user
    };
  });

  app.get("/api/users/:id/agenda/today", async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    const events = await prisma.calendarEvent.findMany({
      where: { userId: user.id },
      orderBy: {
        startTime: "asc"
      }
    });

    if (events.length === 0) {
      return {
        userId: user.id,
        date: new Date().toISOString().slice(0, 10),
        events: buildAgendaForUser(user)
      };
    }

    return {
      userId: user.id,
      date: new Date().toISOString().slice(0, 10),
      events
    };
  });

  app.get("/api/users/:id/weather", async (request, reply) => {
    const id = parsePositiveInt((request.params as { id?: unknown }).id);

    if (!id) {
      return reply.status(400).send({
        ok: false,
        error: "invalid user id"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return {
      userId: user.id,
      weather: await getWeatherForLocation(user.location)
    };
  });
};
