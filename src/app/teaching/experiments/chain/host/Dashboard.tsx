"use client";

import { useCallback, useEffect, useState } from "react";
import { getTaskClient } from "../tasks/registry";
import type { Room } from "@/lib/chain/types";

const CANVAS = "#F5F5F4";
const INK = "#1A1814";
const MONO = "'Space Mono', monospace";
const SERIF = "'Crimson Pro', Georgia, serif";
const LS_KEY = "chain_host_room";

type TaskMeta = { id: string; title: string; blurb: string };

const mono = (size = 11): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#9A8866",
});

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskMeta[]>([]);
  const [taskId, setTaskId] = useState("esper");
  const [numChains, setNumChains] = useState(5);
  const [cap, setCap] = useState(8);
  const [code, setCode] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null,
  );
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/experiments/chain/host")
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async (c: string) => {
    try {
      const r = await fetch(`/api/experiments/chain/host?code=${c}`);
      if (r.ok) setRoom(await r.json().then((d) => d.room));
    } catch {}
  }, []);

  useEffect(() => {
    if (!code) return;
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`/api/experiments/chain/host?code=${code}`);
        if (r.ok && !stop) setRoom(await r.json().then((d) => d.room));
      } catch {}
    };
    load();
    const i = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(i);
    };
  }, [code]);

  async function create() {
    const r = await fetch("/api/experiments/chain/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", taskId, numChains, cap }),
    });
    const d = await r.json();
    if (d.ok) {
      localStorage.setItem(LS_KEY, d.code);
      setRoom(null);
      setCode(d.code);
    }
  }

  async function endRoom() {
    if (!code || !confirm("Close this room? Students can no longer submit.")) return;
    await fetch("/api/experiments/chain/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", code }),
    });
    refresh(code);
  }

  function newRoom() {
    localStorage.removeItem(LS_KEY);
    setCode(null);
    setRoom(null);
  }

  function download() {
    if (!room) return;
    const blob = new Blob([JSON.stringify(room, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chain-${room.code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const shareUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/teaching/experiments/chain/${code}`
      : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: CANVAS,
        fontFamily: SERIF,
        color: INK,
        padding: "32px 24px 80px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={mono()}>Instructor · transmission chains</div>
        <h1 style={{ fontSize: 34, fontWeight: 400, margin: "6px 0 24px" }}>
          Run a telephone-game experiment
        </h1>

        {/* Create */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD5C0",
            padding: 24,
            marginBottom: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "flex-end",
          }}
        >
          <Field label="Experiment">
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              style={inputStyle}
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parallel chains">
            <input
              type="number"
              min={1}
              max={26}
              value={numChains}
              onChange={(e) => setNumChains(Number(e.target.value))}
              style={{ ...inputStyle, width: 90 }}
            />
          </Field>
          <Field label="Generations / chain">
            <input
              type="number"
              min={2}
              max={60}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              style={{ ...inputStyle, width: 90 }}
            />
          </Field>
          <button onClick={create} style={primaryBtn}>
            Create room →
          </button>
        </div>

        {tasks.find((t) => t.id === taskId) && !room && (
          <p style={{ color: "#5b5347", fontSize: 16, maxWidth: 680 }}>
            {tasks.find((t) => t.id === taskId)!.blurb}
          </p>
        )}

        {/* Live room */}
        {code && room && (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                alignItems: "center",
                margin: "10px 0 22px",
              }}
            >
              <div>
                <div style={mono(10)}>Room code</div>
                <div style={{ fontSize: 40, fontFamily: MONO, letterSpacing: "0.15em" }}>
                  {room.code}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={mono(10)}>Student link</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <code
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      background: "#FFF",
                      border: "1px solid #DDD5C0",
                      padding: "8px 10px",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {shareUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    style={ghostBtn}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={download} style={ghostBtn}>
                  Download JSON
                </button>
                {room.status === "open" ? (
                  <button onClick={endRoom} style={ghostBtn}>
                    End room
                  </button>
                ) : (
                  <span style={{ ...mono(11), color: "#C0392B" }}>Ended</span>
                )}
                <button onClick={newRoom} style={ghostBtn}>
                  New room
                </button>
              </div>
            </div>

            <ChainGrid room={room} />
          </>
        )}
      </div>
    </div>
  );
}

function ChainGrid({ room }: { room: Room }) {
  const client = getTaskClient(room.config.taskId);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(room.chains.length, 4)}, 1fr)`,
        gap: 16,
      }}
    >
      {room.chains.map((c) => {
        const submitted = c.generations.filter((g) => g.response !== null);
        const inflight = c.generations.find(
          (g) => g.response === null && g.startedAt !== null,
        );
        return (
          <div
            key={c.id}
            style={{ background: "#FFF", border: "1px solid #DDD5C0", padding: 14 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <strong style={{ fontSize: 18 }}>Chain {c.id}</strong>
              <span style={mono(10)}>
                {submitted.length}/{room.config.cap}
                {c.closed ? " · done" : ""}
              </span>
            </div>
            <Line label="seed" node={client?.renderSummary(c.seed)} muted />
            {submitted.map((g) => (
              <Line
                key={g.n}
                label={`g${g.n} ${g.participantTag ?? ""}`}
                node={client?.renderSummary(g.response)}
              />
            ))}
            {inflight && !c.closed && (
              <div style={{ ...mono(10), padding: "6px 0", color: "#C99A3A" }}>
                {inflight.participantTag ?? "someone"} working…
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Line({
  label,
  node,
  muted,
}: {
  label: string;
  node: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        padding: "6px 0",
        borderTop: "1px solid #EFE8D6",
        opacity: muted ? 0.6 : 1,
      }}
    >
      <div style={{ ...mono(9), marginBottom: 3 }}>{label}</div>
      {node}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ ...mono(10), marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #DDD5C0",
  padding: "10px 12px",
  fontSize: 16,
  fontFamily: SERIF,
  background: "#FDFAF5",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  background: INK,
  color: CANVAS,
  border: "none",
  padding: "12px 28px",
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: INK,
  border: `1px solid ${INK}`,
  padding: "8px 16px",
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
};
