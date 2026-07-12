import type {
  DashboardSummaryRequest,
  DashboardSummaryResponse,
  UserMutationResponse
} from "../types/api";
import { requestJson } from "../utils/request-json";

export type RegisterUserRequest = {
  name: string;
  faceLabel: string;
  faceDescriptor: string;
  location?: string;
  preferredLanguage: "en" | "zh";
};

export const registerMirrorUser = (payload: RegisterUserRequest) =>
  requestJson<UserMutationResponse>("/api/mirror/register-user", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const generateMirrorDashboardSummary = (payload: DashboardSummaryRequest) =>
  requestJson<DashboardSummaryResponse>("/api/mirror/dashboard-summary", {
    method: "POST",
    body: JSON.stringify(payload)
  });
