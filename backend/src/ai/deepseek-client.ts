import { env } from "../env.js";
import type {
  ChatMessage,
  DashboardSummaryGenerationParams,
  IntentClassificationParams
} from "./types.js";

const requestDeepSeekChat = async (params: {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}) => {
  if (!env.deepSeekApiKey) {
    return null;
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.deepSeekApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.deepSeekModel,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      messages: params.messages
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content ?? null;
};

export const classifyIntentWithDeepSeek = async (params: IntentClassificationParams) => {
  return requestDeepSeekChat({
    temperature: 0,
    maxTokens: 24,
    messages: [
      {
        role: "system",
        content:
          "You are an intent classifier for a smart mirror. " +
          "Reply with exactly one line and nothing else. " +
          "Allowed intents: WAKE_MIRROR, SLEEP_MIRROR, START_REGISTRATION, CHANGE_LANGUAGE, SET_LANGUAGE_EN, SET_LANGUAGE_ZH, PROVIDE_NAME, CONFIRM_YES, CONFIRM_NO, GET_AGENDA, GET_WEATHER, UNKNOWN. " +
          "For most inputs reply with only the INTENT. " +
          "If and only if the intent is PROVIDE_NAME, reply as PROVIDE_NAME|<name>. " +
          "If uncertain, reply UNKNOWN. " +
          "WAKE_MIRROR is allowed only for explicit mirror wake phrases like hello mirror, hey mirror, or hi mirror. " +
          "SLEEP_MIRROR is allowed only for explicit mirror sleep phrases like goodbye mirror or bye mirror. " +
          "Do not classify plain hello, hey, hi, goodbye, or bye without the word mirror as wake or sleep. " +
          "Examples: " +
          "hello mirror -> WAKE_MIRROR. " +
          "hey mirror -> WAKE_MIRROR. " +
          "hi mirror -> WAKE_MIRROR. " +
          "goodbye mirror -> SLEEP_MIRROR. " +
          "bye mirror -> SLEEP_MIRROR. " +
          "hello -> UNKNOWN. " +
          "hi -> UNKNOWN. " +
          "bye -> UNKNOWN. " +
          "change language -> CHANGE_LANGUAGE. " +
          "English -> SET_LANGUAGE_EN. " +
          "Mandarin -> SET_LANGUAGE_ZH. " +
          "Chinese -> SET_LANGUAGE_ZH. " +
          "英语 -> SET_LANGUAGE_EN. " +
          "普通话 -> SET_LANGUAGE_ZH. " +
          `The user's spoken language is ${params.language === "zh" ? "Mandarin Chinese" : "English"}.`
      },
      {
        role: "user",
        content: JSON.stringify({
          phase: params.phase,
          transcript: params.transcript
        })
      }
    ]
  });
};

export const generateDashboardSummaryWithDeepSeek = async (
  params: DashboardSummaryGenerationParams
) => {
  return requestDeepSeekChat({
    temperature: 0.2,
    maxTokens: 48,
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
  });
};
