import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { inferIntent } from "../lib/intent.js";
import { isString, parsePositiveInt } from "../lib/validation.js";

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/voice/command", async (request, reply) => {
    const body = request.body as {
      transcript?: unknown;
      intent?: unknown;
      response?: unknown;
      userId?: unknown;
    };

    if (!isString(body?.transcript) || body.transcript.trim().length === 0) {
      return reply.status(400).send({
        ok: false,
        error: "transcript is required"
      });
    }

    const userId = parsePositiveInt(body?.userId);
    const transcript = body.transcript.trim();
    const intent = isString(body?.intent) && body.intent.trim().length > 0
      ? body.intent.trim()
      : inferIntent(transcript);

    let responseText = isString(body?.response) && body.response.trim().length > 0
      ? body.response.trim()
      : "Command received.";

    if (intent === "start_registration") {
      await prisma.mirrorState.upsert({
        where: { id: 1 },
        create: { registrationComplete: false },
        update: {
          activeUserId: null,
          registrationComplete: false
        }
      });
      responseText = "Registration started.";
    }

    if (intent === "confirm_face") {
      responseText = "Face confirmed.";
    }

    const command = await prisma.voiceCommandLog.create({
      data: {
        userId,
        transcript,
        intent,
        response: responseText
      }
    });

    return {
      ok: true,
      command
    };
  });
};
