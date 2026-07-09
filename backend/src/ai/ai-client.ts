import {
  classifyIntentWithDeepSeek,
  generateDashboardSummaryWithDeepSeek
} from "./deepseek-client.js";
import type {
  DashboardSummaryGenerationParams,
  IntentClassificationParams
} from "./types.js";

export const classifyIntent = async (params: IntentClassificationParams) => {
  return classifyIntentWithDeepSeek(params);
};

export const generateDashboardSummaryText = async (
  params: DashboardSummaryGenerationParams
) => {
  return generateDashboardSummaryWithDeepSeek(params);
};
