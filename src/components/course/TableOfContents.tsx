interface Lesson {
  slug: string;
  title: string;
  duration: string;
  type: string;
  order: number;
}

interface Section {
  slug: string;
  title: string;
  order: number;
  color: string;
  duration: string;
  lessons: Lesson[];
}

interface Props {
  courseSlug: string;
  sections: Section[];
}

const typeIcons: Record<string, string> = {
  theory: "📖",
  practice: "💻",
  challenge: "🏆",
  setup: "⚙️",
  reading: "📄",
  tool: "🔧",
  skill: "🎯",
};

export default function TableOfContents({ courseSlug, sections }: Props) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div
          key={section.slug}
          className="rounded-2xl overflow-hidden"
          style={{ border: `1.5px solid ${section.color}30` }}
        >
          {/* Cabecera de sección */}
          <div
            className="px-6 py-4 flex items-center gap-4"
            style={{ background: `${section.color}10` }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{
                background: section.color,
                fontFamily: "var(--font-heading)",
                fontSize: "0.9rem",
              }}
            >
              {section.order}
            </div>
            <div className="flex-1">
              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.0625rem",
                  fontWeight: 700,
                  color: section.color,
                  margin: 0,
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                }}
              >
                {section.lessons.length} lecciones · {section.duration}
              </p>
            </div>
          </div>

          {/* Lista de lecciones */}
          <ul
            className="m-0 p-0 list-none divide-y"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {section.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <a
                  href={`/${courseSlug}/${section.slug}/${lesson.slug}`}
                  className="flex items-center gap-3 px-6 py-3 no-underline transition-colors duration-150"
                  style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                  onMouseOver={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "var(--bg-secondary)";
                    el.style.color = "var(--azul-gatuno)";
                  }}
                  onMouseOut={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "";
                    el.style.color = "var(--text-secondary)";
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      flexShrink: 0,
                      color: "var(--text-muted)",
                    }}
                  >
                    {lesson.order}.
                  </span>
                  <span style={{ fontSize: "0.8125rem", flexShrink: 0 }}>
                    {typeIcons[lesson.type] ?? "📖"}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.875rem",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {lesson.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-heading)",
                      flexShrink: 0,
                    }}
                  >
                    {lesson.duration}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
