import { apiGet, apiPost } from "./api";
import type { ConnectResponse, InstanceStatus } from "../types/instance";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export function getInstanceStatus() {
  return apiGet<ApiEnvelope<InstanceStatus>>("/api/instance/status");
}

export function connectInstance() {
  return apiPost<ApiEnvelope<ConnectResponse>>("/api/instance/connect");
}
