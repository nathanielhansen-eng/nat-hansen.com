// Esper (1966), "Social transmission of an artificial language".
//
// Eight stimulus objects: four nonsense shapes x two colours (red/green). Each
// has a nonsense name (Bloomfield's originals, romanized to ASCII). A student
// learns the names to criterion, then reproduces them from memory; the
// reproduced set becomes the language taught to the next generation. Over a
// chain, morphological categories drift into existence — the published result.

import type { ChainTaskModule } from "./types";

// Canonical stimulus order, shared with the client UI.
// Index 0..7 = 1R,1G,2R,2G,3R,3G,4R,4G  (shape 1..4 x Red/Green).
export const STIMULI: { id: string; shape: number; color: "red" | "green" }[] = [
  { id: "1R", shape: 1, color: "red" },
  { id: "1G", shape: 1, color: "green" },
  { id: "2R", shape: 2, color: "red" },
  { id: "2G", shape: 2, color: "green" },
  { id: "3R", shape: 3, color: "red" },
  { id: "3G", shape: 3, color: "green" },
  { id: "4R", shape: 4, color: "red" },
  { id: "4G", shape: 4, color: "green" },
];

// Bloomfield's initial names (Esper Table 1, line 2), romanized:
// awa, vit, wuč, numbow, sotmiŋ, pel, feb, faʒa
export const SEED_NAMES = [
  "awa",
  "vit",
  "wuch",
  "numbow",
  "sotming",
  "pel",
  "feb",
  "fazha",
];

export type EsperSignal = { names: string[] }; // length 8, canonical order

export type EsperResponse = {
  names: string[]; // length 8, canonical order, reproduced from memory
  trials?: { id: string; typed: string; ms: number }[]; // optional telemetry
};

function isStringArray8(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length === 8 &&
    v.every((s) => typeof s === "string" && s.length <= 40)
  );
}

export const esperTask: ChainTaskModule = {
  id: "esper",
  title: "Esper (1966): artificial language transmission",
  blurb:
    "Learn names for 8 shape-colour objects, then reproduce them from memory. Your version is taught to the next student. Watch a 'totally suppletive' vocabulary drift toward morphological categories down the chain.",

  seed(): EsperSignal {
    return { names: [...SEED_NAMES] };
  },

  validateResponse(raw: unknown): EsperResponse | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (!isStringArray8(r.names)) return null;
    const names = (r.names as string[]).map((s) => s.trim().slice(0, 40));
    if (names.some((s) => s.length === 0)) return null;

    let trials: EsperResponse["trials"];
    if (Array.isArray(r.trials)) {
      if (r.trials.length > 64) return null;
      trials = [];
      for (const t of r.trials) {
        if (!t || typeof t !== "object") return null;
        const o = t as Record<string, unknown>;
        if (
          typeof o.id !== "string" ||
          typeof o.typed !== "string" ||
          typeof o.ms !== "number" ||
          !Number.isFinite(o.ms)
        )
          return null;
        trials.push({
          id: o.id.slice(0, 8),
          typed: o.typed.slice(0, 40),
          ms: Math.max(0, Math.round(o.ms)),
        });
      }
    }

    return trials ? { names, trials } : { names };
  },

  signalFromResponse(response: unknown): EsperSignal {
    const r = response as EsperResponse;
    return { names: [...r.names] };
  },
};
