import type { User } from "./user";
import type { VoicePhase } from "./voice";

export type UsersResponse = {
  users: User[];
};

export type UserMutationResponse = {
  ok: boolean;
  user: User;
};

export type VoiceCommandRequest = {
  transcript: string;
  phase: VoicePhase;
  userId: number | null;
};
