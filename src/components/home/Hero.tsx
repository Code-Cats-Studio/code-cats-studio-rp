export default function Hero() {
  return (
    <section
      className="relative overflow-hidden py-20 px-6"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Columna izquierda — texto */}
        <div className="flex-1">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{
              background: "var(--verde-limon)",
              fontFamily: "var(--font-heading)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            🚀 Plataforma de cursos
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 8vw, 5rem)",
              lineHeight: 1,
              color: "var(--text-primary)",
              margin: "0 0 1rem",
            }}
          >
            APRENDE A PROGRAMAR
            <br />
            <span style={{ color: "var(--azul-gatuno)" }}>LA WEB</span>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              maxWidth: "48ch",
              lineHeight: 1.6,
              margin: "0 0 2rem",
            }}
          >
            Cursos prácticos de desarrollo web. Desde cero hasta construir
            proyectos reales. Aprende a tu ritmo, con explicaciones claras en español.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#cursos"
              style={{
                background: "var(--azul-gatuno)",
                color: "white",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.9rem",
              }}
            >
              Ver cursos disponibles
            </a>
          </div>

          {/* Estadísticas */}
          <div className="flex gap-8 mt-8">
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2rem",
                  color: "var(--azul-gatuno)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                64
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                }}
              >
                LECCIONES
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2rem",
                  color: "var(--azul-gatuno)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                18H
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                }}
              >
                DE CONTENIDO
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2rem",
                  color: "var(--azul-gatuno)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                100%
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                }}
              >
                EN ESPAÑOL
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha — mascota */}
        <div className="flex-shrink-0 relative">
          <div
            className="w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-accent-soft)" }}
          >
            <img
              src="/images/mascot/cat-sitting.png"
              alt="Gato mascota de Code Cats Studio"
              className="w-56 h-56 md:w-72 md:h-72 object-contain drop-shadow-lg"
            />
          </div>
          <div
            className="absolute -top-2 -right-2 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: "var(--verde-limon)",
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              textAlign: "center",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            ES<br />GRATIS
          </div>
        </div>
      </div>
    </section>
  );
}
