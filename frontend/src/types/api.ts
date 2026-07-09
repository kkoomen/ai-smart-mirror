import type { User } from "./user";
import type { MirrorPhase } from "./mirror-phase";
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
  phase: MirrorPhase;
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
