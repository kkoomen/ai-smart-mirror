import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { deriveMirrorMode, getMirrorState } from "../lib/mirror-state.js";
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
    const state = await prisma.mirrorState.upsert({
      where: { id: 1 },
      create: { registrationComplete: false },
      update: {
        activeUserId: null,
        registrationComplete: false
      }
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

    const user = await prisma.user.create({
      data: {
        name,
        faceLabel,
        faceDescriptor
      }
    });

    const agendaSeed = buildAgendaForUser(user);

    const [, , state] = await prisma.$transaction([
      prisma.calendarEvent.createMany({
        data: agendaSeed.map((event) => ({
          userId: user.id,
          title: event.title,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          location: event.location,
          description: event.description
        }))
      }),
      prisma.reminder.createMany({
        data: [
          {
            userId: user.id,
            text: "Check tomorrow's weather before bed",
            dueAt: new Date()
          },
          {
            userId: user.id,
            text: "Review today's calendar before lunch",
            dueAt: null
          }
        ]
      }),
      prisma.mirrorState.upsert({
        where: { id: 1 },
        create: {
          activeUserId: user.id,
          registrationComplete: false
        },
        update: {
          activeUserId: user.id,
          registrationComplete: false
        }
      })
    ]);

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

    const state = await prisma.mirrorState.upsert({
      where: { id: 1 },
      create: {
        activeUserId: user.id,
        registrationComplete: true
      },
      update: {
        activeUserId: user.id,
        registrationComplete: true
      }
    });

    return {
      ok: true,
      user,
      state,
      mode: "recognized"
    };
  });
};
