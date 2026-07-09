import {
  DEFAULT_WEATHER_LOCATION,
  type OpenWeatherCurrentResponse,
  type OpenWeatherForecastResponse,
  type WeatherPayload
} from "./types.js";

export const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const normalizeLocationKey = (value: string) =>
  value.trim().toLowerCase() || DEFAULT_WEATHER_LOCATION.toLowerCase();

export const describeRainChance = (rainChancePct: number | null) => {
  if (rainChancePct === null) {
    return "No rain chance available";
  }

  if (rainChancePct >= 70) {
    return `High rain chance at ${rainChancePct}%`;
  }

  if (rainChancePct >= 35) {
    return `Possible rain at ${rainChancePct}%`;
  }

  return `Rain chance ${rainChancePct}%`;
};

export const parseCachedWeather = (payload: string) => {
  try {
    const parsed = JSON.parse(payload) as WeatherPayload;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const formatForecastLabel = (dtText: string | undefined, index: number) => {
  if (!dtText) {
    return index === 0 ? "Now" : `+${index * 3}h`;
  }

  const date = new Date(dtText);
  if (Number.isNaN(date.getTime())) {
    return index === 0 ? "Now" : `+${index * 3}h`;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const normalizeOpenWeatherPayload = (params: {
  location: string;
  currentData: OpenWeatherCurrentResponse;
  forecastData: OpenWeatherForecastResponse;
}): WeatherPayload => {
  const forecastItems = (params.forecastData.list ?? []).slice(0, 3).map((item, index) => {
    const rainChancePct = typeof item.pop === "number" ? Math.round(item.pop * 100) : null;
    return {
      label: formatForecastLabel(item.dt_txt, index),
      temperatureC: Math.round(item.main?.temp ?? params.currentData.main?.temp ?? 0),
      condition: item.weather?.[0]?.description ?? "Unknown",
      rainChancePct
    };
  });

  const rainChanceCandidates = forecastItems
    .map((item) => item.rainChancePct)
    .filter((value): value is number => typeof value === "number");
  const rainChancePct = rainChanceCandidates.length > 0 ? Math.max(...rainChanceCandidates) : null;

  const condition = params.currentData.weather?.[0]?.description ?? "Unknown";
  const temperatureC = Math.round(params.currentData.main?.temp ?? 0);
  const feelsLikeC = Math.round(params.currentData.main?.feels_like ?? temperatureC);
  const humidity = Math.round(params.currentData.main?.humidity ?? 0);
  const windKph = Math.round((params.currentData.wind?.speed ?? 0) * 3.6);

  return {
    location: toTitleCase(
      params.currentData.name ?? (params.location.trim() || DEFAULT_WEATHER_LOCATION)
    ),
    updatedAt: new Date().toISOString(),
    current: {
      temperatureC,
      condition: toTitleCase(condition),
      feelsLikeC,
      humidity,
      windKph,
      rainChancePct
    },
    forecast:
      forecastItems.length > 0
        ? forecastItems
        : [
            {
              label: "Now",
              temperatureC,
              condition: toTitleCase(condition),
              rainChancePct
            }
          ],
    note: describeRainChance(rainChancePct)
  };
};
