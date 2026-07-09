import type { DashboardSummaryRequest, DashboardSummaryResponse, UserMutationResponse } from "../types/api";
import type { MirrorStateResponse } from "../types/mirror";
import { requestJson } from "../utils/request-json";

export type RegisterUserRequest = {
  name: string;
  faceLabel: string;
  faceDescriptor: string;
  location?: string;
  preferredLanguage: "en" | "zh";
};

export type ConfirmFaceRequest = {
  userId: number;
  faceLabel: string;
};

export const getMirrorState = () => requestJson<MirrorStateResponse>("/api/mirror/state");

export const startMirrorRegistration = () =>
  requestJson<{ ok: boolean }>("/api/mirror/start-registration", {
    method: "POST",
    body: JSON.stringify({})
  });

export const registerMirrorUser = (payload: RegisterUserRequest) =>
  requestJson<UserMutationResponse>("/api/mirror/register-user", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const confirmMirrorFace = (payload: ConfirmFaceRequest) =>
  requestJson<UserMutationResponse>("/api/mirror/confirm-face", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const generateMirrorDashboardSummary = (payload: DashboardSummaryRequest) =>
  requestJson<DashboardSummaryResponse>("/api/mirror/dashboard-summary", {
    method: "POST",
    body: JSON.stringify(payload)
  });
