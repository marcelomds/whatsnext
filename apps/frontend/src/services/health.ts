import { apiGet } from "./api";
import type { HealthResponse } from "../types/health";

export function getHealth() {
  return apiGet<HealthResponse>("/health");
}
