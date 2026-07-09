import { env } from "../env.js";

export type VoiceIntent =
  | "START_REGISTRATION"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "GET_AGENDA"
  | "GET_WEATHER"
  | "GET_TIME"
  | "UNKNOWN";

export type VoicePhase = "start" | "name" | "nameConfirm" | "scan" | "confirm" | "dashboard";
export type VoiceLanguage = "en" | "zh";

export type VoiceEntities = {
  name: string | null;
  date: string | null;
};

export type VoiceCommandResult = {
  intent: VoiceIntent;
  entities: VoiceEntities;
  response: string;
};

const VALID_INTENTS = new Set<VoiceIntent>([
  "START_REGISTRATION",
  "PROVIDE_NAME",
  "CONFIRM_YES",
  "CONFIRM_NO",
  "GET_AGENDA",
  "GET_WEATHER",
  "GET_TIME",
  "UNKNOWN"
]);

const lowered = (value: string) => value.trim().toLowerCase();

const normalizeLanguage = (value: string | undefined | null): VoiceLanguage => {
  if (!value) {
    return "en";
  }

  const lowerCased = value.trim().toLowerCase();
  if (lowerCased.startsWith("zh")) {
    return "zh";
  }

  return "en";
};

const languagePhrases = {
  en: {
    startRegistration: ["start registration"],
    yes: ["yes", "confirm", "okay", "ok", "sure", "yeah", "yep"],
    no: ["no", "try again", "retry"],
    agenda: ["what do i have today", "agenda", "schedule"],
    weather: ["weather", "umbrella"],
    time: ["what time is it", "time"],
    umbrella: ["umbrella"],
    name: /(?:my name is|i am|i'm|im)\s+(.+)/i
  },
  zh: {
    startRegistration: ["开始注册", "开始登记", "注册"],
    yes: ["是", "对", "确认", "好的", "可以", "是的"],
    no: ["否", "不", "不是", "不对", "重试", "再来一次", "不要"],
    agenda: ["我今天有什么安排", "今天日程", "日程", "行程"],
    weather: ["天气", "下雨", "雨", "要带伞"],
    time: ["几点", "时间"],
    umbrella: ["带伞", "雨伞"],
    name: /(?:我叫|我的名字是|我名字叫)\s*(.+)/i
  }
} as const;

const extractName = (transcript: string) => {
  const text = transcript.trim();
  const match = text.match(/(?:my name is|i am|i'm|im)\s+(.+)/i);

  if (match?.[1]) {
    return match[1].trim();
  }

  if (text.length > 0 && text.length <= 40) {
    return text;
  }

  return null;
};

const extractLocalizedName = (transcript: string, language: VoiceLanguage) => {
  const text = transcript.trim();
  const match = text.match(languagePhrases[language].name);

  if (match?.[1]) {
    return match[1].trim();
  }

  return extractName(transcript);
};

const extractDate = (text: string) => {
  if (text.includes("tomorrow") || text.includes("明天")) {
    return "tomorrow";
  }

  if (text.includes("today") || text.includes("今天")) {
    return "today";
  }

  return null;
};

const buildResult = (
  intent: VoiceIntent,
  response: string,
  entities: VoiceEntities = { name: null, date: null }
): VoiceCommandResult => ({
  intent,
  entities,
  response
});

const ruleBasedInferVoiceCommand = (params: {
  transcript: string;
  phase: VoicePhase;
  language: VoiceLanguage;
}): VoiceCommandResult => {
  const { transcript, phase, language } = params;
  const text = lowered(transcript);
  const phrases = languagePhrases[language];

  if (phrases.startRegistration.some((phrase) => text.includes(phrase))) {
    return buildResult(
      "START_REGISTRATION",
      language === "zh" ? "开始注册。" : "Starting registration."
    );
  }

  if (phrases.yes.some((phrase) => text === phrase || text.includes(phrase))) {
    return buildResult("CONFIRM_YES", language === "zh" ? "已确认。" : "Confirmed.");
  }

  if (phrases.no.some((phrase) => text === phrase || text.includes(phrase))) {
    return buildResult("CONFIRM_NO", language === "zh" ? "重试中。" : "Trying again.");
  }

  if (phrases.agenda.some((phrase) => text.includes(phrase))) {
    return buildResult(
      "GET_AGENDA",
      language === "zh" ? "正在显示今天的日程。" : "Showing today's agenda.",
      {
        name: null,
        date: extractDate(text)
      }
    );
  }

  if (phrases.weather.some((phrase) => text.includes(phrase))) {
    return buildResult(
      "GET_WEATHER",
      phrases.umbrella.some((phrase) => text.includes(phrase))
        ? language === "zh"
          ? "正在检查是否需要带伞。"
          : "Checking whether you need an umbrella."
        : language === "zh"
          ? "正在显示天气。"
          : "Showing the weather.",
      {
        name: null,
        date: extractDate(text)
      }
    );
  }

  if (phrases.time.some((phrase) => text.includes(phrase))) {
    return buildResult(
      "GET_TIME",
      language === "zh" ? "正在显示当前时间。" : "Showing the current time."
    );
  }

  if (phase === "name") {
    const name = extractLocalizedName(transcript, language);
    if (name) {
      return buildResult("PROVIDE_NAME", language === "zh" ? `已记录名字 ${name}。` : `Captured name ${name}.`, {
        name,
        date: null
      });
    }
  }

  return buildResult("UNKNOWN", "I didn't understand that.");
};

const validateOpenAiResult = (value: unknown): VoiceCommandResult | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    intent?: unknown;
    entities?: unknown;
    response?: unknown;
  };

  if (typeof candidate.intent !== "string" || !VALID_INTENTS.has(candidate.intent as VoiceIntent)) {
    return null;
  }

  if (typeof candidate.response !== "string" || candidate.response.trim().length === 0) {
    return null;
  }

  if (candidate.response.trim().length > 120) {
    return null;
  }

  const entitiesValue = candidate.entities;
  let name: string | null = null;
  let date: string | null = null;

  if (entitiesValue && typeof entitiesValue === "object") {
    const entities = entitiesValue as { name?: unknown; date?: unknown };

    if (entities.name === null || typeof entities.name === "string") {
      name = entities.name?.trim?.() ? entities.name.trim() : null;
    } else {
      return null;
    }

    if (entities.date === null || typeof entities.date === "string") {
      date = entities.date?.trim?.() ? entities.date.trim() : null;
    } else {
      return null;
    }
  } else {
    return null;
  }

  return buildResult(candidate.intent as VoiceIntent, candidate.response.trim(), {
    name,
    date
  });
};

const requestOpenAiIntent = async (params: {
  transcript: string;
  phase: VoicePhase;
  language: VoiceLanguage;
}): Promise<VoiceCommandResult | null> => {
  if (!env.openAiApiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openAiModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You route smart-mirror voice commands. Return JSON only with keys intent, entities, response. " +
              "Intent must be one of START_REGISTRATION, PROVIDE_NAME, CONFIRM_YES, CONFIRM_NO, GET_AGENDA, GET_WEATHER, GET_TIME, UNKNOWN. " +
              "entities must contain name and date, each null or a string. Keep response short and mirror-style. " +
              `Respond in ${params.language === "zh" ? "Mandarin" : "English"}.`
          },
          {
            role: "user",
            content: JSON.stringify({
              transcript: params.transcript,
              phase: params.phase,
              language: params.language
            })
          }
        ]
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

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as unknown;
    return validateOpenAiResult(parsed);
  } catch {
    return null;
  }
};

export const inferVoiceCommand = async (params: {
  transcript: string;
  phase: VoicePhase;
  language?: string | null;
}): Promise<VoiceCommandResult> => {
  const language = normalizeLanguage(params.language);
  const openAiResult = await requestOpenAiIntent({
    transcript: params.transcript,
    phase: params.phase,
    language
  });

  if (openAiResult) {
    return openAiResult;
  }

  return ruleBasedInferVoiceCommand({
    transcript: params.transcript,
    phase: params.phase,
    language
  });
};
