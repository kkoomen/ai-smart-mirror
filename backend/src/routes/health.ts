import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async () => {
    const [users, events, reminders, logs] = await Promise.all([
      prisma.user.count(),
      prisma.calendarEvent.count(),
      prisma.reminder.count(),
      prisma.voiceCommandLog.count()
    ]);

    return {
      ok: true,
      database: "ready" as const,
      counts: {
        users,
        events,
        reminders,
        logs
      }
    };
  });
};
