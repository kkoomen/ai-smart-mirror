import { Prisma } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { deriveMirrorMode, getMirrorState, updateMirrorState } from "../lib/mirror-state.js";
import { generateDashboardSummary } from "../lib/dashboard-summary.js";
import { buildAgendaForUser } from "../lib/mock-data.js";
import { isString, parsePositiveInt } from "../lib/validation.js";

const getUserById = (id: number) => prisma.user.findUnique({ where: { id } });

export const mirrorRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/mirror/state", async () => {
    const [state, userCount, activeUser] = await Promise.all([
      getMirrorState(),
      prisma.user.count(),
      prisma.mirrorState.findFirst({
        include: {
          activeUser: true
        }
      })
    ]);

    const mode = deriveMirrorMode({
      userCount,
      state
    });

    return {
      mode,
      registrationComplete: state.registrationComplete,
      userCount,
      activeUser: activeUser?.activeUser ?? null
    };
  });

  app.post("/api/mirror/start-registration", async () => {
    const state = await updateMirrorState({
      activeUserId: null,
      registrationComplete: false
    });

    return {
      ok: true,
      state
    };
  });

  app.post("/api/mirror/register-user", async (request, reply) => {
    const body = request.body as {
      name?: unknown;
      faceLabel?: unknown;
      faceDescriptor?: unknown;
      location?: unknown;
      preferredLanguage?: unknown;
    };

    if (!isString(body?.name) || body.name.trim().length < 2) {
      return reply.status(400).send({
        ok: false,
        error: "name is required"
      });
    }

    const name = body.name.trim();
    const faceLabel = isString(body?.faceLabel) && body.faceLabel.trim().length > 0
      ? body.faceLabel.trim()
      : `face_${name.toLowerCase().replace(/\s+/g, "_")}`;
    const faceDescriptor = isString(body?.faceDescriptor) && body.faceDescriptor.trim().length > 0
      ? body.faceDescriptor.trim()
      : null;
    const location = isString(body?.location) && body.location.trim().length > 0
      ? body.location.trim()
      : "Amsterdam";
    const preferredLanguage =
      body?.preferredLanguage === "zh" || body?.preferredLanguage === "en"
        ? body.preferredLanguage
        : "en";

    const userData: Prisma.UserCreateInput = {
      name,
      faceLabel,
      faceDescriptor,
      location,
      preferredLanguage: preferredLanguage === "zh" ? "zh" : "en"
    };

    const user = await prisma.user.create({
      data: userData
    });

    const agendaSeed = buildAgendaForUser(user);

    await prisma.calendarEvent.createMany({
      data: agendaSeed.map((event) => ({
        userId: user.id,
        title: event.title,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        location: event.location,
        description: event.description
      }))
    });

    const state = await updateMirrorState({
      activeUserId: user.id,
      registrationComplete: false
    });

    return {
      ok: true,
      user,
      state,
      nextStep: "confirm-face"
    };
  });

  app.post("/api/mirror/confirm-face", async (request, reply) => {
    const body = request.body as {
      userId?: unknown;
      faceLabel?: unknown;
    };

    const userId = parsePositiveInt(body?.userId);

    let user = userId ? await getUserById(userId) : null;

    if (!user && isString(body?.faceLabel)) {
      user = await prisma.user.findUnique({
        where: { faceLabel: body.faceLabel.trim() }
      });
    }

    if (!user) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    const state = await updateMirrorState({
      activeUserId: user.id,
      registrationComplete: true
    });

    return {
      ok: true,
      user,
      state,
      mode: "recognized"
    };
  });

  app.post("/api/mirror/dashboard-summary", async (request, reply) => {
    const body = request.body as {
      weather?: unknown;
      appointmentCount?: unknown;
      language?: unknown;
    };

    if (!body?.weather || typeof body.appointmentCount !== "number") {
      return reply.status(400).send({
        ok: false,
        error: "weather and appointmentCount are required"
      });
    }

    const weather = body.weather as {
      location?: unknown;
      current?: {
        temperatureC?: unknown;
        condition?: unknown;
        rainChancePct?: unknown;
      };
      forecast?: Array<{
        temperatureC?: unknown;
        condition?: unknown;
        rainChancePct?: unknown;
      }>;
    };

    const summary = await generateDashboardSummary({
      weather: {
        location: isString(weather.location) ? weather.location : "Amsterdam",
        current: {
          temperatureC:
            typeof weather.current?.temperatureC === "number" ? weather.current.temperatureC : 0,
          condition: isString(weather.current?.condition) ? weather.current.condition : "Unknown",
          rainChancePct:
            typeof weather.current?.rainChancePct === "number"
              ? weather.current.rainChancePct
              : null
        },
        forecast: Array.isArray(weather.forecast)
          ? weather.forecast.map((item) => ({
              temperatureC: typeof item?.temperatureC === "number" ? item.temperatureC : 0,
              condition: isString(item?.condition) ? item.condition : "Unknown",
              rainChancePct:
                typeof item?.rainChancePct === "number" ? item.rainChancePct : null
            }))
          : []
      },
      appointmentCount: body.appointmentCount,
      language: isString(body.language) ? body.language : null
    });

    return {
      ok: true,
      ...summary
    };
  });
};
