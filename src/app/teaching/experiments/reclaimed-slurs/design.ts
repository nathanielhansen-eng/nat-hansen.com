// Visual language for the reclaimed-slurs survey and its control board, drawn
// from Wyeth's Hydrosemantics identity explorations (10.09.26): Swiss poster
// type and Pelican-paperback modernism. Garamond for reading, close-set
// Helvetica for everything that labels, counts or commands; flat colour bands,
// black rules, overlapping circles — no cards, shadows or tracked-out caps.

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');`;

export const SERIF = "'EB Garamond', Garamond, 'Adobe Garamond Pro', Georgia, serif";
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Close-set: Helvetica set tight, as on the Hydrosemantics wordmark. */
export const TIGHT = "-0.035em";
export const TIGHTER = "-0.05em";

// Sampled from the swatch grid on page 14 of the concepts deck: one column
// each of greys, oranges, pinks, greens and blues, light to dark.
export const HS = {
  grey: ["#E5E0DD", "#B1A6A0", "#84766D", "#5C564A"],
  orange: ["#F1B88B", "#FF9C00", "#FF6900", "#ED2F00"],
  pink: ["#F19BC8", "#EA72B0", "#E5469A", "#C91880"],
  green: ["#9EBCBA", "#54A982", "#2A9463", "#017630"],
  blue: ["#A9E3EF", "#4EC6DE", "#00A1C7", "#006CA7"],
};

export const INK = "#111111";
export const PAPER = "#FFFFFF";
export const RULE = "#111111";
export const MUTED = "#5C564A";

/** One colour per replication block, and two for the pilot. */
export const PART_COLOR = {
  bad2: HS.orange[2],
  bad1: HS.pink[2],
  offense: HS.green[2],
  valence: HS.blue[2],
  pilot: HS.blue[3],
  pilotAlt: HS.green[3],
} as const;

/** The pilot's own figures use viridis "plasma" for the age groups; kept so the
 *  class sees the same colours as the slides. */
export const PLASMA_UNDER30 = "#CC4778";
export const PLASMA_OVER60 = "#F9C726";
