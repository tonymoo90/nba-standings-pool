// AuthModal.tsx — dark mode, centered, inline status + resend cooldown
import * as React from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void; // parent/gate decides if closing is allowed
};

export default function AuthModal({ open, onClose }: Props) {
  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
  };
  const backdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(2px)",
  };
  const card: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(520px, 92vw)",
    background: "#0b0f17",
    color: "#e5e7eb",
    borderRadius: 16,
    boxShadow:
      "0 20px 40px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return createPortal(
    <div style={overlay} aria-modal="true" role="dialog">
      <div style={backdrop} onClick={onClose} />
      <div style={card}>
        <Header />
        <EmailOnlyForm />
      </div>
    </div>,
    document.body
  );
}

function Header() {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#fff" }}>
        Sign in
      </h2>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 13,
          color: "rgba(226,232,240,0.65)",
        }}
      >
        Enter your email to receive a one-time magic link.
      </p>
    </div>
  );
}

function EmailOnlyForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] =
    React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0); // seconds until "Resend" is enabled

  // single function used by both submit and resend
  const sendLink = React.useCallback(async () => {
    if (!email) return;
    setErr(null);
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setErr(error.message);
      setState("error");
      return;
    }
    setState("sent");
    setCooldown(60); // throttle resends
  }, [email]);

  // submit handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending" || !email) return;
    await sendLink();
  }

  // countdown for resend
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // styles
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: "#e5e7eb",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#111827",
    color: "#f9fafb",
    outline: "none",
    fontSize: 14,
  };
  const footerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // status left, button right
    gap: 12,
    marginTop: 14,
    minHeight: 44, // keeps row height stable as content changes
  };
  const statusStyle: React.CSSProperties = {
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color:
      state === "sent"
        ? "#10b981"
        : state === "error"
        ? "#f43f5e"
        : "rgba(226,232,240,0.65)",
  };
  const primaryBtn: React.CSSProperties = {
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    background: "#2563EB",
    fontSize: 11,
    color: "#fff",
    fontWeight: 700,
    cursor: state === "sending" || !email ? "not-allowed" : "pointer",
    opacity: state === "sending" || !email ? 0.6 : 1,
    boxShadow: "0 6px 16px rgba(79,70,229,0.35)",
  };
  const ghostBtn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#e5e7eb",
    fontSize: 11,
    borderRadius: 12,
    padding: "10px 14px",
    cursor: cooldown > 0 ? "not-allowed" : "pointer",
    opacity: cooldown > 0 ? 0.6 : 1,
  };

  return (
    <form onSubmit={onSubmit} style={{ padding: 20 }}>
      <label style={labelStyle}>Email</label>
      <input
        autoFocus
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <div style={footerRow}>
        {/* inline status message (left) */}
        <span style={statusStyle}>
          {state === "sending" && "Sending…"}
          {state === "sent" &&
            `Link sent from "Supabase Auth." Check your email.`}
          {state === "error" && err}
        </span>

        {/* action (right): primary "Send" OR throttled "Resend" */}
        {state !== "sent" ? (
          <button type="submit" style={primaryBtn} disabled={state === "sending" || !email}>
            {state === "sending" ? "Sending…" : "Send link"}
          </button>
        ) : (
          <button
            type="button"
            style={ghostBtn}
            disabled={cooldown > 0}
            onClick={async () => {
              if (cooldown > 0) return;
              await sendLink();
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
        )}
      </div>
    </form>
  );
}
