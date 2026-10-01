"use client";

import { useState } from "react";
import type { Patch, Session } from "@/lib/turing/types";
import { detectionCurve, humanFlags } from "@/lib/turing/loop";

function pct(a: number, n: number) {
  return n === 0 ? "—" : `${Math.round((a / n) * 100)}%`;
}

export default function TellLoopPanel({
  session,
  busy,
  host,
}: {
  session: Session;
  busy: boolean;
  host: (action: string, extra?: Record<string, unknown>) => Promise<string | null>;
}) {
  const L = session.lineage ?? null;
  const [pick, setPick] = useState("");
  const [edit, setEdit] = useState<Patch | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const roundLive = session.status === "round_active";

  async function run(action: string, extra?: Record<string, unknown>) {
    setErr(null);
    const e = await host(action, extra);
    if (e) setErr(e);
    return e;
  }

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            humanFlags: humanFlags(session),
            session,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `turing-${session.code}-round${session.round.number}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!L) {
    const candidates = session.agents.filter((a) => a.brief.trim());
    return (
      <section className="lg:col-span-2 border border-amber-300 rounded p-3">
        <h2 className="font-semibold mb-1">Tell loop</h2>
        <p className="text-sm text-neutral-600 mb-2">
          Pick a saved AI. Judges&rsquo; marked giveaways patch it after each
          round; a frozen Gen 0 copy runs alongside as the control. You will
          need to pair the control with a human too.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">— choose an AI —</option>
            {candidates.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.brief.slice(0, 30)}…)
              </option>
            ))}
          </select>
          <button
            disabled={busy || !pick || roundLive}
            onClick={() => run("start_loop", { agentId: pick })}
            className="bg-black text-white px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            Start tell loop
          </button>
          <button
            onClick={exportJson}
            className="ml-auto text-sm border border-neutral-400 rounded px-3 py-1"
          >
            Export JSON
          </button>
        </div>
        {err && <p className="text-sm text-red-700 mt-2">{err}</p>}
      </section>
    );
  }

  const live = session.agents.find((a) => a.id === L.liveAgentId);
  const control = session.agents.find((a) => a.id === L.controlAgentId);
  const controlPaired = session.pairs.some(
    (p) => p.aId === L.controlAgentId || p.bId === L.controlAgentId
  );
  const livePaired = session.pairs.some(
    (p) => p.aId === L.liveAgentId || p.bId === L.liveAgentId
  );
  const curve = detectionCurve(session);
  const flags = humanFlags(session);
  const draft = L.draft;
  const shown = edit ?? draft;

  return (
    <section className="lg:col-span-2 border border-amber-300 rounded p-3 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Tell loop</h2>
        <span className="text-sm text-neutral-600">
          live <strong>{live?.label}</strong> at Gen {live?.generation ?? 0} ·
          control <strong>{control?.label}</strong> at Gen 0
        </span>
        <button
          onClick={exportJson}
          className="ml-auto text-sm border border-neutral-400 rounded px-3 py-1"
        >
          Export JSON
        </button>
        <button
          disabled={busy || roundLive}
          onClick={() => run("end_loop")}
          className="text-xs text-red-600 disabled:opacity-40"
        >
          end loop
        </button>
      </div>

      {(!livePaired || !controlPaired) && (
        <p className="text-sm text-amber-800">
          Pair {!livePaired && <strong>{live?.label}</strong>}
          {!livePaired && !controlPaired && " and "}
          {!controlPaired && <strong>{control?.label}</strong>} with a human
          below, then Save config.
        </p>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-1">
          Detection by round (share of judges who said AI)
        </h3>
        {curve.length === 0 ? (
          <p className="text-sm text-neutral-500">No revealed rounds yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-neutral-300">
                <th className="py-1 pr-3">Round</th>
                <th className="py-1 pr-3">Live gen</th>
                <th className="py-1 pr-3 text-right">Live caught</th>
                <th className="py-1 pr-3 text-right">Control caught</th>
                <th className="py-1 pr-3 text-right">Gap</th>
                <th className="py-1 pr-3 text-right">Marks on live</th>
              </tr>
            </thead>
            <tbody>
              {curve.map((r) => {
                const gap =
                  r.liveTotal && r.controlTotal
                    ? Math.round(
                        (r.controlAi / r.controlTotal - r.liveAi / r.liveTotal) * 100
                      )
                    : null;
                return (
                  <tr key={r.round} className="border-b border-neutral-200">
                    <td className="py-1 pr-3">{r.round}</td>
                    <td className="py-1 pr-3">Gen {r.generation}</td>
                    <td className="py-1 pr-3 text-right">
                      {pct(r.liveAi, r.liveTotal)}{" "}
                      <span className="text-neutral-500">
                        ({r.liveAi}/{r.liveTotal})
                      </span>
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {pct(r.controlAi, r.controlTotal)}{" "}
                      <span className="text-neutral-500">
                        ({r.controlAi}/{r.controlTotal})
                      </span>
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap} pts`}
                    </td>
                    <td className="py-1 pr-3 text-right">{r.tellsOnLive}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-xs text-neutral-500 mt-1">
          Gap = control caught minus live caught. Positive means the patched bot
          is harder to catch than the original, with the same judges in the
          same round.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-sm">Next generation</h3>
          {!draft && (
            <button
              disabled={busy || roundLive}
              onClick={() => run("draft_patch")}
              className="bg-black text-white px-3 py-1 rounded text-sm disabled:opacity-40"
            >
              {busy ? "Drafting…" : "Patch the bot"}
            </button>
          )}
        </div>
        {!draft && (
          <p className="text-sm text-neutral-500">
            After a reveal, drafts a patch for Gen {(live?.generation ?? 0) + 1}{" "}
            from the marks on the live bot. Nothing changes until you approve.
          </p>
        )}
        {shown && draft && (
          <div className="space-y-3 text-sm">
            <p className="text-neutral-600">
              From {draft.tellCount} marks (through round {draft.fromRound}).
            </p>
            <div>
              <div className="font-semibold mb-1">What gave it away</div>
              <ul className="space-y-1">
                {shown.themes.map((t, i) => (
                  <li key={i}>
                    <strong>{t.theme}</strong>: {t.note}{" "}
                    <span className="text-neutral-500">
                      {t.quotes.map((q) => `“${q}”`).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <label className="block">
              <span className="font-semibold">
                Exemplars (real human lines, one per line)
              </span>
              <textarea
                rows={Math.max(3, shown.exemplars.length + 1)}
                value={shown.exemplars.join("\n")}
                onChange={(e) =>
                  setEdit({ ...shown, exemplars: e.target.value.split("\n") })
                }
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 font-mono"
              />
            </label>
            <label className="block">
              <span className="font-semibold">
                Reminder (the last thing the bot reads)
              </span>
              <textarea
                rows={4}
                value={shown.reminder}
                onChange={(e) => setEdit({ ...shown, reminder: e.target.value })}
                className="mt-1 w-full border border-neutral-300 rounded px-2 py-1 font-mono"
              />
            </label>
            <div className="flex gap-2">
              <button
                disabled={busy || roundLive}
                onClick={async () => {
                  const patch = {
                    themes: shown.themes,
                    exemplars: shown.exemplars.filter((x) => x.trim()),
                    reminder: shown.reminder,
                  };
                  if (!(await run("approve_patch", { patch }))) setEdit(null);
                }}
                className="bg-black text-white px-3 py-1 rounded disabled:opacity-40"
              >
                Approve → Gen {(live?.generation ?? 0) + 1}
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  await run("discard_draft");
                  setEdit(null);
                }}
                className="border border-neutral-400 px-3 py-1 rounded"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-1">
          Human writing marked as bot ({flags.length})
        </h3>
        {flags.length === 0 ? (
          <p className="text-sm text-neutral-500">
            None yet. Lines students wrote that judges voted bot on and marked
            will collect here.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {flags.map((f, i) => (
              <li key={i}>
                <span className="text-neutral-500">
                  R{f.round} · {f.label} · {f.judges} judge
                  {f.judges === 1 ? "" : "s"}:
                </span>{" "}
                &ldquo;{f.message}&rdquo;{" "}
                <span className="text-amber-800">
                  marked {f.marked.map((m) => `“${m}”`).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {L.generations.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            Generation history ({L.generations.length - 1} patches)
          </summary>
          <ol className="mt-2 space-y-2">
            {L.generations.slice(1).map((g) => (
              <li key={g.n} className="border-l-2 border-amber-300 pl-2">
                <div>
                  <strong>Gen {g.n}</strong> · {g.tellCount} marks through round{" "}
                  {g.fromRound} ·{" "}
                  {g.patch?.themes.map((t) => t.theme).join("; ")}
                </div>
                <div className="font-mono text-xs text-neutral-600 whitespace-pre-wrap">
                  {g.patch?.reminder}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}

      {err && <p className="text-sm text-red-700">{err}</p>}
    </section>
  );
}
