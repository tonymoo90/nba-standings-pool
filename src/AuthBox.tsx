// AuthBox.tsx
import * as React from "react";
import { supabase } from "../lib/supabase";

export default function AuthBox({
  onEmailTagged,
}: {
  onEmailTagged: (email: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = React.useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
      <h3 className="text-sm font-semibold tracking-wider text-white/70 uppercase mb-2">
        Sign in to track your submission
      </h3>

      <form onSubmit={sendMagicLink} className="flex gap-2 mb-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50"
        />
        <button
          type="submit"
          disabled={state === "sending" || !email}
          className="rounded-xl px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : state === "sent" ? "Check email" : "Send magic link"}
        </button>
      </form>

      {state !== "sent" && (
        <div className="text-xs text-white/70">
          Or{" "}
          <button
            type="button"
            disabled={!email}
            onClick={() => onEmailTagged(email)}
            className="underline underline-offset-2"
          >
            just attach my email to this submission
          </button>{" "}
          (no account).
        </div>
      )}
      {state === "sent" && (
        <p className="text-xs text-emerald-300">Magic link sent. Check your inbox for email from Supabase Auth.</p>
      )}
      {err && <p className="text-xs text-rose-300">{err}</p>}
    </div>
  );
}
