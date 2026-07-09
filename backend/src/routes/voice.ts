import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { inferVoiceCommand } from "../lib/intent.js";
import { isString, parsePositiveInt } from "../lib/validation.js";
import { voiceCommandRouteSchema } from "../schemas/voice.js";

const isVoicePhase = (
  value: string
): value is
  | "idle"
  | "waking"
  | "hello"
  | "name"
  | "nameConfirm"
  | "scan"
  | "confirm"
  | "changeLanguage"
  | "dashboard"
  | "unknown" => {
  return (
    value === "idle" ||
    value === "waking" ||
    value === "hello" ||
    value === "name" ||
    value === "nameConfirm" ||
    value === "scan" ||
    value === "confirm" ||
    value === "changeLanguage" ||
    value === "dashboard" ||
    value === "unknown"
  );
};

const normalizeLanguage = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const lowerCased = value.trim().toLowerCase();
  if (lowerCased.startsWith("zh")) {
    return "zh";
  }

  if (lowerCased.startsWith("en")) {
    return "en";
  }

  return null;
};

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/voice/command", { schema: voiceCommandRouteSchema }, async (request, reply) => {
    const body = request.body as {
      transcript?: unknown;
      phase?: unknown;
      userId?: unknown;
      language?: unknown;
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
    const language = normalizeLanguage(body?.language) ?? normalizeLanguage(request.headers["accept-language"]) ?? "en";
    const result = await inferVoiceCommand({
      transcript,
      phase,
      language
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
      name: result.entities.name,
      entities: result.entities,
      response: result.response
    };
  });
};
