import { useEffect, useState } from "react";
import { useMessages } from "../../hooks/useMessages";
import { formatDate } from "./formatDate";

const STORAGE_KEY = "whatsnext_phone";

export function MessagesTable() {
  const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const { messages, loading, error, search } = useMessages();

  useEffect(() => {
    if (phoneNumber) search(phoneNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem(STORAGE_KEY, phoneNumber);
    search(phoneNumber);
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Mensagens</h3>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Número de telefone (ex: 5511999999999)"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-green-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-400 disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900/60 text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Mensagem</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {messages.map((message) => (
              <tr key={message.messageId}>
                <td className="px-4 py-2 text-neutral-200">{message.content}</td>
                <td className="px-4 py-2 text-neutral-400">{message.status}</td>
                <td className="px-4 py-2 text-neutral-400">{formatDate(message.timestamp)}</td>
              </tr>
            ))}
            {!loading && messages.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-neutral-500">
                  {phoneNumber ? "Nenhuma mensagem para esse número." : "Digite um número para buscar mensagens."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
