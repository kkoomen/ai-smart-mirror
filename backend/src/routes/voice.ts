import type { FastifyPluginAsync } from "fastify";
import { voiceCommandRouteSchema } from "../schemas/voice.js";
import { handleVoiceCommand } from "../services/voice-command-service.js";

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/voice/command", { schema: voiceCommandRouteSchema }, async (request, reply) => {
    const body = request.body as {
      transcript?: unknown;
      phase?: unknown;
      userId?: unknown;
      language?: unknown;
    };

    const result = await handleVoiceCommand({
      transcript: body?.transcript,
      phase: body?.phase,
      userId: body?.userId,
      language: body?.language,
      acceptLanguage: request.headers["accept-language"]
    });

    if (result.ok === false) {
      return reply.status(result.statusCode).send({
        ok: false,
        error: result.error
      });
    }

    return result;
  });
};
