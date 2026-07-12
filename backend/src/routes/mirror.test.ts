import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorRoutes } from "./mirror.js";
import {
  buildMirrorDashboardSummary,
  registerMirrorUser
} from "../services/mirror-service.js";

vi.mock("../services/mirror-service.js", () => ({
  buildMirrorDashboardSummary: vi.fn(),
  registerMirrorUser: vi.fn()
}));

describe("mirrorRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user", async () => {
    vi.mocked(registerMirrorUser).mockResolvedValue({
      ok: true,
      user: {
        id: 1,
        name: "John",
        faceLabel: "face_john_123",
        faceDescriptor: "[0.1,0.2]",
        location: "Amsterdam",
        fromStation: "Hoogkarspel",
        toStation: "Alkmaar",
        preferredLanguage: "en",
        createdAt: new Date("2026-07-10T00:00:00.000Z")
      }
    });

    const app = Fastify();
    await app.register(mirrorRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/mirror/register-user",
      payload: {
        name: "John",
        faceDescriptor: "[0.1,0.2]",
        preferredLanguage: "en"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(registerMirrorUser).toHaveBeenCalledWith({
      name: "John",
      faceDescriptor: "[0.1,0.2]",
      preferredLanguage: "en"
    });

    await app.close();
  });

  it("returns dashboard summary", async () => {
    vi.mocked(buildMirrorDashboardSummary).mockResolvedValue({
      ok: true,
      summary: "Today is sunny and you have 3 appointments."
    });

    const app = Fastify();
    await app.register(mirrorRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/mirror/dashboard-summary",
      payload: {
        weather: {
          location: "Amsterdam",
          current: {
            temperatureC: 21,
            condition: "Sunny",
            rainChancePct: 10
          },
          forecast: []
        },
        appointmentCount: 3,
        language: "en"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      summary: "Today is sunny and you have 3 appointments."
    });

    await app.close();
  });
});
