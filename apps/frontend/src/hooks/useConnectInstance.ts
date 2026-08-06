import { useEffect, useRef, useState } from "react";
import { connectInstance, disconnectInstance } from "../services/instance";
import { useInstanceStatus } from "./useInstanceStatus";

function extractQrCode(data: { base64?: string; qrcode?: { base64: string } }) {
  return data.base64 || data.qrcode?.base64 || null;
}

export function useConnectInstance() {
  const { status, loading, error: statusError, refresh } = useInstanceStatus();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startConnect = async () => {
    setError(null);
    setConnecting(true);

    try {
      const { data } = await connectInstance();

      if (data.instance?.state === "open") {
        setQrCode(null);
        await refresh();
      } else {
        setQrCode(extractQrCode(data));

        pollRef.current = setInterval(async () => {
          const polled = await refresh();
          if (polled?.state === "open") {
            if (pollRef.current) clearInterval(pollRef.current);
            setQrCode(null);
          }
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setError(null);
    setDisconnecting(true);

    try {
      await disconnectInstance();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setDisconnecting(false);
    }
  };

  return {
    status,
    loading,
    connecting,
    disconnecting,
    qrCode,
    error: error || statusError,
    startConnect,
    disconnect,
  };
}
