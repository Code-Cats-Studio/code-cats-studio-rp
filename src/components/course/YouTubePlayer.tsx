import { useEffect, useRef, useState, useCallback } from 'react';
import { reportWatchTime } from '../../services/liveSessions';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId?: string;
  lessonId: string;
  courseSlug?: string;
  sectionSlug?: string;
  lessonSlug?: string;
  onLessonCompleted?: () => void;
}

export default function YouTubePlayer({
  videoId = 'dQw4w9WgXcQ', // Video de demostración por defecto si la lección no especifica external_id
  lessonId,
  courseSlug,
  sectionSlug,
  lessonSlug,
  onLessonCompleted,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const playingRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);

  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [totalSecondsWatched, setTotalSecondsWatched] = useState<number>(0);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);

  // Notificar al sistema global y a CompleteButton.tsx
  const markAsCompleted = useCallback(() => {
    setIsCompleted(true);
    onLessonCompleted?.();

    const shortId = sectionSlug && lessonSlug ? `${sectionSlug}/${lessonSlug}` : lessonId;
    const fullId = courseSlug && shortId ? `${courseSlug}/${shortId}` : shortId;

    // Guardar en localStorage para persistencia y compatibilidad
    try {
      const stored = localStorage.getItem('gatuno-completed');
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(shortId) && !list.includes(fullId)) {
        localStorage.setItem('gatuno-completed', JSON.stringify([...list, shortId, fullId]));
      }
    } catch {
      // Ignorar error de storage
    }

    // Disparar evento global para Sidebar y CompleteButton
    const event = new CustomEvent('lesson-completed', {
      detail: {
        course: courseSlug,
        section: sectionSlug,
        lesson: lessonSlug,
        shortId,
        fullId,
        isCompleted: true,
      },
    });
    document.dispatchEvent(event);
    window.dispatchEvent(event);
  }, [courseSlug, sectionSlug, lessonSlug, lessonId, onLessonCompleted]);

  // Función flush: calcula delta y llama a report_watch_time
  const flush = useCallback(async () => {
    if (!lastTimeRef.current) return;
    const now = Date.now();
    const delta = Math.round((now - lastTimeRef.current) / 1000);
    lastTimeRef.current = playingRef.current ? now : 0;

    if (delta > 0 && playerRef.current?.getDuration) {
      setTotalSecondsWatched((prev) => prev + delta);
      const duration = Math.round(playerRef.current.getDuration() || 0);

      const res = await reportWatchTime(lessonId, delta, duration);
      if (res.completed) {
        markAsCompleted();
      }
    }
  }, [lessonId, markAsCompleted]);

  // Cargar YouTube IFrame API con soporte de privacidad extendida (youtube-nocookie.com)
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      setIsApiReady(true);
    };
  }, []);

  // Inicializar reproductor de YouTube
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    // Destruir instancia anterior si existe
    if (playerRef.current?.destroy) {
      playerRef.current.destroy();
    }

    const player = new window.YT.Player(containerRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        enablejsapi: 1,
        origin: window.location.origin,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onStateChange: (event: any) => {
          // YT.PlayerState.PLAYING = 1
          if (event.data === 1) {
            playingRef.current = true;
            lastTimeRef.current = Date.now();

            if (intervalRef.current) window.clearInterval(intervalRef.current);
            // Reportar cada 15 segundos mientras se reproduce
            intervalRef.current = window.setInterval(() => {
              void flush();
            }, 15000);
          } else {
            // Cualquier otro estado (PAUSED = 2, ENDED = 0, BUFFERING = 3)
            playingRef.current = false;
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            void flush();
          }
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      void flush();
      if (player?.destroy) {
        player.destroy();
      }
    };
  }, [isApiReady, videoId, flush]);

  return (
    <div className="my-6">
      <div
        className="relative w-full overflow-hidden rounded-2xl shadow-md"
        style={{
          paddingTop: '56.25%', // Relación de aspecto 16:9
          background: '#0F0F14',
          border: '1.5px solid var(--border)',
        }}
      >
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full" />
      </div>

      {/* Barra de estado del reproductor */}
      <div className="mt-2.5 flex items-center justify-between text-xs px-1 text-gray-500">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isCompleted ? 'var(--verde-limon)' : 'var(--azul-gatuno)' }}
          />
          <span style={{ fontFamily: 'var(--font-heading)' }}>
            {isCompleted
              ? '🎉 ¡Completitud de video alcanzada!'
              : 'Sincronizando tiempo de visualización con el servidor'}
          </span>
        </div>

        {totalSecondsWatched > 0 && (
          <span className="font-mono text-gray-400">
            {Math.floor(totalSecondsWatched / 60)}m {totalSecondsWatched % 60}s registrados
          </span>
        )}
      </div>
    </div>
  );
}
