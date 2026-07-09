import type { VoiceCommandRequest } from "../types/api";
import type { VoiceCommandResponse } from "../types/voice";
import { requestJson } from "../utils/request-json";

export const classifyVoiceCommand = (payload: VoiceCommandRequest) =>
  requestJson<VoiceCommandResponse>("/api/voice/command", {
    method: "POST",
    body: JSON.stringify(payload)
  });
