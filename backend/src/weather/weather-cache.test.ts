import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, upsertMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn()
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    weatherCache: {
      findUnique: findUniqueMock,
      upsert: upsertMock
    }
  }
}));

import { getCachedWeather, cacheWeather } from "./weather-cache.js";
import { WEATHER_CACHE_TTL_MS } from "./types.js";

describe("weather cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached weather when entry is fresh", async () => {
    findUniqueMock.mockResolvedValue({
      locationKey: "amsterdam",
      location: "Amsterdam",
      payload: JSON.stringify({
        location: "Amsterdam",
        updatedAt: "2026-07-10T00:00:00.000Z",
        current: {
          temperatureC: 20,
          condition: "Sunny",
          feelsLikeC: 20,
          humidity: 50,
          windKph: 10,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      }),
      fetchedAt: new Date(Date.now() - 1_000)
    });

    const result = await getCachedWeather("amsterdam");

    expect(result?.location).toBe("Amsterdam");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { locationKey: "amsterdam" }
    });
  });

  it("returns null when cache entry is expired", async () => {
    findUniqueMock.mockResolvedValue({
      locationKey: "amsterdam",
      location: "Amsterdam",
      payload: "{}",
      fetchedAt: new Date(Date.now() - WEATHER_CACHE_TTL_MS - 1)
    });

    await expect(getCachedWeather("amsterdam")).resolves.toBeNull();
  });

  it("returns null when cached payload is invalid", async () => {
    findUniqueMock.mockResolvedValue({
      locationKey: "amsterdam",
      location: "Amsterdam",
      payload: "{bad-json",
      fetchedAt: new Date()
    });

    await expect(getCachedWeather("amsterdam")).resolves.toBeNull();
  });

  it("upserts cached weather payloads", async () => {
    await cacheWeather({
      locationKey: "amsterdam",
      weather: {
        location: "Amsterdam",
        updatedAt: "2026-07-10T00:00:00.000Z",
        current: {
          temperatureC: 20,
          condition: "Sunny",
          feelsLikeC: 20,
          humidity: 50,
          windKph: 10,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      }
    });

    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock.mock.calls[0]?.[0]).toMatchObject({
      where: { locationKey: "amsterdam" },
      create: {
        locationKey: "amsterdam",
        location: "Amsterdam"
      },
      update: {
        location: "Amsterdam"
      }
    });
  });
});
