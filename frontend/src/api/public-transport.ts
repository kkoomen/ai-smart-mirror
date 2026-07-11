import type { PublicTransportResponse } from "../types/public-transport";
import { requestJson } from "../utils/request-json";

export const getPublicTransportTrips = (userId: number) =>
  requestJson<PublicTransportResponse>(`/api/transport/ns?userId=${userId}`);
