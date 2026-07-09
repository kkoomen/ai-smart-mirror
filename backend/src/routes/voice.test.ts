import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { voiceRoutes } from "./voice.js";
import { handleVoiceCommand } from "../services/voice-command-service.js";

vi.mock("../services/voice-command-service.js", () => ({
  handleVoiceCommand: vi.fn()
}));

describe("voiceRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns classified voice command payload", async () => {
    vi.mocked(handleVoiceCommand).mockResolvedValue({
      ok: true,
      command: { id: 1 },
      intent: "GET_WEATHER",
      name: null,
      entities: { name: null, date: null },
      response: "Showing weather."
    });

    const app = Fastify();
    await app.register(voiceRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/command",
      payload: {
        transcript: "what's the weather",
        phase: "dashboard",
        userId: 1,
        language: "en"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      intent: "GET_WEATHER",
      response: "Showing weather."
    });
    expect(handleVoiceCommand).toHaveBeenCalledOnce();

    await app.close();
  });

  it("rejects invalid payloads before calling the service", async () => {
    const app = Fastify();
    await app.register(voiceRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/command",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(handleVoiceCommand).not.toHaveBeenCalled();

    await app.close();
  });

  it("maps service validation errors to HTTP status codes", async () => {
    vi.mocked(handleVoiceCommand).mockResolvedValue({
      ok: false,
      statusCode: 400,
      error: "transcript is required"
    });

    const app = Fastify();
    await app.register(voiceRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/voice/command",
      payload: {
        transcript: "hello mirror"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      error: "transcript is required"
    });

    await app.close();
  });
});
