import { prisma } from "../lib/prisma.js";
import { parseCachedWeather } from "./normalize-weather.js";
import { WEATHER_CACHE_TTL_MS, type WeatherPayload } from "./types.js";

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

export const getCachedWeather = async (locationKey: string) => {
  const cachedWeather = await weatherCacheClient.weatherCache.findUnique({
    where: { locationKey }
  });

  if (!cachedWeather) {
    return null;
  }

  const cachedAge = Date.now() - cachedWeather.fetchedAt.getTime();
  if (cachedAge >= WEATHER_CACHE_TTL_MS) {
    return null;
  }

  return parseCachedWeather(cachedWeather.payload);
};

export const cacheWeather = async (params: {
  locationKey: string;
  weather: WeatherPayload;
}) => {
  const fetchedAt = new Date();

  await weatherCacheClient.weatherCache.upsert({
    where: { locationKey: params.locationKey },
    create: {
      locationKey: params.locationKey,
      location: params.weather.location,
      payload: JSON.stringify(params.weather),
      fetchedAt
    },
    update: {
      location: params.weather.location,
      payload: JSON.stringify(params.weather),
      fetchedAt
    }
  });
};
