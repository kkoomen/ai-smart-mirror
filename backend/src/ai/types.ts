export type AiLanguage = "en" | "zh";

export type IntentClassificationParams = {
  transcript: string;
  phase: string;
  language: AiLanguage;
};

export type DashboardSummaryGenerationParams = {
  language: AiLanguage;
  bucket: "sunny" | "rainy" | "cloudy";
  averageTemperatureC: number;
  appointmentCount: number;
};

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};
