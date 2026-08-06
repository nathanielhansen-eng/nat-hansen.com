// Shared look for the classroom experiments (participant pages and
// instructor dashboards): Crimson Pro / Space Mono, warm paper palette.
// Experiments alias the two accent colours to their own condition names
// (harm/help, correspondence/coherence, …) so the semantics stay local.

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');`;

export const C = {
  bg: "#F4F0E8",
  surface: "#FFFFFF",
  border: "#DDD5C0",
  text: "#1A1814",
  muted: "#9A8866",
  body: "#3A3328",
  accent: "#1A1814",
  well: "#FDFAF5",
  red: "#8C3A2E",
  green: "#4A6B4F",
};

export const base: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Crimson Pro', Georgia, serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    maxWidth: "680px",
    width: "100%",
    padding: "52px 56px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
  },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: "12px",
  },
  h1: { fontSize: "34px", fontWeight: 400, lineHeight: 1.15, marginBottom: "28px", color: C.text },
  h2: { fontSize: "24px", fontWeight: 400, lineHeight: 1.2, marginBottom: "20px", color: C.text },
  body: { fontSize: "19px", lineHeight: 1.72, color: C.body, marginBottom: "18px" },
  small: { fontSize: "15px", lineHeight: 1.6, color: C.muted, marginBottom: "16px" },
  btn: {
    background: C.accent,
    color: C.bg,
    border: "none",
    padding: "13px 36px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "20px",
    display: "inline-block",
  },
  btnGhost: {
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: "13px 36px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    marginTop: "20px",
    display: "inline-block",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  divider: { borderTop: `1px solid ${C.border}`, margin: "28px 0" },
  vignette: {
    fontSize: "19px",
    lineHeight: 1.78,
    color: C.text,
    background: C.well,
    border: `1px solid ${C.border}`,
    padding: "26px 28px",
    marginBottom: "32px",
  },
  qlabel: {
    fontSize: "17px",
    lineHeight: 1.5,
    color: C.text,
    marginBottom: "14px",
    display: "block",
  },
  qnum: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px",
    letterSpacing: "0.14em",
    color: C.muted,
    marginRight: "10px",
  },
};

// Instructor-dashboard styles.
const adminMono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const adminEyebrow: React.CSSProperties = {
  ...adminMono,
  fontSize: "11px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: C.muted,
};

export const admin = {
  mono: adminMono,
  eyebrow: adminEyebrow,
  btn: {
    background: C.accent,
    color: C.bg,
    border: "none",
    padding: "10px 20px",
    ...adminMono,
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
  } as React.CSSProperties,
  th: {
    ...adminEyebrow,
    fontSize: "10px",
    fontWeight: 400,
    textAlign: "right",
    borderBottom: `1px solid ${C.border}`,
    padding: "8px 10px",
  } as React.CSSProperties,
  td: {
    padding: "8px 10px",
    borderBottom: `1px solid ${C.border}`,
    textAlign: "right",
    ...adminMono,
    fontSize: "14px",
    color: C.body,
  } as React.CSSProperties,
  panel: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "24px 26px",
    marginBottom: "20px",
  } as React.CSSProperties,
};
