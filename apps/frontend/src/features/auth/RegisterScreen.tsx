import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [evolutionInstance, setEvolutionInstance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await register(name.trim(), email.trim(), password, evolutionInstance.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600/20 blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-green-400">WhatsNext</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-50">Criar conta</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-400" htmlFor="evolutionInstance">
              Nome da instância Evolution API <span className="text-neutral-600">(opcional)</span>
            </label>
            <input
              id="evolutionInstance"
              type="text"
              value={evolutionInstance}
              onChange={(event) => setEvolutionInstance(event.target.value)}
              placeholder="Deixe em branco para gerar automaticamente"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-neutral-600">
              Já tem uma instância pareada? Informe o nome exato para reutilizá-la.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-neutral-500">
          Já tem conta?{" "}
          <button type="button" onClick={onSwitchToLogin} className="font-medium text-green-400 hover:text-green-300">
            Entrar
          </button>
        </p>
      </div>
    </main>
  );
}
