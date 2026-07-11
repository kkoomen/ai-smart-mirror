import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorRoutes } from "./mirror.js";
import {
  buildMirrorDashboardSummary,
  getMirrorStateSnapshot,
  registerMirrorUser,
  startMirrorRegistration
} from "../services/mirror-service.js";

vi.mock("../services/mirror-service.js", () => ({
  buildMirrorDashboardSummary: vi.fn(),
  getMirrorStateSnapshot: vi.fn(),
  registerMirrorUser: vi.fn(),
  startMirrorRegistration: vi.fn()
}));

describe("mirrorRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mirror state snapshot", async () => {
    vi.mocked(getMirrorStateSnapshot).mockResolvedValue({
      mode: "recognized",
      registrationComplete: true,
      userCount: 1,
      activeUser: null
    });

    const app = Fastify();
    await app.register(mirrorRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/mirror/state"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: "recognized",
      registrationComplete: true,
      userCount: 1
    });

    await app.close();
  });

  it("starts registration", async () => {
    vi.mocked(startMirrorRegistration).mockResolvedValue({
      ok: true,
      state: {
        id: 1,
        activeUserId: null,
        registrationComplete: false
      }
    });

    const app = Fastify();
    await app.register(mirrorRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/mirror/start-registration",
      payload: {}
    });

    expect(response.statusCode).toBe(200);
    expect(startMirrorRegistration).toHaveBeenCalledOnce();

    await app.close();
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
      },
      state: {
        id: 1,
        activeUserId: 1,
        registrationComplete: true
      },
      mode: "recognized"
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
