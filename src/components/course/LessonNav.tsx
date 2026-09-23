interface LessonRef {
  title: string;
  href: string;
}

interface Props {
  prev?: LessonRef;
  next?: LessonRef;
}

function NavLink({
  lesson,
  direction,
}: {
  lesson: LessonRef;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";

  return (
    <a
      href={lesson.href}
      className={`flex-1 flex flex-col gap-1 p-4 rounded-xl no-underline transition-all duration-150${isPrev ? "" : " text-right"}`}
      style={{ border: "1.5px solid var(--border)", textDecoration: "none" }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--azul-gatuno)";
        el.style.background = "var(--bg-accent-soft)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "";
      }}
    >
      <span
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-heading)",
        }}
      >
        {isPrev ? "← Anterior" : "Siguiente →"}
      </span>
      <span
        className="line-clamp-2"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "var(--azul-gatuno)",
        }}
      >
        {lesson.title}
      </span>
    </a>
  );
}

export default function LessonNav({ prev, next }: Props) {
  return (
    <nav
      className="flex items-stretch gap-4 mt-12 pt-8"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {prev ? <NavLink lesson={prev} direction="prev" /> : <div className="flex-1" />}
      {next ? <NavLink lesson={next} direction="next" /> : <div className="flex-1" />}
    </nav>
  );
}
