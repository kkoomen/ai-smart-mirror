import { prisma } from "./prisma.js";
import { env } from "../env.js";

const DEFAULT_LOCATION = "Amsterdam";
const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const weatherCacheClient = prisma as typeof prisma & {
  weatherCache: {
    findUnique(args: { where: { locationKey: string } }): Promise<{
      locationKey: string;
      location: string;
      payload: string;
      fetchedAt: Date;
    } | null>;
    upsert(args: {
      where: { locationKey: string };
      create: {
        locationKey: string;
        location: string;
        payload: string;
        fetchedAt: Date;
      };
      update: {
        location: string;
        payload: string;
        fetchedAt: Date;
      };
    }): Promise<unknown>;
  };
};

export type WeatherForecastItem = {
  label: string;
  temperatureC: number;
  condition: string;
  rainChancePct: number | null;
};

export type WeatherPayload = {
  location: string;
  updatedAt: string;
  current: {
    temperatureC: number;
    condition: string;
    feelsLikeC: number;
    humidity: number;
    windKph: number;
    rainChancePct: number | null;
  };
  forecast: WeatherForecastItem[];
  note: string;
};

type OpenWeatherCurrentResponse = {
  name?: string;
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
  };
  weather?: Array<{
    description?: string;
    main?: string;
  }>;
  wind?: {
    speed?: number;
  };
};

type OpenWeatherForecastResponse = {
  list?: Array<{
    dt_txt?: string;
    pop?: number;
    main?: {
      temp?: number;
    };
    weather?: Array<{
      description?: string;
      main?: string;
    }>;
  }>;
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeLocationKey = (value: string) => value.trim().toLowerCase() || DEFAULT_LOCATION.toLowerCase();

const describeRainChance = (rainChancePct: number | null) => {
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

const buildMockWeather = (location: string) => {
  const normalizedLocation = location.trim() || DEFAULT_LOCATION;
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

const parseCachedWeather = (payload: string) => {
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

const fetchOpenWeatherPayload = async (location: string): Promise<WeatherPayload | null> => {
  if (!env.openWeatherApiKey) {
    return null;
  }

  const query = encodeURIComponent(location.trim() || DEFAULT_LOCATION);
  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${env.openWeatherApiKey}&units=metric`
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${env.openWeatherApiKey}&units=metric`
    )
  ]);

  if (!currentResponse.ok || !forecastResponse.ok) {
    return null;
  }

  const currentData = (await currentResponse.json()) as OpenWeatherCurrentResponse;
  const forecastData = (await forecastResponse.json()) as OpenWeatherForecastResponse;

  const forecastItems = (forecastData.list ?? []).slice(0, 3).map((item, index) => {
    const rainChancePct = typeof item.pop === "number" ? Math.round(item.pop * 100) : null;
    return {
      label: formatForecastLabel(item.dt_txt, index),
      temperatureC: Math.round(item.main?.temp ?? currentData.main?.temp ?? 0),
      condition: item.weather?.[0]?.description ?? "Unknown",
      rainChancePct
    };
  });

  const rainChanceCandidates = forecastItems
    .map((item) => item.rainChancePct)
    .filter((value): value is number => typeof value === "number");
  const rainChancePct =
    rainChanceCandidates.length > 0 ? Math.max(...rainChanceCandidates) : null;

  const condition = currentData.weather?.[0]?.description ?? "Unknown";
  const temperatureC = Math.round(currentData.main?.temp ?? 0);
  const feelsLikeC = Math.round(currentData.main?.feels_like ?? temperatureC);
  const humidity = Math.round(currentData.main?.humidity ?? 0);
  const windKph = Math.round((currentData.wind?.speed ?? 0) * 3.6);

  return {
    location: toTitleCase(currentData.name ?? (location.trim() || DEFAULT_LOCATION)),
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

export const getWeatherForLocation = async (location?: string | null) => {
  const normalizedLocation = location?.trim() || DEFAULT_LOCATION;
  const locationKey = normalizeLocationKey(normalizedLocation);
  const cachedWeather = await weatherCacheClient.weatherCache.findUnique({
    where: { locationKey }
  });

  if (cachedWeather) {
    const cachedAge = Date.now() - cachedWeather.fetchedAt.getTime();

    if (cachedAge < WEATHER_CACHE_TTL_MS) {
      const parsed = parseCachedWeather(cachedWeather.payload);

      if (parsed) {
        return parsed;
      }
    }
  }

  const freshWeather = (await fetchOpenWeatherPayload(normalizedLocation)) ?? buildMockWeather(normalizedLocation);

  await weatherCacheClient.weatherCache.upsert({
    where: { locationKey },
    create: {
      locationKey,
      location: freshWeather.location,
      payload: JSON.stringify(freshWeather),
      fetchedAt: new Date()
    },
    update: {
      location: freshWeather.location,
      payload: JSON.stringify(freshWeather),
      fetchedAt: new Date()
    }
  });

  return freshWeather;
};

export const defaultWeatherLocation = DEFAULT_LOCATION;
