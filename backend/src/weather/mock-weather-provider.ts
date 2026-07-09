import { DEFAULT_WEATHER_LOCATION, type WeatherPayload } from "./types.js";
import { toTitleCase } from "./normalize-weather.js";

export const buildMockWeather = (location: string) => {
  const normalizedLocation = location.trim() || DEFAULT_WEATHER_LOCATION;
  const rainChancePct = normalizedLocation.toLowerCase().includes("amsterdam") ? 28 : 18;

  return {
    location: toTitleCase(normalizedLocation),
    updatedAt: new Date().toISOString(),
    current: {
      temperatureC: 18,
      condition: "Clear sky",
      feelsLikeC: 19,
      humidity: 58,
      windKph: 11,
      rainChancePct
    },
    forecast: [
      { label: "Now", temperatureC: 18, condition: "Clear", rainChancePct },
      { label: "12:00", temperatureC: 20, condition: "Sunny", rainChancePct: 12 },
      { label: "15:00", temperatureC: 21, condition: "Light breeze", rainChancePct: 10 }
    ],
    note: `Mirror weather for ${toTitleCase(normalizedLocation)}.`
  } satisfies WeatherPayload;
};
