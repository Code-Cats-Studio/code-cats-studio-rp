import { useState, useEffect, useCallback } from "react";

interface Props {
  lessonId?: string;
  courseSlug?: string;
  sectionSlug?: string;
  lessonSlug?: string;
}

const STORAGE_KEY = "gatuno-completed";

/**
 * Resuelve dinámicamente los parámetros del curso, sección y lección
 * a partir de las propiedades o de la URL absoluta actual del navegador.
 */
function resolveLessonInfo(props: Props) {
  let course = (props.courseSlug || "").replace(/^\/+|\/+$/g, "");
  let section = (props.sectionSlug || "").replace(/^\/+|\/+$/g, "");
  let lesson = (props.lessonSlug || "").replace(/^\/+|\/+$/g, "");

  // Si se proporcionó lessonId como "seccion/leccion" o "curso/seccion/leccion"
  if (props.lessonId) {
    const parts = props.lessonId.split("/").filter(Boolean);
    if (parts.length === 2) {
      section = section || parts[0];
      lesson = lesson || parts[1];
    } else if (parts.length >= 3) {
      course = course || parts[0];
      section = section || parts[1];
      lesson = lesson || parts[2];
    }
  }

  // Resolver dinámicamente desde window.location.pathname si estamos en el navegador
  if (typeof window !== "undefined") {
    const urlParts = window.location.pathname.split("/").filter(Boolean);
    if (urlParts.length >= 3) {
      course = course || urlParts[0];
      section = section || urlParts[urlParts.length - 2];
      lesson = lesson || urlParts[urlParts.length - 1];
    } else if (urlParts.length === 2) {
      course = course || urlParts[0];
      section = section || urlParts[1];
    }
  }

  const shortId = section && lesson ? `${section}/${lesson}` : props.lessonId || "";
  const fullId = course && shortId ? `${course}/${shortId}` : shortId;
  const absoluteUrl = `/${fullId}`.replace(/\/+/g, "/");

  return { course, section, lesson, shortId, fullId, absoluteUrl };
}

/**
 * Comprueba si la lección está marcada como completada en la lista de localStorage,
 * comparando de forma flexible contra rutas relativas, absolutas o con prefijo de curso.
 */
function checkIfCompleted(completedList: string[], info: ReturnType<typeof resolveLessonInfo>): boolean {
  if (!Array.isArray(completedList)) return false;

  return completedList.some((item) => {
    if (!item || typeof item !== "string") return false;
    const cleanItem = item.trim().replace(/^\/+/, "");
    return (
      cleanItem === info.shortId ||
      cleanItem === info.fullId ||
      item === info.absoluteUrl ||
      (info.shortId && cleanItem.endsWith(`/${info.shortId}`)) ||
      (info.lesson && cleanItem === info.lesson)
    );
  });
}

export default function CompleteButton(props: Props) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sincronizar estado con localStorage
  const syncState = useCallback(() => {
    try {
      const info = resolveLessonInfo(props);
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      setIsCompleted(checkIfCompleted(list, info));
    } catch (e) {
      console.error("Error al leer el estado de lección completada:", e);
    }
  }, [props.lessonId, props.courseSlug, props.sectionSlug, props.lessonSlug]);

  useEffect(() => {
    syncState();

    const handleUpdate = () => syncState();
    document.addEventListener("lesson-completed", handleUpdate);
    window.addEventListener("lesson-completed", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      document.removeEventListener("lesson-completed", handleUpdate);
      window.removeEventListener("lesson-completed", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [syncState]);

  // Manejador del clic
  const handleToggle = () => {
    try {
      const info = resolveLessonInfo(props);
      const stored = localStorage.getItem(STORAGE_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];

      const currentlyCompleted = checkIfCompleted(list, info);
      let updated: string[];
      const nextState = !currentlyCompleted;

      if (currentlyCompleted) {
        // Remover cualquier coincidencia (corta, completa o absoluta)
        updated = list.filter((item) => {
          if (!item || typeof item !== "string") return false;
          const cleanItem = item.trim().replace(/^\/+/, "");
          const matches =
            cleanItem === info.shortId ||
            cleanItem === info.fullId ||
            item === info.absoluteUrl ||
            (info.shortId && cleanItem.endsWith(`/${info.shortId}`)) ||
            (info.lesson && cleanItem === info.lesson);
          return !matches;
        });
      } else {
        // Guardar identificadores canónicos para máxima compatibilidad
        const toAdd = [info.shortId, info.fullId].filter(Boolean);
        updated = Array.from(new Set([...list, ...toAdd]));
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setIsCompleted(nextState);

      // Disparar evento global para actualizar Sidebar.tsx inmediatamente
      const event = new CustomEvent("lesson-completed", {
        detail: {
          ...info,
          isCompleted: nextState,
        },
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    } catch (e) {
      console.error("Error al alternar estado de lección:", e);
    }
  };

  return (
    <button
      id="complete-btn"
      type="button"
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 cursor-pointer select-none"
      style={{
        fontFamily: "var(--font-heading)",
        cursor: "pointer",
        background: isCompleted
          ? "var(--success)"
          : isHovered
          ? "var(--bg-tertiary)"
          : "var(--bg-secondary)",
        border: `1.5px solid ${
          isCompleted
            ? "var(--success)"
            : isHovered
            ? "var(--border-hover)"
            : "var(--border)"
        }`,
        color: isCompleted ? "#ffffff" : "var(--text-secondary)",
        boxShadow: isCompleted
          ? "0 2px 8px rgba(34, 197, 94, 0.25)"
          : isHovered
          ? "0 2px 6px rgba(0, 0, 0, 0.05)"
          : "none",
        transform: isHovered ? "translateY(-1px)" : "none",
      }}
    >
      <span
        id="complete-icon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.1rem",
          height: "1.1rem",
          fontSize: isCompleted ? "0.95rem" : "1.1rem",
          fontWeight: isCompleted ? 700 : 400,
          lineHeight: 1,
        }}
      >
        {isCompleted ? "✓" : "○"}
      </span>
      <span id="complete-text">
        {isCompleted ? "¡Lección completada!" : "Marcar como completada"}
      </span>
    </button>
  );
}
