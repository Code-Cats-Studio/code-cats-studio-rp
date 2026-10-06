interface Props {
  courseName?: string;
}

export default function Navbar({ courseName }: Props) {
  return (
    <nav
      style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-40"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 no-underline group">
          <img
            src="/images/mascot/cat-peek.png"
            alt="Code Cats Studio mascota"
            className="h-9 w-auto"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              color: "var(--text-primary)",
              letterSpacing: "0.05em",
            }}
          >
            Code Cats Studio
          </span>
        </a>

        {courseName && (
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            {courseName}
          </span>
        )}
      </div>
    </nav>
  );
}
