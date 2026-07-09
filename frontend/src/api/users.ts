import type { AgendaResponse } from "../types/agenda";
import type { UserLanguageMutationRequest, UserMutationResponse, UsersResponse } from "../types/api";
import type { WeatherResponse } from "../types/weather";
import { requestJson } from "../utils/request-json";

export const getUsers = () => requestJson<UsersResponse>("/api/users");

export const getUserAgendaToday = (userId: number) =>
  requestJson<AgendaResponse>(`/api/users/${userId}/agenda/today`);

export const getUserWeather = (userId: number) =>
  requestJson<WeatherResponse>(`/api/users/${userId}/weather`);

export const updateUserLanguage = (userId: number, payload: UserLanguageMutationRequest) =>
  requestJson<UserMutationResponse>(`/api/users/${userId}/language`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
