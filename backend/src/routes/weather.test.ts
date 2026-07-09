import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { weatherRoutes } from "./weather.js";
import { getWeather } from "../services/weather-service.js";

vi.mock("../services/weather-service.js", () => ({
  getWeather: vi.fn()
}));

describe("weatherRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns weather for a trimmed location", async () => {
    vi.mocked(getWeather).mockResolvedValue({
      weather: {
        location: "Amsterdam",
        updatedAt: "2026-07-10T00:00:00.000Z",
        current: {
          temperatureC: 22,
          condition: "Sunny",
          feelsLikeC: 22,
          humidity: 50,
          windKph: 8,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      }
    });

    const app = Fastify();
    await app.register(weatherRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/weather?location=%20Amsterdam%20"
    });

    expect(response.statusCode).toBe(200);
    expect(getWeather).toHaveBeenCalledWith("Amsterdam");

    await app.close();
  });

  it("rejects blank location query values", async () => {
    const app = Fastify();
    await app.register(weatherRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/weather?location=%20%20"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      error: "location is required"
    });
    expect(getWeather).not.toHaveBeenCalled();

    await app.close();
  });

  it("uses default location when query is omitted", async () => {
    vi.mocked(getWeather).mockResolvedValue({
      weather: {
        location: "Amsterdam",
        updatedAt: "2026-07-10T00:00:00.000Z",
        current: {
          temperatureC: 22,
          condition: "Sunny",
          feelsLikeC: 22,
          humidity: 50,
          windKph: 8,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      }
    });

    const app = Fastify();
    await app.register(weatherRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/weather"
    });

    expect(response.statusCode).toBe(200);
    expect(getWeather).toHaveBeenCalledWith(undefined);

    await app.close();
  });
});
