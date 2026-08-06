import { useState } from "react";
import { useConnectInstance } from "../../hooks/useConnectInstance";

export function ConnectScreen() {
  const { status, loading, connecting, disconnecting, qrCode, error, startConnect, disconnect } =
    useConnectInstance();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  if (loading) {
    return <p className="text-neutral-400">Verificando conexão...</p>;
  }

  const isOpen = status?.state === "open";

  const handleDisconnect = async () => {
    await disconnect();
    setConfirmingDisconnect(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-lg font-semibold text-neutral-100">Conectar WhatsApp</h2>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {isOpen && (
        <div className="space-y-3">
          <p className="rounded-lg border border-green-900 bg-green-950/50 px-4 py-2 text-sm font-medium text-green-400">
            ✅ WhatsApp conectado e pronto para uso.
          </p>

          {!confirmingDisconnect ? (
            <button
              onClick={() => setConfirmingDisconnect(true)}
              className="text-sm font-medium text-neutral-400 underline decoration-dotted hover:text-neutral-200"
            >
              Desconectar / trocar de número
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
              <p className="text-sm text-neutral-300">
                Tem certeza? Vai precisar escanear o QR code de novo.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {disconnecting ? "Desconectando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmingDisconnect(false)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-300"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {!isOpen && !qrCode && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">WhatsApp ainda não conectado.</p>
          <button
            onClick={startConnect}
            disabled={connecting}
            className="rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-400 disabled:opacity-50"
          >
            {connecting ? "Gerando..." : "Gerar QR Code"}
          </button>
        </div>
      )}

      {qrCode && (
        <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
          <p className="text-sm text-neutral-400">
            Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho, e escaneie:
          </p>
          <img src={qrCode} alt="QR Code de pareamento" className="mx-auto max-w-[240px] rounded-lg" />
          <p className="text-sm text-neutral-500">Aguardando pareamento...</p>
        </div>
      )}
    </div>
  );
}
