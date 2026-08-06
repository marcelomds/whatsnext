import { useEffect, useRef, useState } from "react";
import { api } from "../api";

function extractQrCode(data) {
  return data?.base64 || data?.qrcode?.base64 || null;
}

function extractState(data) {
  return data?.instance?.state || data?.state || null;
}

export default function Connect() {
  const [state, setState] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const checkStatus = async () => {
    try {
      const { data } = await api.getInstanceStatus();
      setState(data.state);
      return data.state;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    checkStatus().finally(() => setLoading(false));
    return () => clearInterval(pollRef.current);
  }, []);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.connectInstance();
      const currentState = extractState(data);

      if (currentState === "open") {
        setState("open");
        setQrCode(null);
      } else {
        setQrCode(extractQrCode(data));
        setState(currentState || "connecting");

        pollRef.current = setInterval(async () => {
          const polledState = await checkStatus();
          if (polledState === "open") {
            clearInterval(pollRef.current);
            setQrCode(null);
          }
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Verificando conexão...</p>;
  }

  return (
    <div className="connect-page">
      <h2>Conectar WhatsApp</h2>

      {error && <p className="error">{error}</p>}

      {state === "open" && (
        <p className="status-ok">✅ WhatsApp conectado e pronto para uso.</p>
      )}

      {state !== "open" && !qrCode && (
        <>
          <p>WhatsApp ainda não conectado.</p>
          <button onClick={handleConnect}>Gerar QR Code</button>
        </>
      )}

      {qrCode && (
        <div className="qrcode-box">
          <p>Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho, e escaneie:</p>
          <img src={qrCode} alt="QR Code de pareamento" />
          <p>Aguardando pareamento...</p>
        </div>
      )}
    </div>
  );
}
