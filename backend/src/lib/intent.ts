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

const extractDate = (text: string) => {
  if (text.includes("tomorrow")) {
    return "tomorrow";
  }

  if (text.includes("today")) {
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
}): VoiceCommandResult => {
  const { transcript, phase } = params;
  const text = lowered(transcript);

  if (text.includes("start registration")) {
    return buildResult("START_REGISTRATION", "Starting registration.");
  }

  if (text === "yes" || text === "confirm" || text === "okay" || text === "ok") {
    return buildResult("CONFIRM_YES", "Confirmed.");
  }

  if (text === "no" || text === "try again" || text === "retry") {
    return buildResult("CONFIRM_NO", "Trying again.");
  }

  if (text.includes("what do i have today") || text.includes("agenda") || text.includes("schedule")) {
    return buildResult("GET_AGENDA", "Showing today's agenda.", {
      name: null,
      date: extractDate(text)
    });
  }

  if (text.includes("weather") || text.includes("umbrella")) {
    return buildResult(
      "GET_WEATHER",
      text.includes("umbrella") ? "Checking whether you need an umbrella." : "Showing the weather.",
      {
        name: null,
        date: extractDate(text)
      }
    );
  }

  if (text.includes("what time is it") || text.includes("time")) {
    return buildResult("GET_TIME", "Showing the current time.");
  }

  if (phase === "name") {
    const name = extractName(transcript);
    if (name) {
      return buildResult("PROVIDE_NAME", `Captured name ${name}.`, {
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
              "entities must contain name and date, each null or a string. Keep response short and mirror-style."
          },
          {
            role: "user",
            content: JSON.stringify({
              transcript: params.transcript,
              phase: params.phase
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
}): Promise<VoiceCommandResult> => {
  const openAiResult = await requestOpenAiIntent(params);

  if (openAiResult) {
    return openAiResult;
  }

  return ruleBasedInferVoiceCommand(params);
};
