export const DEFAULT_WEATHER_LOCATION = "Amsterdam";
export const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

export type OpenWeatherCurrentResponse = {
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

export type OpenWeatherForecastResponse = {
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
