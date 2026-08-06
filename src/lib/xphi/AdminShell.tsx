"use client";

// Generic instructor-dashboard chrome: loads submissions from the
// experiment's cookie-authed submissions route, and renders the session
// picker, refresh, CSV download, participant-link builder, and
// loading/error/empty states. Experiment-specific tables render through
// the children function.

import { useCallback, useEffect, useState } from "react";
import { C, FONTS, admin } from "./theme";

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminShell<T extends { session: string }>({
  slug,
  heading,
  csvHeader,
  csvRow,
  shareNote,
  children,
}: {
  slug: string;
  heading: React.ReactNode;
  csvHeader: string[];
  csvRow: (s: T) => unknown[];
  /** Guidance under the participant-link builder. */
  shareNote: React.ReactNode;
  children: (ctx: { rows: T[]; session: string }) => React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<T[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [newSessionId, setNewSessionId] = useState<string>("");

  const load = useCallback(
    async (s?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const q = s ? `?session=${encodeURIComponent(s)}` : "";
        const r = await fetch(`/api/experiments/${slug}/submissions${q}`, { cache: "no-store" });
        if (!r.ok)
          throw new Error(r.status === 401 ? "Session expired — reload and sign in." : "Load failed.");
        const data = await r.json();
        setSubmissions((data.submissions || []) as T[]);
        if (!s) setSessions(data.sessions || []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Load failed.");
      }
      setLoading(false);
    },
    [slug]
  );

  useEffect(() => {
    load(session || undefined);
  }, [session, load]);

  const downloadCsv = () => {
    const lines = [csvHeader.join(",")];
    for (const s of submissions) {
      lines.push(csvRow(s).map(csvEscape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-${session || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const effectiveId = (newSessionId || session || "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const joinUrl = effectiveId
    ? `${origin}/teaching/experiments/${slug}?session=${encodeURIComponent(effectiveId)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Crimson Pro', Georgia, serif", padding: "40px 20px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={admin.eyebrow}>Instructor view</div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, color: C.text, margin: "10px 0 24px" }}>
          {heading}
        </h1>

        {/* controls */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "24px" }}>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            style={{ ...admin.mono, fontSize: "12px", padding: "9px 12px", background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button style={admin.btn} onClick={() => load(session || undefined)}>
            Refresh
          </button>
          <button
            style={{ ...admin.btn, opacity: submissions.length ? 1 : 0.35 }}
            onClick={downloadCsv}
            disabled={!submissions.length}
          >
            Download CSV
          </button>
        </div>

        {/* share link */}
        <div style={{ ...admin.panel, marginBottom: "24px" }}>
          <div style={{ ...admin.eyebrow, marginBottom: "10px" }}>Participant link</div>
          <input
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            placeholder={session || "e.g. Reading-PP3LANG-2026"}
            style={{
              border: `1px solid ${C.border}`,
              padding: "10px 14px",
              fontSize: "17px",
              fontFamily: "'Crimson Pro', Georgia, serif",
              width: "100%",
              outline: "none",
              background: C.well,
              boxSizing: "border-box",
            }}
          />
          {joinUrl && (
            <div style={{ ...admin.mono, fontSize: "12px", color: C.body, marginTop: "12px", wordBreak: "break-all" }}>
              {joinUrl}
            </div>
          )}
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "10px", lineHeight: 1.55 }}>
            {shareNote}
          </div>
        </div>

        {err && <div style={{ ...admin.mono, fontSize: "13px", color: C.red, marginBottom: "16px" }}>{err}</div>}
        {loading && <div style={{ ...admin.mono, fontSize: "13px", color: C.muted }}>Loading…</div>}

        {!loading && submissions.length === 0 && (
          <div style={{ ...admin.panel, ...admin.mono, fontSize: "13px", color: C.muted, padding: "28px" }}>
            No responses yet{session ? ` in session “${session}”` : ""}.
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <>
            <div style={{ ...admin.eyebrow, marginBottom: "14px" }}>
              {(session || "All sessions").toUpperCase()} · N = {submissions.length}
            </div>
            {children({ rows: submissions, session })}
          </>
        )}
      </div>
    </div>
  );
}
