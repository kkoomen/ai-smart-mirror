import { env } from "../env.js";

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

const requestDeepSeekSummary = async (params: {
  language: "en" | "zh";
  bucket: DashboardSummaryBucket;
  averageTemperatureC: number;
  appointmentCount: number;
}): Promise<string> => {
  if (!env.deepSeekApiKey) {
    throw new Error("DEEPSEEK_API_KEY is required");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.deepSeekApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.deepSeekModel,
      temperature: 0.2,
      max_tokens: 48,
      messages: [
        {
          role: "system",
          content:
            "You write one short mirror-friendly weather summary. " +
            "Return exactly one sentence and nothing else. " +
            "Only use the supplied facts. " +
            "Mention the weather bucket, average temperature, and appointment count. " +
            "For English, always say exactly 'you have N appointments'. " +
            "For Mandarin Chinese, always say exactly '今天您有N个约会'. " +
            "Do not add any extra weather details. " +
            `Reply in ${params.language === "zh" ? "Mandarin Chinese" : "English"}.`
        },
        {
          role: "user",
          content: JSON.stringify({
            weatherBucket: params.bucket,
            averageTemperatureC: params.averageTemperatureC,
            appointmentCount: params.appointmentCount
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek summary request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek summary response was empty");
  }

  return cleanSummary(content);
};

export const generateDashboardSummary = async (params: DashboardSummaryRequest) => {
  const language = normalizeLanguage(params.language);
  const bucket = classifyWeather(params.weather);
  const averageTemperatureC = averageTemperature(params.weather);
  const summary = await requestDeepSeekSummary({
    language,
    bucket,
    averageTemperatureC,
    appointmentCount: params.appointmentCount
  });

  return {
    summary
  } satisfies DashboardSummaryResponse;
};
