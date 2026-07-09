import type { WeatherEnvelope } from "../types/weather";
import { requestJson } from "../utils/request-json";

export const getWeather = (location = "Amsterdam") =>
  requestJson<WeatherEnvelope>(
    `/api/weather?location=${encodeURIComponent(location || "Amsterdam")}`
  );
