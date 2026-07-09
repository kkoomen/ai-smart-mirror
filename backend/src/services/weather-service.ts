import { getWeatherForLocation } from "../lib/weather.js";

export const getWeather = async (location?: string) => {
  return {
    weather: await getWeatherForLocation(location)
  };
};
