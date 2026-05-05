"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, Agent, Pair } from "@/lib/turing/types";
import { tallyRound, leaderboard, type WitnessVerdict } from "@/lib/turing/verdict";

function VerdictBanner({ v }: { v: WitnessVerdict }) {
  if (v.totalVotes === 0) return null;
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
      ? "JUDGES SPLIT"
      : "AI FAILED THE TURING TEST";
  return (
    <div className={`rounded-lg border-2 ${bg} p-4 text-center`}>
      <div className="font-mono text-xs text-neutral-600 mb-1">{v.label}</div>
      <div className={`text-xl font-bold tracking-wide ${text}`}>
        {headline}
      </div>
      <div className="text-xs text-neutral-700 mt-1">
        {v.humanVotes} human · {v.aiVotes} AI
      </div>
    </div>
  );
}

type State = { role: "host"; session: Session; now: number };

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6 (default)" },
  { id: "claude-opus-4-7", label: "Opus 4.7 (slower, harder)" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (fastest)" },
];

function fmtClock(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function HostConsole() {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [duration, setDuration] = useState(300);
  const [draftAgents, setDraftAgents] = useState<Agent[]>([]);
  const [draftPairs, setDraftPairs] = useState<Pair[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const i = setInterval(tick, 500);
    queueMicrotask(tick);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!code) return;
    let stop = false;
    async function tick() {
      try {
        const r = await fetch(`/api/turing/state?code=${code}&role=host`, {
          cache: "no-store",
        });
        if (r.ok) {
          const d = (await r.json()) as State;
          if (!stop) setState(d);
        }
      } catch {}
      if (!stop) setTimeout(tick, 1000);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [code]);

  const session = state?.session ?? null;

  // Initialize drafts when session first loads
  useEffect(() => {
    if (!session) return;
    queueMicrotask(() => {
      setDraftAgents(session.agents);
      setDraftPairs(session.pairs);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.code]);

  async function createSession() {
    setBusy(true);
    const r = await fetch("/api/turing/host", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", roundDurationSec: duration }),
    });
    setBusy(false);
    if (r.ok) {
      const { code } = (await r.json()) as { code: string };
      setCode(code);
    }
  }

  async function host(action: string, extra: Record<string, unknown> = {}) {
    if (!code) return;
    setBusy(true);
    await fetch("/api/turing/host", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, code, ...extra }),
    });
    setBusy(false);
  }

  const witnessOptions = useMemo(() => {
    if (!session) return [];
    return [
      ...session.participants.map((p) => ({
        id: p.id,
        label: `${p.label} (${p.name}, human)`,
      })),
      ...draftAgents.map((a) => ({ id: a.id, label: `${a.label} (AI: ${a.brief.slice(0, 30)}…)` })),
    ];
  }, [session, draftAgents]);

  function addAgent() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const used = new Set([
      ...(session?.participants.map((p) => p.label) ?? []),
      ...draftAgents.map((a) => a.label),
    ]);
    let label = "Witness X";
    for (const ch of letters) {
      if (!used.has(`Witness ${ch}`)) {
        label = `Witness ${ch}`;
        break;
      }
    }
    setDraftAgents((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        label,
        brief: "",
        model: MODELS[0].id,
        kind: "ai",
      },
    ]);
  }

  function addPair() {
    setDraftPairs((arr) => [
      ...arr,
      { id: crypto.randomUUID(), aId: "", bId: "" },
    ]);
  }

  async function saveConfig() {
    if (!code) return;
    setBusy(true);
    await fetch("/api/turing/host", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "configure",
        code,
        agents: draftAgents,
        pairs: draftPairs.filter((p) => p.aId && p.bId),
        roundDurationSec: duration,
      }),
    });
    setBusy(false);
  }

  if (!code || !session) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold mb-4">Host a Turing test</h1>
        <label className="block text-sm mb-3">
          Round duration (seconds)
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={30}
            max={1800}
            className="ml-2 border border-neutral-300 rounded px-2 py-1 w-24"
          />
        </label>
        <button
          onClick={createSession}
          disabled={busy}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create session
        </button>
      </main>
    );
  }

  const remaining = session.round.endsAt ? session.round.endsAt - now : 0;
  const status = session.status;
  const canStart =
    (status === "lobby" || status === "revealed") &&
    session.pairs.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold">Host console</h1>
        <span className="font-mono text-2xl tracking-widest border border-neutral-300 px-3 py-1 rounded">
          {session.code}
        </span>
        <span className="text-sm text-neutral-600">
          status: <strong>{status}</strong> · round {session.round.number}
          {status === "round_active" && (
            <> · <strong>{fmtClock(remaining)}</strong></>
          )}
        </span>
        <span className="ml-auto text-sm text-neutral-500">
          {session.participants.length} humans · {session.agents.length} AIs ·{" "}
          {session.judges.length} judges
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="font-semibold mb-2">Joined humans</h2>
          <ul className="text-sm space-y-1">
            {session.participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="font-mono">{p.label}</span>
                <span className="text-neutral-600">{p.name}</span>
                <button
                  className="ml-auto text-xs text-red-600"
                  onClick={() => host("remove_participant", { id: p.id })}
                >
                  remove
                </button>
              </li>
            ))}
            {session.participants.length === 0 && (
              <li className="text-neutral-500">no humans yet</li>
            )}
          </ul>
          <h2 className="font-semibold mt-6 mb-2">Joined judges</h2>
          <ul className="text-sm space-y-1">
            {session.judges.map((j) => (
              <li key={j.id} className="flex items-center gap-2">
                <span>{j.name}</span>
                <button
                  className="ml-auto text-xs text-red-600"
                  onClick={() => host("remove_judge", { id: j.id })}
                >
                  remove
                </button>
              </li>
            ))}
            {session.judges.length === 0 && (
              <li className="text-neutral-500">no judges yet</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold mb-2">AI agents</h2>
          <div className="space-y-3">
            {draftAgents.map((a, i) => (
              <div key={a.id} className="border border-neutral-300 rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={a.label}
                    onChange={(e) =>
                      setDraftAgents((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, label: e.target.value } : x
                        )
                      )
                    }
                    className="border border-neutral-300 rounded px-2 py-1 text-sm w-40"
                  />
                  <select
                    value={a.model}
                    onChange={(e) =>
                      setDraftAgents((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, model: e.target.value } : x
                        )
                      )
                    }
                    className="border border-neutral-300 rounded px-2 py-1 text-sm"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="ml-auto text-xs text-red-600"
                    onClick={() =>
                      setDraftAgents((arr) => arr.filter((_, j) => j !== i))
                    }
                  >
                    delete
                  </button>
                </div>
                <textarea
                  value={a.brief}
                  onChange={(e) =>
                    setDraftAgents((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, brief: e.target.value } : x
                      )
                    )
                  }
                  rows={5}
                  placeholder="System prompt / persona brief..."
                  className="w-full border border-neutral-300 rounded px-2 py-1 text-sm font-mono"
                />
              </div>
            ))}
            <button
              onClick={addAgent}
              className="text-sm border border-neutral-400 rounded px-3 py-1"
            >
              + add AI
            </button>
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="font-semibold mb-2">Pairs</h2>
          <div className="space-y-2">
            {draftPairs.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <select
                  value={p.aId}
                  onChange={(e) =>
                    setDraftPairs((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, aId: e.target.value } : x
                      )
                    )
                  }
                  className="border border-neutral-300 rounded px-2 py-1 text-sm flex-1"
                >
                  <option value="">— choose A —</option>
                  {witnessOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <span>↔</span>
                <select
                  value={p.bId}
                  onChange={(e) =>
                    setDraftPairs((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, bId: e.target.value } : x
                      )
                    )
                  }
                  className="border border-neutral-300 rounded px-2 py-1 text-sm flex-1"
                >
                  <option value="">— choose B —</option>
                  {witnessOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <button
                  className="text-xs text-red-600"
                  onClick={() =>
                    setDraftPairs((arr) => arr.filter((_, j) => j !== i))
                  }
                >
                  delete
                </button>
              </div>
            ))}
            <button
              onClick={addPair}
              className="text-sm border border-neutral-400 rounded px-3 py-1"
            >
              + add pair
            </button>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="text-sm">
              Round duration (s)
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="ml-2 border border-neutral-300 rounded px-2 py-1 w-20"
              />
            </label>
            <button
              onClick={saveConfig}
              disabled={busy}
              className="bg-black text-white px-3 py-1 rounded text-sm"
            >
              Save config
            </button>
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="font-semibold mb-2">Round controls</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => host("start_round")}
              disabled={busy || !canStart}
              className="bg-black text-white px-3 py-1 rounded text-sm disabled:opacity-40"
            >
              Start round
            </button>
            <button
              onClick={() => host("end_round")}
              disabled={busy || status !== "round_active"}
              className="border border-neutral-400 px-3 py-1 rounded text-sm disabled:opacity-40"
            >
              End round → judging
            </button>
            <button
              onClick={() => host("reveal")}
              disabled={busy || (status !== "round_judging" && status !== "round_active")}
              className="border border-neutral-400 px-3 py-1 rounded text-sm disabled:opacity-40"
            >
              Reveal truth
            </button>
            <button
              onClick={() => host("new_round")}
              disabled={busy || status !== "revealed"}
              className="border border-neutral-400 px-3 py-1 rounded text-sm disabled:opacity-40"
            >
              New round
            </button>
          </div>
        </section>

        {(session.status === "revealed" || session.history.length > 0) && (
          <section className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold">Results</h2>
            {session.status === "revealed" &&
              session.round.revealed &&
              tallyRound(session, session.round)
                .filter((v) => v.kind === "ai" && v.totalVotes > 0)
                .map((v) => <VerdictBanner key={v.witnessId} v={v} />)}

            {session.status === "revealed" && session.round.revealed && (
              <div>
                <h3 className="font-semibold text-sm mb-2">
                  Round {session.round.number} — vote tally
                </h3>
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
                    {tallyRound(session, session.round).map((v) => (
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
                          </span>
                        </td>
                        <td className="py-1 pr-3 text-right">{v.humanVotes}</td>
                        <td className="py-1 pr-3 text-right">{v.aiVotes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(() => {
              const lb = leaderboard(session);
              if (lb.length === 0 || lb.every((r) => r.rounds === 0))
                return null;
              return (
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    Leaderboard (across rounds)
                  </h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left border-b border-neutral-300">
                        <th className="py-1 pr-3">Agent</th>
                        <th className="py-1 pr-3">Model</th>
                        <th className="py-1 pr-3 text-right">Rounds</th>
                        <th className="py-1 pr-3 text-right">Passes</th>
                        <th className="py-1 pr-3 text-right">Fails</th>
                        <th className="py-1 pr-3 text-right">Ties</th>
                        <th className="py-1 pr-3 text-right">Pass rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lb.map((r) => (
                        <tr
                          key={r.agentId}
                          className="border-b border-neutral-200"
                        >
                          <td className="py-1 pr-3 font-mono">{r.label}</td>
                          <td className="py-1 pr-3 text-xs text-neutral-600">
                            {r.model.replace(/^claude-/, "")}
                          </td>
                          <td className="py-1 pr-3 text-right">{r.rounds}</td>
                          <td className="py-1 pr-3 text-right text-emerald-700 font-semibold">
                            {r.passes}
                          </td>
                          <td className="py-1 pr-3 text-right text-rose-700">
                            {r.fails}
                          </td>
                          <td className="py-1 pr-3 text-right text-neutral-500">
                            {r.ties}
                          </td>
                          <td className="py-1 pr-3 text-right">
                            {r.rounds === 0
                              ? "—"
                              : `${Math.round(r.passRate * 100)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        )}

        <section className="lg:col-span-2">
          <h2 className="font-semibold mb-2">Live transcripts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.pairs.map((p) => {
              const findW = (id: string) =>
                session.agents.find((a) => a.id === id) ??
                session.participants.find((x) => x.id === id);
              const a = findW(p.aId);
              const b = findW(p.bId);
              const ms = session.round.transcripts[p.id] ?? [];
              const aIsAI = !!session.agents.find((x) => x.id === p.aId);
              const bIsAI = !!session.agents.find((x) => x.id === p.bId);
              return (
                <div key={p.id} className="border border-neutral-300 rounded p-3">
                  <div className="text-xs text-neutral-600 mb-2 flex items-center gap-2">
                    <span>
                      <strong>{a?.label}</strong> ({aIsAI ? "AI" : "human"}) ↔{" "}
                      <strong>{b?.label}</strong> ({bIsAI ? "AI" : "human"})
                    </span>
                    {aIsAI && bIsAI && status === "round_active" && (
                      <span className="ml-auto flex gap-1">
                        <button
                          className="text-xs border border-neutral-400 rounded px-2"
                          onClick={() =>
                            host("advance_ai", { pairId: p.id, witnessId: p.aId })
                          }
                        >
                          A→
                        </button>
                        <button
                          className="text-xs border border-neutral-400 rounded px-2"
                          onClick={() =>
                            host("advance_ai", { pairId: p.id, witnessId: p.bId })
                          }
                        >
                          B→
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
                    {ms.map((m) => {
                      const visible = m.displayAt <= now;
                      const isA = m.from === p.aId;
                      return (
                        <div
                          key={m.id}
                          className={isA ? "text-blue-800" : "text-emerald-800"}
                        >
                          <strong>{isA ? a?.label : b?.label}:</strong>{" "}
                          {visible ? m.text : <em className="text-neutral-400">…typing</em>}
                        </div>
                      );
                    })}
                    {ms.length === 0 && (
                      <div className="text-neutral-400">(no messages)</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
