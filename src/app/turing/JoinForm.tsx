"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"participant" | "judge">("participant");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const upper = code.trim().toUpperCase();
    const r = await fetch("/api/turing/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: upper, name: name.trim(), role }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(await r.text());
      return;
    }
    router.push(role === "participant" ? `/turing/play/${upper}` : `/turing/judge/${upper}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm">
        Room code
        <input
          autoCapitalize="characters"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="mt-1 block w-full border border-neutral-300 px-3 py-2 rounded font-mono tracking-widest uppercase"
          placeholder="ABCDE"
          maxLength={8}
        />
      </label>
      <label className="text-sm">
        Your name (visible only to host & judges)
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border border-neutral-300 px-3 py-2 rounded"
          maxLength={60}
        />
      </label>
      <fieldset className="text-sm">
        <legend className="mb-1">Role</legend>
        <label className="mr-4">
          <input
            type="radio"
            checked={role === "participant"}
            onChange={() => setRole("participant")}
          />{" "}
          Participant
        </label>
        <label>
          <input
            type="radio"
            checked={role === "judge"}
            onChange={() => setRole("judge")}
          />{" "}
          Judge
        </label>
      </fieldset>
      <button
        type="submit"
        disabled={busy}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join"}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
