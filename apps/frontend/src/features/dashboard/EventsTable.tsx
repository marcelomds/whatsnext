import { useEvents } from "../../hooks/useEvents";
import { formatDate } from "./formatDate";

export function EventsTable() {
  const { events, loading, error } = useEvents();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">
        Eventos criados {!loading && `(${events.length})`}
      </h3>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900/60 text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Início</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {events.map((event) => (
              <tr key={event.eventId}>
                <td className="px-4 py-2 text-neutral-200">{event.title}</td>
                <td className="px-4 py-2 text-neutral-400">{formatDate(event.startTime)}</td>
                <td className="px-4 py-2 text-neutral-400">{event.status}</td>
              </tr>
            ))}
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-neutral-500">
                  Nenhum evento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
