// Statistics for class-sized experiment data. All pure functions.
// erfc and chiSquare2x2 are lifted from the Knobe (2003) admin dashboard,
// where chiSquare2x2 was validated against Knobe's published value
// (32/7 vs 9/30 → χ² = 27.2) and the p routine against standard critical
// points (χ² = 3.841 → p = .05001).

/* Numerical Recipes complementary error function; |err| < 1.2e-7.
   For df = 1, the chi-square upper-tail p equals erfc(sqrt(x2/2)). */
export function erfc(x: number): number {
  const cof = [
    -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-11, -6.886027e-12,
    -1.0104e-12, 3.849e-13,
  ];
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

export interface Chi2x2 {
  x2: number;
  p: number;
  /** Cohen's w (= Cramér's V for a 2×2 table). */
  w: number;
  n: number;
  minExp: number;
}

/** Pearson chi-square test of association for a 2×2 table, uncorrected,
 *  df = 1. Returns null for empty or degenerate tables (an all-zero row
 *  or column). When minExp < 5, show the result but recommend
 *  fisherExact2x2 instead. */
export function chiSquare2x2(a: number, b: number, c: number, d: number): Chi2x2 | null {
  const n = a + b + c + d;
  if (!n) return null;
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const c2 = b + d;
  if (!r1 || !r2 || !c1 || !c2) return null;
  const obs = [a, b, c, d];
  const exp = [(r1 * c1) / n, (r1 * c2) / n, (r2 * c1) / n, (r2 * c2) / n];
  let x2 = 0;
  for (let i = 0; i < 4; i++) x2 += (obs[i] - exp[i]) ** 2 / exp[i];
  return { x2, p: erfc(Math.sqrt(x2 / 2)), w: Math.sqrt(x2 / n), n, minExp: Math.min(...exp) };
}

export interface ChiGof {
  x2: number;
  p: number;
  n: number;
}

/** Goodness-of-fit chi-square of a binary split against 50/50, df = 1 —
 *  the test Reuter & Brun (2022) run on true vs false counts with
 *  "not sure" excluded. */
export function chiVs50(a: number, b: number): ChiGof | null {
  const n = a + b;
  if (!n) return null;
  const x2 = (a - b) ** 2 / n;
  return { x2, p: erfc(Math.sqrt(x2 / 2)), n };
}

/** Fisher's exact test for a 2×2 table, two-sided (R's convention: sum of
 *  all tables with the observed margins whose probability does not exceed
 *  the observed table's). Exact for the small cells that class-sized data
 *  routinely produce. Returns null for degenerate tables. */
export function fisherExact2x2(
  a: number,
  b: number,
  c: number,
  d: number
): { p: number; n: number } | null {
  const n = a + b + c + d;
  if (!n) return null;
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const c2 = b + d;
  if (!r1 || !r2 || !c1 || !c2) return null;

  const lf: number[] = [0];
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  const logP = (x: number) =>
    lf[r1] + lf[r2] + lf[c1] + lf[c2] - lf[n] - lf[x] - lf[r1 - x] - lf[c1 - x] - lf[r2 - c1 + x];

  const lo = Math.max(0, c1 - r2);
  const hi = Math.min(c1, r1);
  const pObs = Math.exp(logP(a));
  let p = 0;
  for (let x = lo; x <= hi; x++) {
    const px = Math.exp(logP(x));
    if (px <= pObs * (1 + 1e-7)) p += px;
  }
  return { p: Math.min(1, p), n };
}

/** Cramér's V for an r×c chi-square. For 2×2 this equals Cohen's w. */
export function cramersV(x2: number, n: number, rows: number, cols: number): number {
  const k = Math.min(rows, cols) - 1;
  if (!n || k <= 0) return 0;
  return Math.sqrt(x2 / (n * k));
}

export function fmtP(p: number): string {
  return p < 1e-4 ? "< .0001" : `= ${p.toFixed(4).replace(/^0/, "")}`;
}

export const mean = (a: number[]): number =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
