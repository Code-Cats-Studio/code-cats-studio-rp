import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Lesson {
  slug?: string;
  id?: string;
  lessonSlug?: string;
  title?: string;
  name?: string;
  duration?: string;
  time?: string;
  type?: string;
  order?: number;
}

export interface Section {
  slug?: string;
  id?: string;
  sectionSlug?: string;
  title?: string;
  name?: string;
  order?: number;
  week?: number;
  color?: string;
  accentColor?: string;
  duration?: string;
  lessons?: Lesson[];
  items?: Lesson[];
}

export interface Props {
  courseSlug?: string;
  courseTitle?: string;
  sections?: Section[];
  currentSection?: string;
  currentLesson?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "gatuno-completed";

const typeIcons: Record<string, string> = {
  theory: "📖",
  practice: "💻",
  challenge: "🏆",
  setup: "⚙️",
  reading: "📄",
  tool: "🔧",
  skill: "🎯",
};

/**
 * Normaliza y verifica si una lección está completada considerando
 * rutas relativas, absolutas o con prefijo de curso.
 */
function isLessonCompleted(
  completedList: string[],
  courseSlug: string,
  sectionSlug: string,
  lessonSlug: string
): boolean {
  if (!Array.isArray(completedList) || !sectionSlug || !lessonSlug) return false;

  const shortId = `${sectionSlug}/${lessonSlug}`.replace(/^\/+/, "");
  const fullId = courseSlug ? `${courseSlug}/${shortId}`.replace(/^\/+/, "") : shortId;
  const slashFullId = `/${fullId}`;

  return completedList.some((item) => {
    if (!item || typeof item !== "string") return false;
    const clean = item.trim().replace(/^\/+/, "");
    return (
      clean === shortId ||
      clean === fullId ||
      item === slashFullId ||
      clean.endsWith(`/${shortId}`) ||
      clean === lessonSlug
    );
  });
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Sidebar({
  courseSlug,
  courseTitle,
  sections = [],
  currentSection,
  currentLesson,
}: Props) {
  // Estado: sidebar abierto/cerrado en mobile
  const [isOpen, setIsOpen] = useState(false);

  // Estado: lecciones completadas leídas desde localStorage
  const [completed, setCompleted] = useState<string[]>([]);

  // Resolver dinámicamente el curso, sección y lección activa
  const [urlParams, setUrlParams] = useState({
    courseSlug: (courseSlug || "").replace(/^\/+|\/+$/g, ""),
    currentSection: (currentSection || "").replace(/^\/+|\/+$/g, ""),
    currentLesson: (currentLesson || "").replace(/^\/+|\/+$/g, ""),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      setUrlParams({
        courseSlug: (courseSlug || parts[0] || "").replace(/^\/+|\/+$/g, ""),
        currentSection: (currentSection || (parts.length >= 2 ? parts[1] : "")).replace(/^\/+|\/+$/g, ""),
        currentLesson: (currentLesson || (parts.length >= 3 ? parts[2] : "")).replace(/^\/+|\/+$/g, ""),
      });
    }
  }, [courseSlug, currentSection, currentLesson]);

  const activeCourseSlug = urlParams.courseSlug;
  const activeCurrentSection = urlParams.currentSection;
  const activeCurrentLesson = urlParams.currentLesson;

  // Estado: acordeón de secciones (Record<slug, boolean>)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Sincronizar sección activa para que siempre esté abierta inicialmente
  useEffect(() => {
    if (activeCurrentSection) {
      setExpandedSections((prev) => {
        if (prev[activeCurrentSection] === undefined) {
          return { ...prev, [activeCurrentSection]: true };
        }
        return prev;
      });
    }
  }, [activeCurrentSection]);

  // Leer progreso desde localStorage
  const readProgress = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setCompleted(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error("Error al leer progreso de localStorage:", e);
    }
  }, []);

  useEffect(() => {
    readProgress();

    const handleUpdate = () => readProgress();
    document.addEventListener("lesson-completed", handleUpdate);
    window.addEventListener("lesson-completed", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      document.removeEventListener("lesson-completed", handleUpdate);
      window.removeEventListener("lesson-completed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [readProgress]);

  // Bloquear scroll del body en mobile cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Alternar apertura/cierre de una sección en el acordeón
  const toggleSection = (sectionSlugToToggle: string) => {
    setExpandedSections((prev) => {
      const currentlyOpen =
        prev[sectionSlugToToggle] !== undefined
          ? prev[sectionSlugToToggle]
          : sectionSlugToToggle === activeCurrentSection;

      return {
        ...prev,
        [sectionSlugToToggle]: !currentlyOpen,
      };
    });
  };

  // Mapear y normalizar las secciones para garantizar paridad entre HTML y GitHub
  const normalizedSections = useMemo(() => {
    return sections.map((sec, sIdx) => {
      const sSlug = (sec.slug || sec.id || sec.sectionSlug || `seccion-${sIdx + 1}`).replace(/^\/+|\/+$/g, "");
      const sTitle = sec.title || sec.name || `Sección ${sIdx + 1}`;
      const sOrder = sec.order ?? sec.week ?? (sIdx + 1);
      const sColor = sec.color || sec.accentColor || "var(--azul-gatuno)";
      const rawLessons = sec.lessons || sec.items || [];

      const normalizedLessons = rawLessons.map((les, lIdx) => {
        const lSlug = (les.slug || les.id || les.lessonSlug || `leccion-${lIdx + 1}`).replace(/^\/+|\/+$/g, "");
        const lTitle = les.title || les.name || `Lección ${lIdx + 1}`;
        const lDuration = les.duration || les.time || "";
        const lType = les.type || "theory";
        const lOrder = les.order ?? (lIdx + 1);

        return {
          slug: lSlug,
          title: lTitle,
          duration: lDuration,
          type: lType,
          order: lOrder,
        };
      });

      return {
        slug: sSlug,
        title: sTitle,
        order: sOrder,
        color: sColor,
        lessons: normalizedLessons,
      };
    });
  }, [sections]);

  // Progreso global calculado
  const totalLessons = useMemo(() => {
    return normalizedSections.reduce((acc, s) => acc + s.lessons.length, 0);
  }, [normalizedSections]);

  const completedCount = useMemo(() => {
    return normalizedSections.reduce((acc, s) => {
      return (
        acc +
        s.lessons.filter((l) => isLessonCompleted(completed, activeCourseSlug, s.slug, l.slug)).length
      );
    }, 0);
  }, [normalizedSections, completed, activeCourseSlug]);

  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Ruta absoluta del curso
  const courseHref = `/${activeCourseSlug}`.replace(/\/+/g, "/");

  return (
    <>
      {/* ── Overlay mobile ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Botón hamburguesa (solo mobile) ────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          className="fixed top-2 left-2 z-50 md:hidden w-12 h-12 flex items-center justify-center cursor-pointer border-none bg-transparent"
          style={{
            color: "var(--azul-gatuno)",
            fontSize: "1.25rem",
          }}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 h-full z-40 flex flex-col overflow-hidden transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* ── Cabecera del sidebar ──────────────────────────────────────── */}
        <div className="flex-shrink-0 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Logo con ruta absoluta */}
          <a href="/" className="flex items-center gap-2 no-underline mb-3">
            <img src="/images/mascot/cat-peek.png" alt="Code Cats Studio" className="h-7 w-auto" />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.125rem",
                color: "var(--text-primary)",
                letterSpacing: "0.05em",
              }}
            >
              Code Cats Studio
            </span>
          </a>

          {/* Nombre del curso con enlace absoluto */}
          <a href={courseHref} className="no-underline">
            <p
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--azul-gatuno)",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {courseTitle || activeCourseSlug}
            </p>
          </a>

          {/* Botón cerrar (solo mobile) */}
          <button
            type="button"
            className="md:hidden absolute top-4 right-4 cursor-pointer border-none bg-transparent"
            style={{
              fontSize: "1.2rem",
              color: "var(--azul-gatuno)",
            }}
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>

          {/* Barra de progreso */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                Tu progreso
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden h-1.5"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "var(--verde-limon)" }}
              />
            </div>
          </div>
        </div>

        {/* ── Navegación de secciones y lecciones ──────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2">
          {normalizedSections.map((section) => {
            const isExpanded =
              expandedSections[section.slug] !== undefined
                ? expandedSections[section.slug]
                : section.slug === activeCurrentSection;

            const isCurrentSection = section.slug === activeCurrentSection;

            return (
              <div key={section.slug} className="mb-1">
                {/* Botón de sección (acordeón interactivo) */}
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 flex items-center gap-2 cursor-pointer border-none bg-transparent select-none"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: section.color,
                  }}
                  onClick={() => toggleSection(section.slug)}
                  aria-expanded={isExpanded}
                >
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs"
                    style={{
                      background: section.color,
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {section.order}
                  </span>
                  <span className="flex-1">{section.title}</span>
                  <span
                    className="transition-transform duration-200"
                    style={{
                      display: "inline-block",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ›
                  </span>
                </button>

                {/* Lista de lecciones (acordeón expandible) */}
                <ul
                  className="list-none m-0 pl-0 overflow-hidden"
                  style={{
                    maxHeight: isExpanded ? "2000px" : "0px",
                    opacity: isExpanded ? 1 : 0,
                    transition: "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out",
                  }}
                >
                  {section.lessons.map((lesson) => {
                    const isActive = isCurrentSection && lesson.slug === activeCurrentLesson;
                    const isDone = isLessonCompleted(
                      completed,
                      activeCourseSlug,
                      section.slug,
                      lesson.slug
                    );

                    // Ruta ABSOLUTA estricta comenzando con '/'
                    const lessonHref = `/${activeCourseSlug}/${section.slug}/${lesson.slug}`.replace(/\/+/g, "/");

                    return (
                      <li key={lesson.slug}>
                        <a
                          href={lessonHref}
                          className="flex items-start gap-2 px-4 py-2 no-underline transition-colors duration-150"
                          style={
                            isActive
                              ? {
                                  background: "var(--bg-accent-soft)",
                                  borderLeft: "3px solid var(--azul-gatuno)",
                                }
                              : { borderLeft: "3px solid transparent" }
                          }
                          onMouseOver={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.background =
                                "var(--bg-tertiary)";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.background = "";
                            }
                          }}
                        >
                          {/* Indicador de estado (activo / completado / pendiente) */}
                          <span
                            className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs"
                            style={
                              isDone
                                ? {
                                    borderColor: "var(--success)",
                                    background: "var(--success)",
                                    color: "white",
                                  }
                                : isActive
                                ? {
                                    borderColor: "var(--azul-gatuno)",
                                    background: "var(--azul-gatuno)",
                                    color: "white",
                                  }
                                : { borderColor: "var(--border)" }
                            }
                          >
                            {isDone ? "✓" : isActive ? "›" : ""}
                          </span>

                          {/* Título y duración */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="m-0 leading-tight truncate"
                              style={{
                                fontSize: "0.8125rem",
                                color: isActive ? "var(--azul-gatuno)" : "var(--text-secondary)",
                                fontWeight: isActive ? 600 : 400,
                                fontFamily: "var(--font-body)",
                              }}
                            >
                              {typeIcons[lesson.type] ?? "📖"} {lesson.title}
                            </p>
                            <p
                              className="m-0"
                              style={{
                                fontSize: "0.6875rem",
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-heading)",
                              }}
                            >
                              {lesson.duration}
                            </p>
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
