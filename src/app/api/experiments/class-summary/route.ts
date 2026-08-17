import { list, get } from "@vercel/blob";
import { loadRoom } from "@/lib/chain/store";

// Cross-site class summary (consumed server-to-server by the ux-phi course
// dashboard's Experiments tab). Serves pre-aggregated, non-identifying
// results for one class session of one experiment — never raw submissions,
// never demographics, never free text. Per-record rows carry only the values
// a class dataviz needs, plus the opaque `tag` a launching site may have
// attached (see the tag param on the experiment pages) so a student can be
// shown their own dot. Optionally gated: set EXPERIMENTS_SUMMARY_TOKEN and
// callers must send it as a bearer token; unset, the endpoint is open but
// still aggregate-only.

export const dynamic = "force-dynamic";

const BLOB_EXPERIMENTS = new Set([
  "knobe-side-effect",
  "brown-lenneberg",
  "heider-focal-colors",
  "winawer-russian-blues",
  "reuter-truth",
  // Side-effect-effect family — served via the generic condition-cell
  // summarizer below (see ASYMMETRY_SPECS).
  "machery-tradeoff",
  "pettit-knobe-decided",
  "sripada-deepself",
  "uttich-lombrozo-norms",
  "nadelhoffer-blame",
  "phillips-alternatives",
  "lindauer-cancelling",
]);

// Generic between-subjects summarizer for the side-effect-effect experiments.
// Each spec declares how to key a submission into a condition CELL (one or more
// fields joined by "|"), which numeric fields to average, and which boolean
// fields to report as a proportion. The ux-phi Experiments tab reads the same
// uniform shape for every one of these, so a new experiment is a spec entry
// here plus a reference-values entry there — no bespoke aggregation code.
type AsymmetrySpec = {
  cellFields: string[];
  num?: string[];
  bool?: string[];
};
const ASYMMETRY_SPECS: Record<string, AsymmetrySpec> = {
  "machery-tradeoff": { cellFields: ["condition"], bool: ["intentional"] },
  "pettit-knobe-decided": { cellFields: ["condition"], num: ["rating"] },
  "sripada-deepself": { cellFields: ["condition"], num: ["rating"], bool: ["intentional"] },
  "uttich-lombrozo-norms": { cellFields: ["normType", "normStatus"], num: ["rating"] },
  "nadelhoffer-blame": { cellFields: ["condition"], num: ["rating"], bool: ["knowingly", "intentional"] },
  "phillips-alternatives": { cellFields: ["condition"], num: ["intentional", "relevanceAgree"] },
  "lindauer-cancelling": { cellFields: ["condition"], num: ["rating"] },
};

function summarizeAsymmetry(
  submissions: Record<string, unknown>[],
  spec: AsymmetrySpec,
  tag: string | null,
) {
  const cellKey = (s: Record<string, unknown>): string | null => {
    const parts: string[] = [];
    for (const f of spec.cellFields) {
      const v = s[f];
      if (typeof v !== "string" || !v) return null;
      parts.push(v);
    }
    return parts.join("|");
  };
  const cells = new Map<
    string,
    { n: number; numSums: Record<string, number>; numN: Record<string, number>; boolYes: Record<string, number> }
  >();
  let ownCell: string | null = null;
  let ownValues: Record<string, number | boolean> | null = null;
  for (const s of submissions) {
    const key = cellKey(s);
    if (key === null) continue;
    let c = cells.get(key);
    if (!c) {
      c = { n: 0, numSums: {}, numN: {}, boolYes: {} };
      cells.set(key, c);
    }
    c.n++;
    const own = tagOf(s) === tag && tag !== null;
    const vals: Record<string, number | boolean> = {};
    for (const f of spec.num ?? []) {
      const v = s[f];
      if (typeof v === "number" && Number.isFinite(v)) {
        c.numSums[f] = (c.numSums[f] ?? 0) + v;
        c.numN[f] = (c.numN[f] ?? 0) + 1;
        vals[f] = v;
      }
    }
    for (const f of spec.bool ?? []) {
      const v = s[f];
      if (typeof v === "boolean") {
        if (v) c.boolYes[f] = (c.boolYes[f] ?? 0) + 1;
        vals[f] = v;
      }
    }
    if (own) {
      ownCell = key;
      ownValues = vals;
    }
  }
  const cellList = [...cells.entries()].map(([key, c]) => {
    const means: Record<string, number> = {};
    for (const f of spec.num ?? []) means[f] = c.numN[f] ? c.numSums[f] / c.numN[f] : 0;
    const pct: Record<string, { yes: number; n: number }> = {};
    for (const f of spec.bool ?? []) pct[f] = { yes: c.boolYes[f] ?? 0, n: c.n };
    return { key, n: c.n, means, pct };
  });
  const n = cellList.reduce((t, c) => t + c.n, 0);
  return {
    aggregate: { n, cells: cellList },
    yours: ownCell ? { cell: ownCell, values: ownValues } : null,
  };
}

function sanitizeSession(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}

async function loadSubmissions(
  experiment: string,
  session: string,
): Promise<Record<string, unknown>[]> {
  const prefix = `${experiment}/${session}/`;
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) pathnames.push(b.pathname);
    cursor = page.cursor;
  } while (cursor);

  const fetched = await Promise.all(
    pathnames.map(async (p) => {
      try {
        const r = await get(p, { access: "private" });
        if (!r || r.statusCode !== 200) return null;
        const text = await new Response(r.stream).text();
        return JSON.parse(text);
      } catch {
        return null;
      }
    }),
  );
  return fetched.filter((x): x is Record<string, unknown> => x !== null);
}

const mean = (a: number[]) =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

const tagOf = (s: Record<string, unknown>): string | null =>
  typeof s.tag === "string" && s.tag ? s.tag : null;

type NamingRowLoose = {
  id?: unknown;
  hex?: unknown;
  munsell?: unknown;
  type?: unknown;
  name?: unknown;
  exposed?: unknown;
  correct?: unknown;
  recognized?: unknown;
  time?: unknown;
  letters?: unknown;
};

// Per-swatch class aggregate, admin-dashboard style: the top modal names
// (lowercased), mean naming time, and accuracy among exposed rows. Free-typed
// labels surface ONLY here, as class-level modal names — never per record.
function summarizeSwatches(
  submissions: Record<string, unknown>[],
  correctKey: "correct" | "recognized",
) {
  const per = new Map<
    number,
    {
      hex: string;
      munsell: string | null;
      type: string;
      names: Map<string, number>;
      times: number[];
      exposed: number;
      hits: number;
    }
  >();
  for (const s of submissions) {
    if (!Array.isArray(s.naming)) continue;
    for (const r of s.naming as NamingRowLoose[]) {
      if (typeof r.id !== "number") continue;
      let rec = per.get(r.id);
      if (!rec) {
        rec = {
          hex: typeof r.hex === "string" ? r.hex : "#888888",
          munsell: typeof r.munsell === "string" ? r.munsell : null,
          type: typeof r.type === "string" ? r.type : "",
          names: new Map(),
          times: [],
          exposed: 0,
          hits: 0,
        };
        per.set(r.id, rec);
      }
      const name =
        typeof r.name === "string" ? r.name.toLowerCase().trim() : "";
      if (name) rec.names.set(name, (rec.names.get(name) ?? 0) + 1);
      if (typeof r.time === "number") rec.times.push(r.time);
      if (r.exposed === true) {
        rec.exposed++;
        if (r[correctKey] === true) rec.hits++;
      }
    }
  }
  return [...per.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, v]) => ({
      id,
      hex: v.hex,
      munsell: v.munsell,
      type: v.type,
      topNames: [...v.names.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
      meanTime: mean(v.times),
      exposed: v.exposed,
      hits: v.hits,
    }));
}

// The tagged student's own naming rows — their labels and times, returned
// only for the tag the caller supplies.
function yoursFor(
  submissions: Record<string, unknown>[],
  tag: string | null,
  correctKey: "correct" | "recognized",
) {
  if (!tag) return null;
  const own = submissions.find((s) => tagOf(s) === tag);
  if (!own || !Array.isArray(own.naming)) return null;
  return (own.naming as NamingRowLoose[])
    .filter((r) => typeof r.id === "number")
    .map((r) => ({
      id: r.id as number,
      name: typeof r.name === "string" ? r.name : "",
      time: typeof r.time === "number" ? r.time : null,
      exposed: r.exposed === true,
      hit: r[correctKey] === true,
    }));
}

function summarizeKnobe(submissions: Record<string, unknown>[]) {
  const records = submissions
    .filter(
      (s) =>
        (s.study === 1 || s.study === 2) &&
        (s.condition === "harm" || s.condition === "help") &&
        typeof s.rating === "number" &&
        typeof s.intentional === "boolean",
    )
    .map((s) => ({
      study: s.study as 1 | 2,
      condition: s.condition as "harm" | "help",
      rating: s.rating as number,
      intentional: s.intentional as boolean,
      tag: tagOf(s),
    }));
  const cell = (study: 1 | 2, condition: "harm" | "help") => {
    const rows = records.filter(
      (r) => r.study === study && r.condition === condition,
    );
    return {
      n: rows.length,
      yes: rows.filter((r) => r.intentional).length,
      meanRating: mean(rows.map((r) => r.rating)),
    };
  };
  return {
    records,
    aggregate: {
      n: records.length,
      byStudy: {
        1: { harm: cell(1, "harm"), help: cell(1, "help") },
        2: { harm: cell(2, "harm"), help: cell(2, "help") },
      },
    },
  };
}

function summarizeBrownLenneberg(submissions: Record<string, unknown>[]) {
  // Admin-dashboard semantics: accuracy and naming time over EXPOSED rows
  // (the 4-item recognition set), per type.
  const perType = (rows: NamingRowLoose[], type: string) => {
    const t = rows.filter((r) => r.type === type && r.exposed === true);
    return {
      correct: t.filter((r) => r.correct === true).length,
      total: t.length,
      meanTime: mean(
        t.map((r) => (typeof r.time === "number" ? r.time : 0)),
      ),
    };
  };
  const records = submissions
    .filter((s) => Array.isArray(s.naming))
    .map((s) => {
      const rows = s.naming as NamingRowLoose[];
      return {
        focal: perType(rows, "focal"),
        boundary: perType(rows, "boundary"),
        tag: tagOf(s),
      };
    });
  const total = (pick: (r: (typeof records)[number]) => { correct: number; total: number; meanTime: number }) => {
    const cells = records.map(pick);
    const totalN = cells.reduce((n, c) => n + c.total, 0);
    return {
      correct: cells.reduce((n, c) => n + c.correct, 0),
      total: totalN,
      meanTime: mean(cells.filter((c) => c.total > 0).map((c) => c.meanTime)),
    };
  };
  return {
    records,
    aggregate: {
      n: records.length,
      focal: total((r) => r.focal),
      boundary: total((r) => r.boundary),
    },
  };
}

function summarizeHeider(submissions: Record<string, unknown>[]) {
  const TYPES = ["focal", "internominal", "boundary"] as const;
  const records = submissions
    .filter((s) => Array.isArray(s.naming))
    .map((s) => {
      const rows = s.naming as NamingRowLoose[];
      const byType = Object.fromEntries(
        TYPES.map((type) => {
          const t = rows.filter((r) => r.type === type && r.exposed === true);
          return [
            type,
            {
              recognized: t.filter((r) => r.recognized === true).length,
              total: t.length,
            },
          ];
        }),
      ) as Record<(typeof TYPES)[number], { recognized: number; total: number }>;
      const focalRows = rows.filter((r) => r.type === "focal");
      const nonFocalRows = rows.filter((r) => r.type !== "focal");
      return {
        byType,
        letters: {
          focal: mean(focalRows.map((r) => (typeof r.letters === "number" ? r.letters : 0))),
          nonFocal: mean(nonFocalRows.map((r) => (typeof r.letters === "number" ? r.letters : 0))),
        },
        time: {
          focal: mean(focalRows.map((r) => (typeof r.time === "number" ? r.time : 0))),
          nonFocal: mean(nonFocalRows.map((r) => (typeof r.time === "number" ? r.time : 0))),
        },
        tag: tagOf(s),
      };
    });
  const aggType = (type: (typeof TYPES)[number]) => ({
    recognized: records.reduce((n, r) => n + r.byType[type].recognized, 0),
    total: records.reduce((n, r) => n + r.byType[type].total, 0),
  });
  return {
    records,
    aggregate: {
      n: records.length,
      byType: {
        focal: aggType("focal"),
        internominal: aggType("internominal"),
        boundary: aggType("boundary"),
      },
      letters: {
        focal: mean(records.map((r) => r.letters.focal)),
        nonFocal: mean(records.map((r) => r.letters.nonFocal)),
      },
      time: {
        focal: mean(records.map((r) => r.time.focal)),
        nonFocal: mean(records.map((r) => r.time.nonFocal)),
      },
    },
  };
}

/* ------------------------- winawer-russian-blues ---------------------- *
 * Speeded colour discrimination across the Russian siniy/goluboy border
 * (Winawer et al. 2007, PNAS 104(19), 7780–7785, doi:10.1073/pnas.0701644104).
 * Unlike the vignette studies this is a within-subjects RT design, so the
 * summary reports design cells (interference x distance x category) plus the
 * per-participant category advantage the paper plots in Fig. 3.
 * Categories are recomputed against each participant's own elicited boundary,
 * as the paper does (p. 7781). No naming free text exists here to leak.
 * -------------------------------------------------------------------- */
type WinawerInterference = "none" | "spatial" | "verbal";
const WINAWER_INTERFERENCE: WinawerInterference[] = ["none", "spatial", "verbal"];
const WINAWER_RT_CEILING = 3000; // Winawer p. 7782

type WinawerTrial = {
  interference: WinawerInterference;
  target: number;
  distractor: number;
  distance: number;
  correct: boolean;
  rtMs: number;
  probeCorrect: boolean | null;
};

function winawerCross(a: number, b: number, boundary: number): boolean {
  if (a === boundary || b === boundary) return true;
  return a < boundary !== b < boundary;
}

function winawerKeep(t: WinawerTrial): boolean {
  if (!t.correct) return false;
  if (t.rtMs > WINAWER_RT_CEILING) return false;
  if (t.interference !== "none" && t.probeCorrect === false) return false;
  return true;
}

function summarizeWinawer(submissions: Record<string, unknown>[], tag: string | null) {
  const people = submissions
    .filter((s) => Array.isArray(s.trials) && typeof s.boundary === "number")
    .map((s) => {
      const trials: WinawerTrial[] = [];
      for (const raw of s.trials as Record<string, unknown>[]) {
        if (!raw || typeof raw !== "object") continue;
        if (
          typeof raw.target !== "number" ||
          typeof raw.distractor !== "number" ||
          typeof raw.distance !== "number" ||
          typeof raw.rtMs !== "number" ||
          typeof raw.correct !== "boolean" ||
          typeof raw.interference !== "string"
        ) {
          continue;
        }
        trials.push({
          interference: raw.interference as WinawerInterference,
          target: raw.target,
          distractor: raw.distractor,
          distance: raw.distance,
          correct: raw.correct,
          rtMs: raw.rtMs,
          probeCorrect: typeof raw.probeCorrect === "boolean" ? raw.probeCorrect : null,
        });
      }
      return {
        tag: tagOf(s),
        boundary: s.boundary as number,
        boundaryAmbiguous: s.boundaryAmbiguous === true,
        trials,
      };
    })
    .filter((p) => p.trials.length > 0);

  const cellRts = (
    p: (typeof people)[number],
    interference: WinawerInterference,
    distance: number,
    cross: boolean,
  ) =>
    p.trials
      .filter(
        (t) =>
          t.interference === interference &&
          t.distance === distance &&
          winawerCross(t.target, t.distractor, p.boundary) === cross &&
          winawerKeep(t),
      )
      .map((t) => t.rtMs);

  // Per-participant category advantage (within − cross), the DV of Fig. 3.
  const advantagesFor = (p: (typeof people)[number]) => {
    const out: { interference: WinawerInterference; distance: number; advantage: number }[] = [];
    for (const interference of WINAWER_INTERFERENCE) {
      for (const distance of [2, 4]) {
        const cross = cellRts(p, interference, distance, true);
        const within = cellRts(p, interference, distance, false);
        if (!cross.length || !within.length) continue;
        out.push({ interference, distance, advantage: mean(within) - mean(cross) });
      }
    }
    return out;
  };

  const records = people.map((p) => {
    const all = p.trials.length;
    const kept = p.trials.filter(winawerKeep).length;
    return {
      tag: p.tag,
      boundary: p.boundary,
      boundaryAmbiguous: p.boundaryAmbiguous,
      accuracy: all ? p.trials.filter((t) => t.correct).length / all : 0,
      kept,
      total: all,
      advantages: advantagesFor(p),
    };
  });

  const cells: {
    interference: WinawerInterference;
    distance: number;
    category: "cross" | "within";
    n: number;
    meanRt: number;
  }[] = [];
  for (const interference of WINAWER_INTERFERENCE) {
    for (const distance of [2, 4]) {
      for (const category of ["cross", "within"] as const) {
        const rts = people.flatMap((p) => cellRts(p, interference, distance, category === "cross"));
        cells.push({ interference, distance, category, n: rts.length, meanRt: mean(rts) });
      }
    }
  }

  // Class-level advantage: mean over participants, so every participant counts
  // once regardless of how many trials survived their exclusions.
  const advantage = WINAWER_INTERFERENCE.flatMap((interference) =>
    [2, 4].map((distance) => {
      const vals = records
        .map((r) => r.advantages.find((a) => a.interference === interference && a.distance === distance))
        .filter((a): a is { interference: WinawerInterference; distance: number; advantage: number } => !!a)
        .map((a) => a.advantage);
      return { interference, distance, mean: mean(vals), n: vals.length };
    }),
  );

  const boundaries = people.map((p) => p.boundary);
  const bMean = mean(boundaries);
  const bSd =
    boundaries.length > 1
      ? Math.sqrt(
          boundaries.reduce((s, x) => s + (x - bMean) * (x - bMean), 0) / (boundaries.length - 1),
        )
      : 0;

  const allTrials = people.flatMap((p) => p.trials);
  const keptTrials = allTrials.filter(winawerKeep);

  return {
    records,
    aggregate: {
      n: people.length,
      trials: allTrials.length,
      accuracy: allTrials.length
        ? allTrials.filter((t) => t.correct).length / allTrials.length
        : 0,
      exclusionRate: allTrials.length ? 1 - keptTrials.length / allTrials.length : 0,
      boundary: { mean: bMean, sd: bSd, n: boundaries.length },
      cells,
      advantage,
    },
    yours: tag ? (records.find((r) => r.tag === tag) ?? null) : null,
  };
}

function summarizeReuterTruth(submissions: Record<string, unknown>[]) {
  const SCEN = new Set(["party", "rolex"]);
  const ANS = new Set(["true", "false", "notsure"]);
  const YN = new Set(["yes", "no"]);
  type Scen = "party" | "rolex";
  type Ans = "true" | "false" | "notsure";
  type Yn = "yes" | "no";
  // part3Explanation is deliberately excluded: free text never leaves the
  // instructor dashboard.
  const records = submissions
    .filter(
      (s) =>
        typeof s.part1Scenario === "string" &&
        SCEN.has(s.part1Scenario) &&
        typeof s.part2Scenario === "string" &&
        SCEN.has(s.part2Scenario) &&
        typeof s.part1Answer === "string" &&
        ANS.has(s.part1Answer) &&
        typeof s.part2Answer === "string" &&
        ANS.has(s.part2Answer) &&
        typeof s.part3BestKnowledge === "string" &&
        YN.has(s.part3BestKnowledge) &&
        typeof s.part3Correct === "string" &&
        YN.has(s.part3Correct),
    )
    .map((s) => ({
      part1Scenario: s.part1Scenario as Scen,
      part1Answer: s.part1Answer as Ans,
      part2Scenario: s.part2Scenario as Scen,
      part2Answer: s.part2Answer as Ans,
      part3BestKnowledge: s.part3BestKnowledge as Yn,
      part3Correct: s.part3Correct as Yn,
      tag: tagOf(s),
    }));
  const cell = (part: 1 | 2, scenario: Scen) => {
    const rows = records.filter(
      (r) => (part === 1 ? r.part1Scenario : r.part2Scenario) === scenario,
    );
    const a = (v: Ans) =>
      rows.filter((r) => (part === 1 ? r.part1Answer : r.part2Answer) === v).length;
    return { n: rows.length, true: a("true"), false: a("false"), notsure: a("notsure") };
  };
  return {
    records,
    aggregate: {
      n: records.length,
      part1: { party: cell(1, "party"), rolex: cell(1, "rolex") },
      part2: { party: cell(2, "party"), rolex: cell(2, "rolex") },
      part3: {
        bestKnowledgeYes: records.filter((r) => r.part3BestKnowledge === "yes").length,
        correctYes: records.filter((r) => r.part3Correct === "yes").length,
        trueButNotCorrect: records.filter(
          (r) => r.part1Answer === "true" && r.part3Correct === "no",
        ).length,
      },
    },
  };
}

export async function GET(request: Request) {
  const token = process.env.EXPERIMENTS_SUMMARY_TOKEN;
  if (token) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${token}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const experiment = url.searchParams.get("experiment") ?? "";
  const sessionParam = url.searchParams.get("session") ?? "";

  if (experiment === "chain") {
    const code = sessionParam.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const room = code ? await loadRoom(code) : null;
    if (!room) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    // Rooms are anonymous by construction (P-k tags); strip nothing but
    // internal bookkeeping.
    return Response.json({
      ok: true,
      experiment,
      session: room.code,
      room: {
        code: room.code,
        status: room.status,
        taskId: room.config.taskId,
        cap: room.config.cap,
        chains: room.chains.map((c) => ({
          id: c.id,
          closed: c.closed,
          seed: c.seed,
          generations: c.generations
            .filter((g) => g.response !== null)
            .map((g) => ({
              n: g.n,
              participantTag: g.participantTag,
              response: g.response,
              submittedAt: g.submittedAt,
            })),
        })),
      },
    });
  }

  if (!BLOB_EXPERIMENTS.has(experiment)) {
    return Response.json({ ok: false, error: "unknown experiment" }, { status: 400 });
  }

  // Discovery mode: just the session names under this experiment (for
  // wiring a course config), no records.
  if (url.searchParams.get("sessions") === "1") {
    const sessions = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `${experiment}/`, cursor, limit: 1000 });
      for (const b of page.blobs) {
        const parts = b.pathname.split("/");
        if (parts.length >= 3) sessions.add(parts[1]);
      }
      cursor = page.cursor;
    } while (cursor);
    return Response.json({ ok: true, experiment, sessions: [...sessions].sort() });
  }

  const session = sanitizeSession(sessionParam);
  if (!session) {
    return Response.json({ ok: false, error: "session required" }, { status: 400 });
  }

  const submissions = await loadSubmissions(experiment, session);
  const tagParam = url.searchParams.get("tag");
  const tag =
    typeof tagParam === "string"
      ? tagParam.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || null
      : null;

  if (experiment === "knobe-side-effect") {
    return Response.json({
      ok: true,
      experiment,
      session,
      ...summarizeKnobe(submissions),
    });
  }
  if (experiment in ASYMMETRY_SPECS) {
    return Response.json({
      ok: true,
      experiment,
      session,
      ...summarizeAsymmetry(submissions, ASYMMETRY_SPECS[experiment], tag),
    });
  }
  if (experiment === "winawer-russian-blues") {
    return Response.json({
      ok: true,
      experiment,
      session,
      ...summarizeWinawer(submissions, tag),
    });
  }
  if (experiment === "reuter-truth") {
    return Response.json({
      ok: true,
      experiment,
      session,
      ...summarizeReuterTruth(submissions),
    });
  }
  const correctKey = experiment === "brown-lenneberg" ? "correct" : "recognized";
  const summary =
    experiment === "brown-lenneberg"
      ? summarizeBrownLenneberg(submissions)
      : summarizeHeider(submissions);
  return Response.json({
    ok: true,
    experiment,
    session,
    ...summary,
    swatches: summarizeSwatches(submissions, correctKey),
    yours: yoursFor(submissions, tag, correctKey),
  });
}
