export type VoiceIntent =
  | "START_REGISTRATION"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "GET_AGENDA"
  | "GET_WEATHER"
  | "GET_TIME"
  | "UNKNOWN";

export type VoicePhase = "start" | "name" | "scan" | "confirm" | "dashboard";

export type VoiceCommandResult = {
  intent: VoiceIntent;
  name: string | null;
  response: string;
};

const lowered = (value: string) => value.trim().toLowerCase();

const extractName = (transcript: string) => {
  const text = transcript.trim();
  const match = text.match(/(?:my name is|i am|i'm|im)\s+(.+)/i);

  if (match?.[1]) {
    return match[1].trim();
  }

  if (text.length > 0) {
    return text;
  }

  return null;
};

export const inferVoiceCommand = (params: {
  transcript: string;
  phase: VoicePhase;
}): VoiceCommandResult => {
  const { transcript, phase } = params;
  const text = lowered(transcript);

  if (text.includes("start registration")) {
    return {
      intent: "START_REGISTRATION",
      name: null,
      response: "Starting registration."
    };
  }

  if (text === "yes" || text === "confirm" || text === "okay" || text === "ok") {
    return {
      intent: "CONFIRM_YES",
      name: null,
      response: "Confirmed."
    };
  }

  if (text === "no" || text === "try again" || text === "retry") {
    return {
      intent: "CONFIRM_NO",
      name: null,
      response: "Trying again."
    };
  }

  if (text.includes("what do i have today") || text.includes("agenda") || text.includes("schedule")) {
    return {
      intent: "GET_AGENDA",
      name: null,
      response: "Showing today's agenda."
    };
  }

  if (text.includes("weather")) {
    return {
      intent: "GET_WEATHER",
      name: null,
      response: "Showing the weather."
    };
  }

  if (text.includes("what time is it") || text.includes("time")) {
    return {
      intent: "GET_TIME",
      name: null,
      response: "Showing the current time."
    };
  }

  if (phase === "name") {
    const name = extractName(transcript);
    if (name) {
      return {
        intent: "PROVIDE_NAME",
        name,
        response: `Captured name ${name}.`
      };
    }
  }

  return {
    intent: "UNKNOWN",
    name: null,
    response: "I didn't understand that."
  };
};
