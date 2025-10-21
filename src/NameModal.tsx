// src/NameModal.tsx
import * as React from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";

type Props = {
  open: boolean;
  defaultValue?: string;
  saving?: boolean;
  userId: string;
  season: string;
  onCancel: () => void;
  onSave: (name: string) => void;
};

export default function NameModal({
  open,
  defaultValue = "",
  saving,
  userId,
  season,
  onCancel,
  onSave,
}: Props) {
  const [name, setName] = React.useState(defaultValue);
  const [touched, setTouched] = React.useState(false);

  // Availability state
  const [checking, setChecking] = React.useState(false);
  const [taken, setTaken] = React.useState<null | boolean>(null);
  const [checkErr, setCheckErr] = React.useState<string | null>(null);
  
  const handleCancel = React.useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    if (e && "preventDefault" in e) e.preventDefault();
    if (e && "stopPropagation" in e) e.stopPropagation();
    onCancel();
  }, [onCancel]);

  // close on ESC
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleCancel]);
    React.useEffect(() => {
      if (open) {
        setName(defaultValue);
        setTouched(false);
        setTaken(null);
        setCheckErr(null);
      }
    }, [open, defaultValue]);

  // Debounced, case-insensitive availability check (exact match)
  React.useEffect(() => {
    if (!open) return;

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40 || !userId || !season) {
      setTaken(null);
      setCheckErr(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setCheckErr(null);

    const t = setTimeout(async () => {
      try {
        // ilike without % wildcards behaves like a case-insensitive exact compare
        const { count, error } = await supabase
          .from("entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("season", season)
          .ilike("name", trimmed);

        if (error) throw error;
        if (!cancelled) setTaken((count ?? 0) > 0);
      } catch (e: any) {
        if (!cancelled) setCheckErr(e?.message ?? "Name check failed");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, userId, season, open]);

  const invalidLen = name.trim().length < 2 || name.trim().length > 40;
  const invalid = invalidLen || taken === true;
  if (!open) return null;            // ✅ don't render unless open

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(2px)",
        }}
        onClick={handleCancel}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, 92vw)",
          background: "#0b0f17",
          color: "#e5e7eb",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>
            Name your picks
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "rgba(226,232,240,0.65)",
            }}
          >
            Give this submission a short name so you can make multiple entries.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid && !checking) onSave(name.trim());
          }}
          style={{ padding: 20 }}
        >
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 6,
              color: "#e5e7eb",
            }}
          >
            Entry name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g., Tony’s East/West v1"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#111827",
              color: "#f9fafb",
              outline: "none",
              fontSize: 14,
            }}
          />

          {/* Helper messages */}
          {checking && (
            <p style={{ marginTop: 8, fontSize: 12, color: "rgba(226,232,240,0.65)" }}>
              Checking availability…
            </p>
          )}
          {taken && !checking && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#f43f5e" }}>
              That name is already in use for this season.
            </p>
          )}
          {touched && invalidLen && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#f43f5e" }}>
              Name must be 2–40 characters.
            </p>
          )}
          {checkErr && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#f59e0b" }}>{checkErr}</p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#e5e7eb",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={invalid || checking || !!saving}
              style={{
                border: "none",
                borderRadius: 12,
                padding: "10px 16px",
                background: "#4f46e5",
                color: "#fff",
                fontWeight: 700,
                opacity: invalid || checking || saving ? 0.6 : 1,
                cursor: invalid || checking || saving ? "not-allowed" : "pointer",
                boxShadow: "0 6px 16px rgba(79,70,229,0.35)",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
