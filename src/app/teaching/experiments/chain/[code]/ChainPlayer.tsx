"use client";

import { useCallback, useEffect, useState } from "react";
import { getTaskClient } from "../tasks/registry";
import type { ChainSnapshot } from "@/lib/chain/types";

const CANVAS = "#F5F5F4";
const INK = "#1C1917";
const MONO = "'Space Mono', monospace";
const SERIF = "'Crimson Pro', Georgia, serif";

type State =
  | { kind: "claiming" }
  | { kind: "busy" }
  | { kind: "ended" }
  | { kind: "error"; msg: string }
  | { kind: "playing"; taskId: string; chainId: string; n: number; input: unknown }
  | { kind: "done"; snapshot: ChainSnapshot; taskId: string };

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: CANVAS,
        fontFamily: SERIF,
        color: INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

export default function ChainPlayer({ code }: { code: string }) {
  const [state, setState] = useState<State>({ kind: "claiming" });
  // Kept separate from `state` so the task component stays mounted with its
  // real input while the submission is in flight.
  const [submitting, setSubmitting] = useState(false);

  // Claim a slot on mount; if all chains are momentarily busy, re-claim every
  // few seconds until one frees up.
  useEffect(() => {
    let stop = false;
    async function attempt() {
      try {
        const res = await fetch("/api/experiments/chain/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (stop) return;
        if (!res.ok) {
          setState({ kind: "error", msg: "This room is unavailable." });
          return;
        }
        const data = await res.json();
        if (stop) return;
        if (data.ok) {
          setState({
            kind: "playing",
            taskId: data.taskId,
            chainId: data.chainId,
            n: data.n,
            input: data.input,
          });
        } else if (data.reason === "busy") {
          setState({ kind: "busy" });
          if (!stop) setTimeout(attempt, 4000);
        } else {
          setState({ kind: "ended" });
        }
      } catch {
        if (!stop) setState({ kind: "error", msg: "Network error. Try refreshing." });
      }
    }
    attempt();
    return () => {
      stop = true;
    };
  }, [code]);

  const submit = useCallback(
    async (taskId: string, response: unknown) => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/experiments/chain/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, response }),
        });
        const data = await res.json();
        if (data.ok) {
          setState({ kind: "done", snapshot: data.snapshot, taskId });
        } else {
          setSubmitting(false);
          setState({
            kind: "error",
            msg:
              data.reason === "stale"
                ? "Someone else already submitted this slot."
                : "Could not submit — please tell the instructor.",
          });
        }
      } catch {
        setSubmitting(false);
        setState({ kind: "error", msg: "Network error submitting." });
      }
    },
    [code],
  );

  if (state.kind === "claiming")
    return (
      <Screen>
        <div style={{ fontFamily: MONO, letterSpacing: "0.1em" }}>
          Joining room {code}…
        </div>
      </Screen>
    );

  if (state.kind === "busy")
    return (
      <Screen>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, marginBottom: 12 }}>
            All chains are busy
          </h1>
          <p style={{ fontSize: 17, color: "#57534E" }}>
            Every chain is currently being worked on. You&apos;ll be slotted in
            automatically the moment one frees up — keep this tab open.
          </p>
        </div>
      </Screen>
    );

  if (state.kind === "ended")
    return (
      <Screen>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, marginBottom: 12 }}>
            This room is finished
          </h1>
          <p style={{ fontSize: 17, color: "#57534E" }}>
            Every chain has reached its final generation, or the instructor has
            closed the room. Thanks for taking part.
          </p>
        </div>
      </Screen>
    );

  if (state.kind === "error")
    return (
      <Screen>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 17, color: "#57534E" }}>{state.msg}</p>
        </div>
      </Screen>
    );

  if (state.kind === "playing") {
    const client = getTaskClient(state.taskId);
    if (!client)
      return (
        <Screen>
          <div>Unknown task: {state.taskId}</div>
        </Screen>
      );
    const Comp = client.Component;
    return (
      <Comp
        input={state.input}
        submitting={submitting}
        onSubmit={(r) => submit(state.taskId, r)}
      />
    );
  }

  // done — reveal the chain's drift
  const client = getTaskClient(state.taskId);
  const snap = state.snapshot;
  return (
    <Screen>
      <div style={{ maxWidth: 620, width: "100%" }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#78716C",
            marginBottom: 12,
          }}
        >
          Chain {snap.chainId} · done
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8 }}>
          Passed on. Thank you.
        </h1>
        <p style={{ fontSize: 16, color: "#57534E", marginBottom: 28 }}>
          Here is how this chain has drifted so far, generation by generation.
        </p>
        <div style={{ textAlign: "left" }}>
          <Row label="seed" node={client?.renderSummary(snap.seed)} />
          {snap.generations.map((g) => (
            <Row
              key={g.n}
              label={`gen ${g.n}${g.participantTag ? ` · ${g.participantTag}` : ""}`}
              node={client?.renderSummary(g.response)}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}

function Row({ label, node }: { label: string; node: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid #E7E5E4",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#78716C",
          width: 110,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div>{node}</div>
    </div>
  );
}
