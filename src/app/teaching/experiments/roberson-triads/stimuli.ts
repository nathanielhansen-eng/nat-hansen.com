/** Stimuli for Roberson, Davies & Davidoff (2000), "Color Categories Are Not
 * Universal", J. Exp. Psychol.: General 129(3), doi:10.1037/0096-3445.129.3.369
 * — Experiment 4, similarity judgments by the method of triads (pp. 388-389).
 *
 * Two nine-chip series, all Munsell Value 5 / Chroma 8 (p. 388):
 * Set 1 spans the English green-blue boundary (boundary chip 7.5BG); Set 2
 * spans the Berinmo nol-wor boundary (boundary chip 5GY, shaded in Fig. 8 —
 * the chip named nol/wor about 50/50 in their naming task). The eight triads
 * and their compositions are transcribed from Figure 8 (p. 388): two fully
 * within a category, two crossing the boundary, four with the boundary chip
 * peripheral; chips one or two steps apart with equal spacing.
 *
 * The PREDICTED (Categorical-Perception-following) pair per triad applies the
 * paper's predictions (a)-(c) on p. 388: crossing triads -> the two
 * within-category chips; boundary-peripheral triads -> the two non-boundary
 * chips; fully-within triads -> the two chips farthest from the boundary
 * (the chip nearest the boundary is predicted most dissimilar).
 *
 * Colorimetry: Munsell renotation data (real.dat, RIT Munsell Color Science
 * Laboratory), xyY under illuminant C -> XYZ -> Bradford adaptation to D65 ->
 * sRGB. The nine green-blue chips lie 1-5% outside the sRGB gamut in the red
 * channel (saturated cyans are sRGB's weak region) and are clipped, costing a
 * little chroma uniformly across the series; the hue progression and the
 * near-equal Munsell spacing survive. Disclosed on the debrief.
 * Practice chips (not in either set, per p. 389: obviously-close pair plus a
 * distant third) are drawn from the same renotation at V5/C8. */

export type SetId = "gb" | "nw";

export interface StimulusChip {
  munsell: string;
  hex: string;
}

export const SETS: Record<
  SetId,
  { label: string; boundary: string; chips: StimulusChip[] }
> = {
  gb: {
    label: "green\u2013blue (the English boundary)",
    boundary: "7.5BG 5/8",
    chips: [
      { munsell: "7.5B 5/8", hex: "#0086AC" },
      { munsell: "5B 5/8", hex: "#0088A8" },
      { munsell: "2.5B 5/8", hex: "#008AA0" },
      { munsell: "10BG 5/8", hex: "#008B98" },
      { munsell: "7.5BG 5/8", hex: "#008C8E" },
      { munsell: "5BG 5/8", hex: "#008D86" },
      { munsell: "2.5BG 5/8", hex: "#008D7B" },
      { munsell: "10G 5/8", hex: "#008D73" },
      { munsell: "7.5G 5/8", hex: "#008D6B" },
    ],
  },
  nw: {
    label: "nol\u2013wor (the Berinmo boundary)",
    boundary: "5GY 5/8",
    chips: [
      { munsell: "5Y 5/8", hex: "#947902" },
      { munsell: "7.5Y 5/8", hex: "#8B7C00" },
      { munsell: "10Y 5/8", hex: "#837F00" },
      { munsell: "2.5GY 5/8", hex: "#778203" },
      { munsell: "5GY 5/8", hex: "#6A8519" },
      { munsell: "7.5GY 5/8", hex: "#568830" },
      { munsell: "10GY 5/8", hex: "#438B42" },
      { munsell: "2.5G 5/8", hex: "#238C57" },
      { munsell: "5G 5/8", hex: "#008D63" },
    ],
  },
};

/** Triad compositions from Figure 8, as 1-based indices into a set's chip
 * series (index 5 = the boundary chip in both sets). `predicted` is the
 * CP-following pair. Same eight triads for both sets. */
export interface TriadDef {
  chips: [number, number, number];
  predicted: [number, number];
  kind: "within" | "cross" | "boundary-peripheral";
}

export const TRIADS: TriadDef[] = [
  { chips: [1, 3, 5], predicted: [1, 3], kind: "boundary-peripheral" },
  { chips: [2, 3, 4], predicted: [2, 3], kind: "within" },
  { chips: [2, 4, 6], predicted: [2, 4], kind: "cross" },
  { chips: [3, 4, 5], predicted: [3, 4], kind: "boundary-peripheral" },
  { chips: [4, 6, 8], predicted: [6, 8], kind: "cross" },
  { chips: [5, 6, 7], predicted: [6, 7], kind: "boundary-peripheral" },
  { chips: [5, 7, 9], predicted: [7, 9], kind: "boundary-peripheral" },
  { chips: [6, 7, 8], predicted: [7, 8], kind: "within" },
];

export const REPS = 4; // each triad judged four times per set (p. 389)

/** Table 10 (p. 389): mean predicted choices out of 32 (SE in the paper).
 * The paper treats 16/32 as chance ("making the reasonable assumption"). */
export const PUBLISHED = {
  berinmo: { gb: 20.75, nw: 25.38 },
  english: { gb: 23.0, nw: 14.38 },
  chance: 16,
  max: 32,
};

/** Two practice triads (p. 389: two clearly close chips and one very distant,
 * outside both sets). `predicted` = the obvious pair, positions 0-1. */
export const PRACTICE: { chips: StimulusChip[]; note: string }[] = [
  {
    chips: [
      { munsell: "5PB 5/8", hex: "#557DB2" },
      { munsell: "7.5PB 5/8", hex: "#6C77B1" },
      { munsell: "5RP 5/8", hex: "#B16282" },
    ],
    note: "the two blues",
  },
  {
    chips: [
      { munsell: "2.5R 5/8", hex: "#B86168" },
      { munsell: "5R 5/8", hex: "#B9615F" },
      { munsell: "10B 5/8", hex: "#2483AF" },
    ],
    note: "the two reds",
  },
];

export function isPredicted(triad: TriadDef, pair: [number, number]): boolean {
  const [a, b] = [...pair].sort((x, y) => x - y);
  return a === triad.predicted[0] && b === triad.predicted[1];
}
