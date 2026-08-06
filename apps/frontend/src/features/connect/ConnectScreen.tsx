import { useConnectInstance } from "../../hooks/useConnectInstance";

export function ConnectScreen() {
  const { status, loading, connecting, qrCode, error, startConnect } = useConnectInstance();

  if (loading) {
    return <p className="text-neutral-400">Verificando conexão...</p>;
  }

  const isOpen = status?.state === "open";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-lg font-semibold text-neutral-100">Conectar WhatsApp</h2>

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {isOpen && (
        <p className="rounded-lg border border-green-900 bg-green-950/50 px-4 py-2 text-sm font-medium text-green-400">
          ✅ WhatsApp conectado e pronto para uso.
        </p>
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
