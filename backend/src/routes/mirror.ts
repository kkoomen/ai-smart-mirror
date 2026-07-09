import type { FastifyPluginAsync } from "fastify";
import type {
  ConfirmFaceRequestDto,
  DashboardSummaryRequestDto,
  RegisterUserRequestDto
} from "../contracts/api.js";
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
    const body = request.body as RegisterUserRequestDto;

    return registerMirrorUser(body);
  });

  app.post(
    "/api/mirror/confirm-face",
    { schema: confirmFaceRouteSchema },
    async (request, reply) => {
      const body = request.body as ConfirmFaceRequestDto;

      const result = await confirmMirrorFace(body);

      if (!result) {
        return reply.status(404).send({
          ok: false,
          error: "user not found"
        });
      }

      return result;
    }
  );

  app.post(
    "/api/mirror/dashboard-summary",
    { schema: dashboardSummaryRouteSchema },
    async (request) => {
      const body = request.body as DashboardSummaryRequestDto;

      return buildMirrorDashboardSummary(body);
    }
  );
};
