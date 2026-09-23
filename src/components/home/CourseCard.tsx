interface Props {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  lessons: number;
  sections: number;
  accentColor: string;
  mascotImage: string;
  comingSoon?: boolean;
  startDate?: string;
}

export default function CourseCard({
  slug,
  title,
  subtitle,
  description,
  duration,
  level,
  lessons,
  sections,
  accentColor,
  mascotImage,
  comingSoon,
  startDate,
}: Props) {
  const mascotSrc = `/images/mascot/${mascotImage}.png`;
  const isAvailable = !comingSoon;

  return (
    <div
      className="group block rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)" }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--azul-gatuno)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 32px rgba(65,66,245,0.12)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border)";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
    >
      <a
        href={`/${slug}`}
        className="no-underline block"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {/* Cabecera con gradiente de color del curso */}
        <div
          className="p-6 pb-0 flex items-start justify-between gap-4"
          style={{
            background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isAvailable ? (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: accentColor,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  Disponible
                </span>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-heading)",
                    border: "1px dashed var(--border-hover)",
                  }}
                >
                  Próximamente
                </span>
              )}

              {startDate && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={
                    isAvailable
                      ? {
                          background: "var(--bg-tertiary)",
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-heading)",
                        }
                      : {
                          background: `${accentColor}20`,
                          color: "var(--azul-gatuno)",
                          fontFamily: "var(--font-heading)",
                        }
                  }
                >
                  {isAvailable ? startDate : `Inicio: ${startDate}`}
                </span>
              )}
            </div>

            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.375rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 0.25rem",
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              {subtitle}
            </p>
          </div>

          <img
            src={mascotSrc}
            alt={title}
            className="w-20 h-20 object-contain flex-shrink-0"
          />
        </div>

        {/* Cuerpo de la tarjeta */}
        <div className="p-6 pt-4">
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: "0 0 1rem",
            }}
          >
            {description}
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
              }}
            >
              ⏱ {duration}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
              }}
            >
              📚 {lessons} clases
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
              }}
            >
              📂 {sections} secciones
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
              }}
            >
              👤 {level}
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--azul-gatuno)",
              }}
            >
              {isAvailable ? "Comenzar →" : "Ver contenido →"}
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
