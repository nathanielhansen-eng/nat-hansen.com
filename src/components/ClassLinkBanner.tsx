// Shown above an admin dashboard opened through a signed class link from
// ux-phi: says whose data this is, so the one-session view isn't mistaken
// for the whole experiment.
export default function ClassLinkBanner({ session }: { session: string }) {
  return (
    <div
      style={{
        background: "#FEF3C7",
        color: "#78350F",
        borderBottom: "1px solid #FCD34D",
        padding: "10px 20px",
        fontFamily: "'Space Mono', ui-monospace, monospace",
        fontSize: "12px",
        lineHeight: 1.5,
      }}
    >
      Your class only: session <b>{session}</b>. Answers from other classes are never
      shown here, whatever the session menu below says. Use Refresh (or reload) to see
      new answers. Ignore the join-link maker; your students already have their link
      on ux-phi.
    </div>
  );
}
