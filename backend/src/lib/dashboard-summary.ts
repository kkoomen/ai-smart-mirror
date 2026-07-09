import { generateDashboardSummaryText } from "../ai/ai-client.js";

export type DashboardSummaryWeather = {
  location: string;
  current: {
    temperatureC: number;
    condition: string;
    rainChancePct: number | null;
  };
  forecast: Array<{
    temperatureC: number;
    condition: string;
    rainChancePct: number | null;
  }>;
};

export type DashboardSummaryRequest = {
  weather: DashboardSummaryWeather;
  appointmentCount: number;
  language?: string | null;
};

export type DashboardSummaryResponse = {
  summary: string;
};

export type DashboardSummaryBucket = "sunny" | "rainy" | "cloudy";

const normalizeLanguage = (value?: string | null) =>
  value?.trim().toLowerCase().startsWith("zh") ? "zh" : "en";

const classifyWeather = (value: DashboardSummaryWeather): DashboardSummaryBucket => {
  const conditions = [value.current.condition, ...value.forecast.map((item) => item.condition)]
    .join(" ")
    .toLowerCase();

  if (
    conditions.includes("rain") ||
    conditions.includes("shower") ||
    conditions.includes("drizzle") ||
    conditions.includes("storm") ||
    (value.current.rainChancePct !== null && value.current.rainChancePct >= 50)
  ) {
    return "rainy";
  }

  if (
    conditions.includes("cloud") ||
    conditions.includes("overcast") ||
    conditions.includes("fog") ||
    conditions.includes("mist")
  ) {
    return "cloudy";
  }

  return "sunny";
};

const averageTemperature = (value: DashboardSummaryWeather) => {
  const temperatures = [value.current.temperatureC, ...value.forecast.map((item) => item.temperatureC)];

  if (temperatures.length === 0) {
    return 0;
  }

  return Math.round(temperatures.reduce((sum, temperature) => sum + temperature, 0) / temperatures.length);
};

const cleanSummary = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const requestAiSummary = async (params: {
  language: "en" | "zh";
  bucket: DashboardSummaryBucket;
  averageTemperatureC: number;
  appointmentCount: number;
}): Promise<string> => {
  const content = await generateDashboardSummaryText({
    language: params.language,
    bucket: params.bucket,
    averageTemperatureC: params.averageTemperatureC,
    appointmentCount: params.appointmentCount
  });

  if (!content) {
    throw new Error("AI summary response was empty");
  }

  return cleanSummary(content);
};

export const generateDashboardSummary = async (params: DashboardSummaryRequest) => {
  const language = normalizeLanguage(params.language);
  const bucket = classifyWeather(params.weather);
  const averageTemperatureC = averageTemperature(params.weather);
  const summary = await requestAiSummary({
    language,
    bucket,
    averageTemperatureC,
    appointmentCount: params.appointmentCount
  });

  return {
    summary
  } satisfies DashboardSummaryResponse;
};
