import { apiGet } from "./api";
import type { Message } from "../types/message";

interface MessagesResponse {
  success: boolean;
  data: Message[];
  count: number;
}

export function getMessages(phoneNumber: string, limit = 50) {
  return apiGet<MessagesResponse>(
    `/api/messages?phoneNumber=${encodeURIComponent(phoneNumber)}&limit=${limit}`
  );
}
