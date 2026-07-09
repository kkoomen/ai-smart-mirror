import { inferVoiceCommand, type VoicePhase } from "../lib/intent.js";
import { prisma } from "../lib/prisma.js";
import { isString, parsePositiveInt } from "../lib/validation.js";

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
  command: unknown;
  intent: string;
  name: string | null;
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
    value === "confirm" ||
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

  const userId = parsePositiveInt(input.userId);
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

  if (result.intent === "START_REGISTRATION") {
    await prisma.mirrorState.upsert({
      where: { id: 1 },
      create: { registrationComplete: false },
      update: {
        activeUserId: null,
        registrationComplete: false
      }
    });
  }

  const log = await prisma.voiceCommandLog.create({
    data: {
      userId,
      transcript,
      intent: result.intent,
      response: result.response
    }
  });

  return {
    ok: true,
    command: log,
    intent: result.intent,
    name: result.entities.name,
    entities: result.entities,
    response: result.response
  };
};
