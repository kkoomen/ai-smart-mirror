export type WeatherData = {
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
  forecast: Array<{
    label: string;
    temperatureC: number;
    condition: string;
    rainChancePct: number | null;
  }>;
  note: string;
};

export type WeatherEnvelope = {
  weather: WeatherData;
};

export type WeatherResponse = {
  userId: number;
  weather: WeatherData;
};
