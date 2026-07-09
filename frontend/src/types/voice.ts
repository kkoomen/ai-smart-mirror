export type VoicePhase =
  | "idle"
  | "waking"
  | "hello"
  | "name"
  | "nameConfirm"
  | "scan"
  | "confirm"
  | "changeLanguage"
  | "dashboard"
  | "unknown";

export type VoiceIntent =
  | "START_REGISTRATION"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "GET_AGENDA"
  | "GET_WEATHER"
  | "GET_TIME"
  | "UNKNOWN";

export type VoiceCommandResponse = {
  ok: true;
  intent: VoiceIntent;
  name: string | null;
  response: string;
};
