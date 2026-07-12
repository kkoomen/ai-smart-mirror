import { inferVoiceCommand, type VoicePhase } from "../lib/intent.js";
import { isString } from "../lib/validation.js";

export type HandleVoiceCommandInput = {
  transcript?: unknown;
  phase?: unknown;
  userId?: unknown;
  language?: unknown;
  acceptLanguage?: unknown;
};

export type VoiceCommandValidationError = {
  ok: false;
  statusCode: 400;
  error: string;
};

export type VoiceCommandSuccess = {
  ok: true;
  intent: string;
  name: string | null;
  widget: string | null;
  entities: unknown;
  response: string;
};

const isVoicePhase = (value: string): value is VoicePhase => {
  return (
    value === "idle" ||
    value === "waking" ||
    value === "hello" ||
    value === "name" ||
    value === "nameConfirm" ||
    value === "scan" ||
    value === "changeLanguage" ||
    value === "dashboard" ||
    value === "unknown"
  );
};

const normalizeLanguage = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const lowerCased = value.trim().toLowerCase();
  if (lowerCased.startsWith("zh")) {
    return "zh";
  }

  if (lowerCased.startsWith("en")) {
    return "en";
  }

  return null;
};

export const handleVoiceCommand = async (
  input: HandleVoiceCommandInput
): Promise<VoiceCommandValidationError | VoiceCommandSuccess> => {
  if (!isString(input.transcript) || input.transcript.trim().length === 0) {
    return {
      ok: false,
      statusCode: 400,
      error: "transcript is required"
    };
  }

  const transcript = input.transcript.trim();
  const phaseValue = isString(input.phase) ? input.phase.trim() : "";
  const phase = isVoicePhase(phaseValue) ? phaseValue : "dashboard";
  const language =
    normalizeLanguage(input.language) ?? normalizeLanguage(input.acceptLanguage) ?? "en";
  const result = await inferVoiceCommand({
    transcript,
    phase,
    language
  });

  return {
    ok: true,
    intent: result.intent,
    name: result.entities.name,
    widget: result.entities.widget,
    entities: result.entities,
    response: result.response
  };
};
