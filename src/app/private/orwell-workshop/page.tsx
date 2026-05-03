export default function Page() {
  return (
    <div style={{ minHeight: "100vh", background: "#1c1c1c", margin: 0 }}>
      <iframe
        src="/private/orwell-workshop/app.html"
        title="Orwell Workshop"
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
