export default function Page() {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f1ea", margin: 0 }}>
      <iframe
        src="/minitrue/app.html"
        title="Ministry of Truth — Document Compliance"
        style={{
          width: "100%",
          height: "100vh",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}
