import { useCallback, useState } from "react";
import { getMessages } from "../services/messages";
import type { Message } from "../types/message";

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await getMessages(phoneNumber);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, error, search };
}
