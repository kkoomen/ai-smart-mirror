import { buildMockWeather } from "../weather/mock-weather-provider.js";
import { normalizeLocationKey } from "../weather/normalize-weather.js";
import { fetchOpenWeatherPayload } from "../weather/openweather-provider.js";
import { cacheWeather, getCachedWeather } from "../weather/weather-cache.js";
import { DEFAULT_WEATHER_LOCATION } from "../weather/types.js";

export type { WeatherForecastItem, WeatherPayload } from "../weather/types.js";

export const getWeatherForLocation = async (location?: string | null) => {
  const normalizedLocation = location?.trim() || DEFAULT_WEATHER_LOCATION;
  const locationKey = normalizeLocationKey(normalizedLocation);
  const cachedWeather = await getCachedWeather(locationKey);

  if (cachedWeather) {
    return cachedWeather;
  }

  const freshWeather =
    (await fetchOpenWeatherPayload(normalizedLocation)) ?? buildMockWeather(normalizedLocation);

  await cacheWeather({
    locationKey,
    weather: freshWeather
  });

  return freshWeather;
};

export const defaultWeatherLocation = DEFAULT_WEATHER_LOCATION;
