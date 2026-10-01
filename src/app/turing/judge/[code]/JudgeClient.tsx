"use client";

import { useEffect, useState } from "react";
import type { JudgeView, LoopNote } from "@/lib/turing/redact";
import type { Tell } from "@/lib/turing/types";
import type { WitnessVerdict, AgentLeaderboard } from "@/lib/turing/verdict";

function VerdictBanner({ v }: { v: WitnessVerdict }) {
  if (v.totalVotes === 0) {
    return (
      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4 text-center">
        <div className="font-mono text-sm">{v.label}</div>
        <div className="text-sm text-neutral-600">No votes recorded</div>
      </div>
    );
  }
  const passed = v.aiPassed === true;
  const tied = v.aiPassed === null;
  const bg = passed
    ? "bg-emerald-50 border-emerald-400"
    : tied
      ? "bg-neutral-100 border-neutral-400"
      : "bg-rose-50 border-rose-400";
  const text = passed
    ? "text-emerald-800"
    : tied
      ? "text-neutral-700"
      : "text-rose-800";
  const headline = passed
    ? "AI PASSED THE TURING TEST"
    : tied
      ? "JUDGES SPLIT — NO VERDICT"
      : "AI FAILED THE TURING TEST";
  return (
    <div className={`rounded-lg border-2 ${bg} p-5 text-center`}>
      <div className="font-mono text-sm text-neutral-600 mb-1">{v.label}</div>
      <div className={`text-2xl font-bold tracking-wide ${text}`}>
        {headline}
      </div>
      <div className="text-sm text-neutral-700 mt-2">
        {v.humanVotes} judge{v.humanVotes === 1 ? "" : "s"} thought human ·{" "}
        {v.aiVotes} thought AI
      </div>
    </div>
  );
}

function Leaderboard({ rows }: { rows: AgentLeaderboard[] }) {
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">Leaderboard</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-neutral-300">
            <th className="py-1 pr-3">Agent</th>
            <th className="py-1 pr-3 text-right">Rounds</th>
            <th className="py-1 pr-3 text-right">Passes</th>
            <th className="py-1 pr-3 text-right">Fails</th>
            <th className="py-1 pr-3 text-right">Ties</th>
            <th className="py-1 pr-3 text-right">Pass rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agentId} className="border-b border-neutral-200">
              <td className="py-1 pr-3 font-mono">{r.label}</td>
              <td className="py-1 pr-3 text-right">{r.rounds}</td>
              <td className="py-1 pr-3 text-right text-emerald-700 font-semibold">
                {r.passes}
              </td>
              <td className="py-1 pr-3 text-right text-rose-700">{r.fails}</td>
              <td className="py-1 pr-3 text-right text-neutral-500">
                {r.ties}
              </td>
              <td className="py-1 pr-3 text-right">
                {r.rounds === 0 ? "—" : `${Math.round(r.passRate * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Candidate = Tell & { witnessId: string };

// Merge a new span into a message's marks so marks never overlap.
function addTell(list: Tell[], t: Tell, fullText: string): Tell[] {
  let { start, end } = t;
  const keep: Tell[] = [];
  for (const x of list) {
    if (x.messageId === t.messageId && x.start < end && start < x.end) {
      start = Math.min(start, x.start);
      end = Math.max(end, x.end);
    } else keep.push(x);
  }
  return [
    ...keep,
    { messageId: t.messageId, start, end, text: fullText.slice(start, end) },
  ];
}

function MarkedText({
  text,
  marks,
  onRemove,
}: {
  text: string;
  marks: Tell[];
  onRemove?: (t: Tell) => void;
}) {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of sorted) {
    if (m.start > at) out.push(text.slice(at, m.start));
    out.push(
      <mark
        key={m.start}
        className="bg-amber-200 rounded-sm cursor-pointer"
        title={onRemove ? "Tap to unmark" : undefined}
        onClick={onRemove ? () => onRemove(m) : undefined}
      >
        {text.slice(m.start, m.end)}
      </mark>
    );
    at = m.end;
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function LoopNoteBanner({ note }: { note: LoopNote }) {
  return (
    <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
      The bot has been updated from {note.tellCount} giveaway
      {note.tellCount === 1 ? "" : "s"} you marked
      {note.themes.length > 0 && <> ({note.themes.join("; ")})</>}. One of
      this round&rsquo;s witnesses is generation {note.generation}.
    </div>
  );
}

function fmtClock(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function JudgeClient({ code }: { code: string }) {
  const [view, setView] = useState<JudgeView | null>(null);
  const [now, setNow] = useState(0);
  const [pendingVotes, setPendingVotes] = useState<Record<string, "human" | "ai">>({});
  // Local marks for the current round, until submitted with the votes.
  const [localTells, setLocalTells] = useState<{
    round: number;
    byWitness: Record<string, Tell[]>;
  } | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

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
        const r = await fetch(`/api/turing/state?code=${code}&role=judge`, {
          cache: "no-store",
        });
        if (r.ok) {
          const d = (await r.json()) as JudgeView;
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

  const votingOpen =
    view?.status === "round_active" || view?.status === "round_judging";
  const mergedVotes: Record<string, "human" | "ai"> = {
    ...(view?.myVotes ?? {}),
    ...pendingVotes,
  };
  const tells: Record<string, Tell[]> =
    localTells && localTells.round === view?.roundNumber
      ? localTells.byWitness
      : (view?.myTells ?? {});
  const markable = (wid: string) => votingOpen && mergedVotes[wid] === "ai";

  // Read the judge's text selection; keep the last valid one so tapping the
  // button (which collapses the selection on phones) still has it.
  useEffect(() => {
    function onSel() {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const node = (n: Node) =>
        (n.nodeType === 1 ? (n as Element) : n.parentElement)?.closest(
          "[data-msg]"
        ) as HTMLElement | null;
      const el = node(range.startContainer);
      if (!el || el !== node(range.endContainer)) return setCandidate(null);
      const witnessId = el.dataset.from!;
      if (!markable(witnessId)) return setCandidate(null);
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const text = range.toString();
      if (!text.trim()) return setCandidate(null);
      setCandidate({
        witnessId,
        messageId: el.dataset.msg!,
        start,
        end: start + text.length,
        text,
      });
    }
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  });

  if (!view) return <main className="p-8">Loading…</main>;

  function setTellsFor(wid: string, next: Tell[]) {
    setLocalTells({
      round: view!.roundNumber,
      byWitness: { ...tells, [wid]: next },
    });
  }

  function markCandidate() {
    if (!candidate) return;
    const msg = view!.pairs
      .flatMap((p) => p.messages)
      .find((m) => m.id === candidate.messageId);
    if (!msg?.text) return;
    setTellsFor(
      candidate.witnessId,
      addTell(tells[candidate.witnessId] ?? [], candidate, msg.text)
    );
    setCandidate(null);
    document.getSelection()?.removeAllRanges();
  }

  const status = view.status;
  const remaining = view.endsAt ? view.endsAt - now : 0;
  const merged = mergedVotes;

  async function submitVotes() {
    const sendTells: Record<string, Tell[]> = {};
    for (const [wid, list] of Object.entries(tells)) {
      if (merged[wid] === "ai" && list.length) sendTells[wid] = list;
    }
    await fetch("/api/turing/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, votes: merged, tells: sendTells }),
    });
    setPendingVotes({});
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <header className="flex items-center gap-3 mb-3 text-sm">
        <span className="font-semibold">Judge: {view.selfName}</span>
        <span className="text-neutral-600">
          round {view.roundNumber} ·{" "}
          {status === "round_active" ? (
            <strong>{fmtClock(remaining)}</strong>
          ) : (
            status
          )}
        </span>
      </header>

      {view.loopNote && <LoopNoteBanner note={view.loopNote} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(view.pairs ?? []).map((p) => (
          <div key={p.pairId} className="border border-neutral-300 rounded p-3">
            <div className="text-xs font-mono mb-2">
              {p.aLabel} ↔ {p.bLabel}
            </div>
            <div className="space-y-1 text-sm max-h-72 overflow-y-auto">
              {p.messages.map((m) => {
                const isA = m.from === p.aId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isA ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded px-2 py-1 whitespace-pre-wrap ${
                        isA ? "bg-blue-100" : "bg-emerald-100"
                      }`}
                    >
                      <span className="font-mono text-xs text-neutral-600 select-none">
                        {isA ? p.aLabel : p.bLabel}:{" "}
                      </span>
                      <span data-msg={m.id} data-from={m.from}>
                        <MarkedText
                          text={m.text ?? ""}
                          marks={(tells[m.from] ?? []).filter(
                            (t) => t.messageId === m.id
                          )}
                          onRemove={
                            markable(m.from)
                              ? (t) =>
                                  setTellsFor(
                                    m.from,
                                    (tells[m.from] ?? []).filter((x) => x !== t)
                                  )
                              : undefined
                          }
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
              {p.typingWho && (
                <div className="text-xs italic text-neutral-500">
                  {p.typingWho === p.aId ? p.aLabel : p.bLabel} is typing…
                </div>
              )}
              {p.messages.length === 0 && (
                <div className="text-neutral-400">(no messages yet)</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(status === "round_judging" || status === "round_active") && (
        <section className="mt-6 border-t pt-4">
          <h2 className="font-semibold mb-1">Your votes</h2>
          <p className="text-xs text-neutral-600 mb-2">
            When you vote AI, select the words in that witness&rsquo;s messages
            that gave it away and tap &ldquo;Mark as giveaway.&rdquo; Tap a
            mark to remove it.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(view.witnesses ?? []).map((w) => {
              const cur = merged[w.id];
              return (
                <div
                  key={w.id}
                  className="border border-neutral-300 rounded p-2 flex items-center gap-2"
                >
                  <span className="font-mono">{w.label}</span>
                  {cur === "ai" && (tells[w.id]?.length ?? 0) > 0 && (
                    <span className="text-xs text-amber-700">
                      {tells[w.id].length} marked
                    </span>
                  )}
                  <div className="ml-auto flex gap-1">
                    {(["human", "ai"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          setPendingVotes((v) => ({ ...v, [w.id]: g }))
                        }
                        className={`px-2 py-1 text-xs rounded border ${
                          cur === g
                            ? "bg-black text-white border-black"
                            : "border-neutral-400"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={submitVotes}
            className="mt-3 bg-black text-white px-4 py-2 rounded text-sm"
          >
            Submit votes
          </button>
        </section>
      )}

      {view.revealed && view.verdicts && (
        <section className="mt-6 border-t pt-4 space-y-4">
          <h2 className="text-lg font-semibold">Reveal</h2>

          {view.verdicts
            .filter((v) => v.kind === "ai")
            .map((v) => (
              <VerdictBanner key={v.witnessId} v={v} />
            ))}

          <div>
            <h3 className="font-semibold text-sm mb-2">Per-witness votes</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-neutral-300">
                  <th className="py-1 pr-3">Witness</th>
                  <th className="py-1 pr-3">Truth</th>
                  <th className="py-1 pr-3 text-right">Voted human</th>
                  <th className="py-1 pr-3 text-right">Voted AI</th>
                </tr>
              </thead>
              <tbody>
                {view.verdicts.map((v) => (
                  <tr key={v.witnessId} className="border-b border-neutral-200">
                    <td className="py-1 pr-3 font-mono">{v.label}</td>
                    <td className="py-1 pr-3">
                      <span
                        className={
                          v.kind === "ai"
                            ? "text-red-700"
                            : "text-emerald-700"
                        }
                      >
                        {v.kind}
                        {v.name ? ` — ${v.name}` : ""}
                        {(() => {
                          const tag = view.truth?.find(
                            (t) => t.id === v.witnessId
                          )?.loopTag;
                          return tag ? ` — ${tag}` : "";
                        })()}
                      </span>
                    </td>
                    <td className="py-1 pr-3 text-right">{v.humanVotes}</td>
                    <td className="py-1 pr-3 text-right">{v.aiVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {view.leaderboard && view.leaderboard.length > 0 && (
            <Leaderboard rows={view.leaderboard} />
          )}
        </section>
      )}

      {candidate && markable(candidate.witnessId) && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-amber-300 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              &ldquo;{candidate.text}&rdquo;
            </span>
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={markCandidate}
              className="shrink-0 rounded bg-black px-3 py-1.5 text-white"
            >
              Mark as giveaway
            </button>
            <button
              onClick={() => setCandidate(null)}
              className="shrink-0 text-neutral-500"
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
