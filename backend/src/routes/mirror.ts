import type { FastifyPluginAsync } from "fastify";
import {
  buildMirrorDashboardSummary,
  confirmMirrorFace,
  getMirrorStateSnapshot,
  registerMirrorUser,
  startMirrorRegistration
} from "../services/mirror-service.js";
import {
  confirmFaceRouteSchema,
  dashboardSummaryRouteSchema,
  registerUserRouteSchema,
  startRegistrationRouteSchema
} from "../schemas/mirror.js";

export const mirrorRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/mirror/state", async () => getMirrorStateSnapshot());

  app.post("/api/mirror/start-registration", { schema: startRegistrationRouteSchema }, async () =>
    startMirrorRegistration()
  );

  app.post("/api/mirror/register-user", { schema: registerUserRouteSchema }, async (request) => {
    const body = request.body as {
      name: string;
      faceLabel?: string;
      faceDescriptor?: string;
      location?: string;
      preferredLanguage?: "en" | "zh";
    };

    return registerMirrorUser(body);
  });

  app.post("/api/mirror/confirm-face", { schema: confirmFaceRouteSchema }, async (request, reply) => {
    const body = request.body as {
      userId?: number;
      faceLabel?: string;
    };

    const result = await confirmMirrorFace(body);

    if (!result) {
      return reply.status(404).send({
        ok: false,
        error: "user not found"
      });
    }

    return result;
  });

  app.post("/api/mirror/dashboard-summary", { schema: dashboardSummaryRouteSchema }, async (request) => {
    const body = request.body as {
      weather: {
        location?: string;
        current?: {
          temperatureC?: number;
          condition?: string;
          rainChancePct?: number | null;
        };
        forecast?: Array<{
          temperatureC?: number;
          condition?: string;
          rainChancePct?: number | null;
        }>;
      };
      appointmentCount: number;
      language?: string | null;
    };

    return buildMirrorDashboardSummary(body);
  });
};
