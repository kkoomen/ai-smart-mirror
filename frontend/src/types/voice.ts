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
  | "WAKE_MIRROR"
  | "SLEEP_MIRROR"
  | "START_REGISTRATION"
  | "CHANGE_LANGUAGE"
  | "SET_LANGUAGE_EN"
  | "SET_LANGUAGE_ZH"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "GET_AGENDA"
  | "GET_WEATHER"
  | "UNKNOWN";

export type VoiceCommandResponse = {
  ok: true;
  intent: VoiceIntent;
  name: string | null;
  response: string;
};
