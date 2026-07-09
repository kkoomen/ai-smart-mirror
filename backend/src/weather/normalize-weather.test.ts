import { describe, expect, it } from "vitest";
import {
  describeRainChance,
  normalizeLocationKey,
  normalizeOpenWeatherPayload,
  parseCachedWeather
} from "./normalize-weather.js";

describe("weather normalization", () => {
  it("normalizes location keys", () => {
    expect(normalizeLocationKey(" Amsterdam ")).toBe("amsterdam");
    expect(normalizeLocationKey("")).toBe("amsterdam");
  });

  it("describes rain chance buckets", () => {
    expect(describeRainChance(null)).toBe("No rain chance available");
    expect(describeRainChance(20)).toBe("Rain chance 20%");
    expect(describeRainChance(50)).toBe("Possible rain at 50%");
    expect(describeRainChance(80)).toBe("High rain chance at 80%");
  });

  it("normalizes OpenWeather payloads into mirror weather data", () => {
    const payload = normalizeOpenWeatherPayload({
      location: "Amsterdam",
      currentData: {
        name: "amsterdam",
        main: {
          temp: 18.4,
          feels_like: 19.1,
          humidity: 58
        },
        weather: [{ description: "clear sky" }],
        wind: { speed: 3 }
      },
      forecastData: {
        list: [
          {
            dt_txt: "2026-07-09 12:00:00",
            pop: 0.6,
            main: { temp: 20.2 },
            weather: [{ description: "light rain" }]
          }
        ]
      }
    });

    expect(payload.location).toBe("Amsterdam");
    expect(payload.current.temperatureC).toBe(18);
    expect(payload.current.condition).toBe("Clear Sky");
    expect(payload.current.rainChancePct).toBe(60);
    expect(payload.current.windKph).toBe(11);
    expect(payload.forecast).toHaveLength(1);
    expect(payload.forecast[0]).toMatchObject({
      temperatureC: 20,
      condition: "light rain",
      rainChancePct: 60
    });
  });

  it("falls back to a synthetic forecast item when forecast list is empty", () => {
    const payload = normalizeOpenWeatherPayload({
      location: "Amsterdam",
      currentData: {
        name: "amsterdam",
        main: {
          temp: 18.4,
          feels_like: 19.1,
          humidity: 58
        },
        weather: [{ description: "clear sky" }],
        wind: { speed: 3 }
      },
      forecastData: {
        list: []
      }
    });

    expect(payload.forecast).toEqual([
      {
        label: "Now",
        temperatureC: 18,
        condition: "Clear Sky",
        rainChancePct: null
      }
    ]);
    expect(payload.note).toBe("No rain chance available");
  });

  it("parses valid cached weather payloads", () => {
    const cached = parseCachedWeather(
      JSON.stringify({
        location: "Amsterdam",
        updatedAt: "2026-07-10T00:00:00.000Z",
        current: {
          temperatureC: 21,
          condition: "Sunny",
          feelsLikeC: 21,
          humidity: 55,
          windKph: 8,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      })
    );

    expect(cached).not.toBeNull();
    expect(cached?.location).toBe("Amsterdam");
    expect(cached?.current.condition).toBe("Sunny");
  });

  it("returns null for invalid cached payload JSON", () => {
    expect(parseCachedWeather("{not-json")).toBeNull();
  });
});
