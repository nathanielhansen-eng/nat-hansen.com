// Vignette text as paragraphs of segments. Segments given as {d: "..."}
// are the wording that differs between conditions/versions of a stimulus;
// they render as plain text during the task (mark=false) and highlighted
// in the debrief comparison (mark=true). Server- and client-safe.

export type Seg = string | { d: string };

export function Paras({ paras, mark }: { paras: Seg[][]; mark: boolean }) {
  return (
    <>
      {paras.map((segs, i) => (
        <p key={i} style={{ margin: i === paras.length - 1 ? 0 : "0 0 16px" }}>
          {segs.map((seg, j) =>
            typeof seg === "string" ? (
              <span key={j}>{seg}</span>
            ) : mark ? (
              <strong key={j} style={{ fontWeight: 600, color: "inherit", background: "#F0E8D8" }}>
                {seg.d}
              </strong>
            ) : (
              <span key={j}>{seg.d}</span>
            )
          )}
        </p>
      ))}
    </>
  );
}
