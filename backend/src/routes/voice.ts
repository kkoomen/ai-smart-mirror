import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { inferVoiceCommand } from "../lib/intent.js";
import { isString, parsePositiveInt } from "../lib/validation.js";

const isVoicePhase = (value: string): value is "start" | "name" | "scan" | "confirm" | "dashboard" => {
  return value === "start" || value === "name" || value === "scan" || value === "confirm" || value === "dashboard";
};

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/voice/command", async (request, reply) => {
    const body = request.body as {
      transcript?: unknown;
      phase?: unknown;
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
    const phaseValue = isString(body?.phase) ? body.phase.trim() : "";
    const phase = isVoicePhase(phaseValue) ? phaseValue : "dashboard";
    const result = inferVoiceCommand({
      transcript,
      phase
    });

    if (result.intent === "START_REGISTRATION") {
      await prisma.mirrorState.upsert({
        where: { id: 1 },
        create: { registrationComplete: false },
        update: {
          activeUserId: null,
          registrationComplete: false
        }
      });
    }

    const log = await prisma.voiceCommandLog.create({
      data: {
        userId,
        transcript,
        intent: result.intent,
        response: result.response
      }
    });

    return {
      ok: true,
      command: log,
      intent: result.intent,
      name: result.name,
      response: result.response
    };
  });
};
