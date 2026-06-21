export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "0.5rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1>📚 Personal Library Manager</h1>
      <p>Next.js + Express scaffolding is running.</p>
      <p style={{ opacity: 0.6 }}>
        Health check: <code>/api/health</code>
      </p>
    </main>
  );
}
