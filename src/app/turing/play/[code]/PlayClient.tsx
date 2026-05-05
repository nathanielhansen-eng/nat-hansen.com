"use client";

import { useEffect, useRef, useState } from "react";
import type { ParticipantView } from "@/lib/turing/redact";

function fmtClock(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlayClient({ code }: { code: string }) {
  const [view, setView] = useState<ParticipantView | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(0);
  const logRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const i = setInterval(tick, 500);
    queueMicrotask(tick);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const r = await fetch(`/api/turing/state?code=${code}&role=participant`, {
          cache: "no-store",
        });
        if (r.ok) {
          const d = (await r.json()) as ParticipantView;
          if (!stop) setView(d);
        }
      } catch {}
      if (!stop) setTimeout(tick, 1000);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [code]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [view?.messages?.length, view?.opponentTyping]);

  async function ping(isTyping: boolean) {
    fetch("/api/turing/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, isTyping }),
    }).catch(() => {});
  }

  function handleType(s: string) {
    setDraft(s);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (s.trim()) {
      ping(true);
      typingTimer.current = setTimeout(() => ping(false), 2500);
    } else {
      ping(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    if (typingTimer.current) clearTimeout(typingTimer.current);
    ping(false);
    try {
      const r = await fetch("/api/turing/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, text }),
      });
      if (!r.ok) {
        const e = await r.text();
        alert(e || "send failed");
        setDraft(text);
      }
    } finally {
      setSending(false);
    }
  }

  if (!view) return <main className="p-8">Loading…</main>;

  const status = view.status;
  const remaining = view.endsAt ? view.endsAt - now : 0;
  const messages = view.messages ?? [];
  const lastMsg = messages[messages.length - 1];
  const myTurn = !lastMsg || lastMsg.from !== view.selfId;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 flex flex-col h-screen">
      <header className="flex items-center gap-3 mb-3 text-sm">
        <span className="font-mono text-lg">{view.selfLabel}</span>
        <span className="text-neutral-500">↔</span>
        <span className="font-mono text-lg">{view.opponentLabel ?? "—"}</span>
        <span className="ml-auto text-neutral-600">
          round {view.roundNumber} ·{" "}
          {status === "round_active" ? (
            <strong>{fmtClock(remaining)}</strong>
          ) : (
            status
          )}
        </span>
      </header>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto border border-neutral-300 rounded p-3 space-y-2 text-sm bg-white"
      >
        {status === "lobby" && (
          <p className="text-neutral-500">Waiting for the host to start…</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.from === view.selfId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${
                m.from === view.selfId
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-200 text-neutral-900"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {view.opponentTyping && (
          <div className="flex justify-start">
            <div className="bg-neutral-200 rounded-2xl px-3 py-2 text-neutral-500 italic">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {status === "round_active" ? (
        <div className="mt-3 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => handleType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={!myTurn || sending}
            placeholder={myTurn ? "Your message…" : "Wait for their reply…"}
            className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm resize-none disabled:bg-neutral-100"
            rows={2}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || !myTurn || sending}
            className="bg-black text-white px-4 rounded text-sm disabled:opacity-40"
          >
            Send
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
          {status === "round_judging" ? (
            <>
              <strong>Time&apos;s up.</strong> The judges are now deciding
              whether you and your conversation partner were human or AI. Sit
              tight — no more messages until the host starts the next round.
            </>
          ) : status === "revealed" && view.reveal ? (
            <RevealPanel reveal={view.reveal} />
          ) : status === "revealed" ? (
            <>
              <strong>Truth revealed.</strong> The host will start the next
              round shortly.
            </>
          ) : (
            <>Waiting for the host to start the round…</>
          )}
        </div>
      )}
    </main>
  );
}

function RevealPanel({ reveal }: { reveal: NonNullable<ParticipantView["reveal"]> }) {
  const { partner, partnerKind, partnerName, self } = reveal;
  return (
    <div className="space-y-3">
      <div className="text-base">
        Your conversation partner was{" "}
        {partnerKind === "ai" ? (
          <strong className="text-rose-700">an AI</strong>
        ) : partnerKind === "human" ? (
          <strong className="text-emerald-700">
            a human{partnerName ? ` (${partnerName})` : ""}
          </strong>
        ) : (
          <strong>unknown</strong>
        )}
        .
      </div>
      {partner && partner.kind === "ai" && partner.totalVotes > 0 && (
        <div
          className={`rounded border-2 p-3 text-center ${
            partner.aiPassed === true
              ? "bg-emerald-50 border-emerald-400 text-emerald-800"
              : partner.aiPassed === false
                ? "bg-rose-50 border-rose-400 text-rose-800"
                : "bg-neutral-100 border-neutral-400 text-neutral-700"
          }`}
        >
          <div className="font-bold tracking-wide">
            {partner.aiPassed === true
              ? "AI PASSED THE TURING TEST"
              : partner.aiPassed === false
                ? "AI FAILED THE TURING TEST"
                : "JUDGES SPLIT"}
          </div>
          <div className="text-xs mt-1">
            {partner.humanVotes} judge{partner.humanVotes === 1 ? "" : "s"}{" "}
            thought human · {partner.aiVotes} thought AI
          </div>
        </div>
      )}
      {self.totalVotes > 0 && (
        <div className="text-sm text-neutral-700">
          As for you ({self.label}): {self.humanVotes} judge
          {self.humanVotes === 1 ? "" : "s"} thought you were human,{" "}
          {self.aiVotes} thought AI.
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return <span>typing{".".repeat(n)}</span>;
}
