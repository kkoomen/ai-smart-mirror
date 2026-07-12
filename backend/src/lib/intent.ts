import { classifyIntent } from "../ai/ai-client.js";

export type VoiceIntent =
  | "WAKE_MIRROR"
  | "SLEEP_MIRROR"
  | "START_REGISTRATION"
  | "CHANGE_LANGUAGE"
  | "SET_LANGUAGE_EN"
  | "SET_LANGUAGE_ZH"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "SHOW_WIDGET"
  | "GET_WEATHER"
  | "UNKNOWN";

export type VoicePhase =
  | "idle"
  | "waking"
  | "hello"
  | "name"
  | "nameConfirm"
  | "scan"
  | "changeLanguage"
  | "dashboard"
  | "unknown";
export type VoiceLanguage = "en" | "zh";

export type VoiceEntities = {
  name: string | null;
  date: string | null;
  widget: "agenda" | "transport" | null;
};

export type VoiceCommandResult = {
  intent: VoiceIntent;
  entities: VoiceEntities;
  response: string;
};

const VALID_INTENTS = new Set<VoiceIntent>([
  "WAKE_MIRROR",
  "SLEEP_MIRROR",
  "START_REGISTRATION",
  "CHANGE_LANGUAGE",
  "SET_LANGUAGE_EN",
  "SET_LANGUAGE_ZH",
  "PROVIDE_NAME",
  "CONFIRM_YES",
  "CONFIRM_NO",
  "SHOW_WIDGET",
  "GET_WEATHER",
  "UNKNOWN"
]);

const VALID_WIDGETS = new Set<NonNullable<VoiceEntities["widget"]>>(["agenda", "transport"]);

const normalizeLanguage = (value: string | undefined | null): VoiceLanguage => {
  if (!value) {
    return "en";
  }

  return value.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
};

const buildResult = (
  intent: VoiceIntent,
  response: string,
  entities: VoiceEntities = { name: null, date: null, widget: null }
): VoiceCommandResult => ({
  intent,
  entities,
  response
});

const buildIntentResponse = (
  intent: VoiceIntent,
  language: VoiceLanguage,
  name?: string | null
) => {
  const responses = {
    en: {
      WAKE_MIRROR: "Waking mirror.",
      SLEEP_MIRROR: "Going idle.",
      START_REGISTRATION: "Starting registration.",
      CHANGE_LANGUAGE: "Opening language change.",
      SET_LANGUAGE_EN: "Switching to English.",
      SET_LANGUAGE_ZH: "Switching to Mandarin.",
      PROVIDE_NAME: name ? `Captured name ${name}.` : "Name captured.",
      CONFIRM_YES: "Confirmed.",
      CONFIRM_NO: "Trying again.",
      SHOW_WIDGET: "Showing widget.",
      GET_WEATHER: "Showing weather.",
      UNKNOWN: "I didn't understand that."
    },
    zh: {
      WAKE_MIRROR: "正在唤醒镜子。",
      SLEEP_MIRROR: "正在进入待机。",
      START_REGISTRATION: "开始注册。",
      CHANGE_LANGUAGE: "正在打开语言切换。",
      SET_LANGUAGE_EN: "切换到英语。",
      SET_LANGUAGE_ZH: "切换到普通话。",
      PROVIDE_NAME: name ? `已记录名字 ${name}。` : "已记录名字。",
      CONFIRM_YES: "已确认。",
      CONFIRM_NO: "重试中。",
      SHOW_WIDGET: "正在显示组件。",
      GET_WEATHER: "正在显示天气。",
      UNKNOWN: "我没听懂。"
    }
  } as const;

  return responses[language][intent];
};

export const parseClassifierResponse = (
  value: string,
  language: VoiceLanguage
): VoiceCommandResult | null => {
  const content = value
    .replace(/```[\s\S]*?\n/g, "")
    .replace(/```/g, "")
    .trim();

  if (!content) {
    return null;
  }

  const [rawIntent, rawName = ""] = content.split("|", 2).map((part) => part.trim());

  if (!VALID_INTENTS.has(rawIntent as VoiceIntent)) {
    return null;
  }

  const intent = rawIntent as VoiceIntent;
  const name = intent === "PROVIDE_NAME" && rawName.length > 0 ? rawName : null;
  const widget =
    intent === "SHOW_WIDGET" && VALID_WIDGETS.has(rawName as NonNullable<VoiceEntities["widget"]>)
      ? (rawName as NonNullable<VoiceEntities["widget"]>)
      : null;

  return buildResult(intent, buildIntentResponse(intent, language, name), {
    name,
    date: null,
    widget
  });
};

const requestAiIntent = async (params: {
  transcript: string;
  phase: VoicePhase;
  language: VoiceLanguage;
}): Promise<VoiceCommandResult | null> => {
  try {
    const content = await classifyIntent({
      transcript: params.transcript,
      phase: params.phase,
      language: params.language
    });

    if (!content) {
      return null;
    }

    return parseClassifierResponse(content, params.language);
  } catch {
    return null;
  }
};

const inferLocalWidgetCommand = (transcript: string, language: VoiceLanguage) => {
  const normalized = transcript.trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized === "show my agenda") {
    return buildResult("SHOW_WIDGET", buildIntentResponse("SHOW_WIDGET", language), {
      name: null,
      date: null,
      widget: "agenda"
    });
  }

  if (
    normalized === "show my public transport info" ||
    normalized === "show my transport info" ||
    normalized === "show my commute info"
  ) {
    return buildResult("SHOW_WIDGET", buildIntentResponse("SHOW_WIDGET", language), {
      name: null,
      date: null,
      widget: "transport"
    });
  }

  return null;
};

export const inferVoiceCommand = async (params: {
  transcript: string;
  phase: VoicePhase;
  language?: string | null;
}): Promise<VoiceCommandResult> => {
  const language = normalizeLanguage(params.language);
  const result = await requestAiIntent({
    transcript: params.transcript,
    phase: params.phase,
    language
  });

  if (result) {
    return result;
  }

  const localWidgetCommand = inferLocalWidgetCommand(params.transcript, language);
  if (localWidgetCommand) {
    return localWidgetCommand;
  }

  return buildResult("UNKNOWN", buildIntentResponse("UNKNOWN", language));
};
