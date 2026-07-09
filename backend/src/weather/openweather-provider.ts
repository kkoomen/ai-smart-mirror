import { env } from "../env.js";
import {
  DEFAULT_WEATHER_LOCATION,
  type OpenWeatherCurrentResponse,
  type OpenWeatherForecastResponse,
  type WeatherPayload
} from "./types.js";
import { normalizeOpenWeatherPayload } from "./normalize-weather.js";

export const fetchOpenWeatherPayload = async (location: string): Promise<WeatherPayload | null> => {
  if (!env.openWeatherApiKey) {
    return null;
  }

  const query = encodeURIComponent(location.trim() || DEFAULT_WEATHER_LOCATION);
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

  return normalizeOpenWeatherPayload({
    location,
    currentData,
    forecastData
  });
};
