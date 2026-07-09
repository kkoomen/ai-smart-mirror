import type { AgendaResponse } from "../types/agenda";
import type {
  UserLanguageMutationRequest,
  UserMutationResponse,
  UsersResponse
} from "../types/api";
import { requestJson } from "../utils/request-json";

export const getUsers = () => requestJson<UsersResponse>("/api/users");

export const getUserAgendaToday = (userId: number) =>
  requestJson<AgendaResponse>(`/api/users/${userId}/agenda/today`);

export const updateUserLanguage = (userId: number, payload: UserLanguageMutationRequest) =>
  requestJson<UserMutationResponse>(`/api/users/${userId}/language`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
