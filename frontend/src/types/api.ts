import type { User } from "./user";
import type { VoicePhase } from "./voice";
import type { WeatherData } from "./weather";

export type UsersResponse = {
  users: User[];
};

export type UserMutationResponse = {
  ok: boolean;
  user: User;
};

export type UserLanguageMutationRequest = {
  preferredLanguage: "en" | "zh";
};

export type VoiceCommandRequest = {
  transcript: string;
  phase: VoicePhase;
  userId: number | null;
  language?: string;
};

export type DashboardSummaryRequest = {
  weather: WeatherData;
  appointmentCount: number;
  language?: string;
};

export type DashboardSummaryResponse = {
  ok: boolean;
  summary: string;
};
