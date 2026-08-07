import { useState } from "react";
import { useConnectInstance } from "../../hooks/useConnectInstance";
import { useLanguage } from "../../hooks/useLanguage";

export function ConnectScreen() {
  const { status, loading, connecting, disconnecting, qrCode, error, startConnect, disconnect } =
    useConnectInstance();
  const { t } = useLanguage();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  if (loading) {
    return <p className="text-slate-500">{t("connectChecking")}</p>;
  }

  const isOpen = status?.state === "open";

  const handleDisconnect = async () => {
    await disconnect();
    setConfirmingDisconnect(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("connectTitle")}</h2>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {isOpen && (
        <div className="space-y-3">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            {t("connectReady")}
          </p>

          {!confirmingDisconnect ? (
            <button
              onClick={() => setConfirmingDisconnect(true)}
              className="text-sm font-medium text-slate-500 underline decoration-dotted hover:text-slate-800"
            >
              {t("connectDisconnectLink")}
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/50">
              <p className="text-sm text-slate-600">{t("connectConfirmQuestion")}</p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {disconnecting ? t("connectDisconnecting") : t("connectConfirm")}
              </button>
              <button
                onClick={() => setConfirmingDisconnect(false)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700"
              >
                {t("connectCancel")}
              </button>
            </div>
          )}
        </div>
      )}

      {!isOpen && !qrCode && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{t("connectNotConnected")}</p>
          <button
            onClick={startConnect}
            disabled={connecting}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {connecting ? t("connectGenerating") : t("connectGenerateQr")}
          </button>
        </div>
      )}

      {qrCode && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm shadow-slate-200/50">
          <p className="text-sm text-slate-500">{t("connectScanInstruction")}</p>
          <img src={qrCode} alt="QR Code de pareamento" className="mx-auto max-w-[240px] rounded-lg border border-slate-200" />
          <p className="text-sm text-slate-400">{t("connectWaitingPairing")}</p>
        </div>
      )}
    </div>
  );
}
