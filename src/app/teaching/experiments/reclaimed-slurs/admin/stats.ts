// Small statistics kit for the control board; mirrors R defaults where the
// pilot analysis relied on them.

/* ---------------------------- statistics ---------------------------- */

export const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
export function sd(v: number[]) {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}
// R's quantile type 7, as used by geom_violin's quantile lines.
export function quantile(v: number[], p: number) {
  const s = [...v].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);
  return s[lo] + (h - lo) * (s[Math.min(lo + 1, s.length - 1)] - s[lo]);
}
// R's bw.nrd0, the default bandwidth for geom_violin.
export function bandwidth(v: number[]) {
  const s = sd(v);
  const iqr = quantile(v, 0.75) - quantile(v, 0.25);
  const lo = Math.min(s, iqr / 1.34) || s || 1;
  return 0.9 * lo * Math.pow(v.length, -0.2);
}
export function density(v: number[], grid: number[]) {
  const h = bandwidth(v);
  const d = grid.map(
    (g) => v.reduce((a, x) => a + Math.exp(-0.5 * ((g - x) / h) ** 2), 0) / (v.length * h * Math.sqrt(2 * Math.PI)),
  );
  const m = Math.max(...d);
  return d.map((x) => x / m);
}
// Cronbach's alpha over k items, rows = participants.
export function cronbach(rows: number[][]) {
  if (rows.length < 3) return null;
  const k = rows[0].length;
  const itemVar = Array.from({ length: k }, (_, j) => sd(rows.map((r) => r[j])) ** 2).reduce((a, b) => a + b, 0);
  const totalVar = sd(rows.map((r) => r.reduce((a, b) => a + b, 0))) ** 2;
  if (totalVar === 0) return null;
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}
// Welch's t-test, two-sided p via the regularized incomplete beta.
export function welch(a: { mean: number; sd: number; n: number }, b: { mean: number; sd: number; n: number }) {
  const va = a.sd ** 2 / a.n;
  const vb = b.sd ** 2 / b.n;
  const t = (a.mean - b.mean) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.n - 1) + vb ** 2 / (b.n - 1));
  return { t, df, p: betai(df / 2, 0.5, df / (df + t * t)) };
}
function betai(a: number, b: number, x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
function betacf(a: number, b: number, x: number) {
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
    c = 1 + aa / c;
    c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
    c = 1 + aa / c;
    c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return h;
}
function lgamma(z: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905,
    -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.9999999999998099;
  for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Paired t-test on within-person differences, two-sided.
export function pairedT(diffs: number[]) {
  const n = diffs.length;
  if (n < 2) return null;
  const s = sd(diffs);
  if (s === 0) return null;
  const t = mean(diffs) / (s / Math.sqrt(n));
  const df = n - 1;
  return { t, df, p: betai(df / 2, 0.5, df / (df + t * t)) };
}
