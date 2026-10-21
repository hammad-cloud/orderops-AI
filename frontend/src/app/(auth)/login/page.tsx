import { login } from "@/lib/actions";

type Props = { searchParams: Promise<{ error?: string; expired?: string }> };

const messages: Record<string, string> = {
  invalid: "Wrong email or password.",
  locked: "Too many failed attempts. Try again in 15 minutes.",
  offline: "Can't reach the API. Is the backend running?",
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, expired } = await searchParams;
  const message = (error && messages[error]) || (expired && "Your session expired. Sign in again.");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <form action={login} className="w-full max-w-sm space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/20">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">OrderOps AI</h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to the operations console.</p>
        </div>

        {message && (
          <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {message}
          </p>
        )}

        <label className="block text-sm font-medium text-zinc-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-300">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500"
          />
        </label>
        <button className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-500">Sign in</button>
      </form>
    </main>
  );
}
