// Server-rendered login form shown by admin pages when the instructor
// cookie is absent. Posts to the experiment's admin-login route, which
// sets the site-wide instructor_auth cookie. Styled inline (no client JS).

export default function InstructorGate({
  slug,
  heading,
  err,
}: {
  slug: string;
  heading: string;
  err?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F0E8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Crimson Pro', Georgia, serif",
        padding: "20px",
      }}
    >
      <form
        method="POST"
        action={`/api/experiments/${slug}/admin-login`}
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDD5C0",
          padding: "48px 52px",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 4px 40px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: "12px",
          }}
        >
          Instructor access
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 400, marginBottom: "24px", color: "#1A1814" }}>
          {heading}
        </h1>
        <label
          style={{
            display: "block",
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9A8866",
            marginBottom: "8px",
          }}
        >
          Password
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          style={{
            border: "1px solid #DDD5C0",
            padding: "12px 16px",
            fontSize: "19px",
            fontFamily: "'Crimson Pro', Georgia, serif",
            width: "100%",
            outline: "none",
            background: "#FDFAF5",
            boxSizing: "border-box",
          }}
        />
        {err && (
          <div
            style={{
              color: "#CC1A14",
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              marginTop: "10px",
            }}
          >
            Wrong password.
          </div>
        )}
        <button
          type="submit"
          style={{
            background: "#1A1814",
            color: "#F4F0E8",
            border: "none",
            padding: "13px 36px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Enter →
        </button>
      </form>
    </div>
  );
}
