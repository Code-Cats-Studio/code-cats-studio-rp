export default function Footer() {
  return (
    <footer style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div
          className="flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)", fontSize: "0.875rem", color: "var(--text-muted)" }}
        >
          <a
            href="/"
            className="flex items-center gap-2 no-underline"
            style={{ color: "var(--text-muted)" }}
          >
            <img src="/images/mascot/cat-peek.png" alt="" className="h-6 w-auto opacity-60" />
            <span style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              Code Cats Studio
            </span>
          </a>
          <span>·</span>
          <span>Aprende desarrollo web con cursos prácticos</span>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Hecho con 🐱 para la comunidad
        </p>
      </div>
    </footer>
  );
}
