import { useEffect, useState } from "react";
import { api } from "../api";

function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("pt-BR");
}

export default function Dashboard() {
  const [phoneNumber, setPhoneNumber] = useState(
    () => localStorage.getItem("whatsnext_phone") || ""
  );
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    try {
      const { data } = await api.getEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMessages = async () => {
    if (!phoneNumber) return;

    setLoading(true);
    try {
      const { data } = await api.getMessages(phoneNumber);
      setMessages(data);
      localStorage.setItem("whatsnext_phone", phoneNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (phoneNumber) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>

      {error && <p className="error">{error}</p>}

      <section>
        <h3>Eventos criados ({events.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Início</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.eventId}>
                <td>{event.title}</td>
                <td>{formatDate(event.startTime)}</td>
                <td>{event.status}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum evento ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Mensagens</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadMessages();
          }}
        >
          <input
            type="text"
            placeholder="Número de telefone (ex: 5511999999999)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            Buscar
          </button>
        </form>

        <table>
          <thead>
            <tr>
              <th>Mensagem</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.messageId}>
                <td>{message.content}</td>
                <td>{message.status}</td>
                <td>{formatDate(message.timestamp)}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={3}>
                  {phoneNumber
                    ? "Nenhuma mensagem para esse número."
                    : "Digite um número para buscar mensagens."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
