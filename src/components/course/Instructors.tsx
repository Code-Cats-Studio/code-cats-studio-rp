import { useState } from "react";

interface Instructor {
  name: string;
  role: string;
  bio: string;
  image: string;
  weeks: string;
}

interface Props {
  instructors: Instructor[];
}

function InstructorCard({ instructor }: { instructor: Instructor }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border)" }}
      onMouseOver={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--azul-gatuno)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 24px rgba(65,66,245,0.1)";
      }}
      onMouseOut={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border)";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
    >
      {/* Avatar */}
      <div className="flex items-center justify-center pt-6 pb-2">
        <div
          className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: "var(--bg-accent-soft)", border: "3px solid var(--azul-gatuno)" }}
        >
          {imgError ? (
            <span style={{ fontSize: "2.5rem" }}>👤</span>
          ) : (
            <img
              src={instructor.image}
              alt={instructor.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </div>

      {/* Datos del instructor */}
      <div className="px-5 pb-5 text-center">
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 0.25rem",
          }}
        >
          {instructor.name}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--azul-gatuno)",
            margin: "0 0 0.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {instructor.role}
        </p>
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-3"
          style={{
            background: "var(--verde-limon)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {instructor.weeks}
        </span>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {instructor.bio}
        </p>
      </div>
    </div>
  );
}

export default function Instructors({ instructors }: Props) {
  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-1 w-6 rounded-full" style={{ background: "var(--verde-limon)" }} />
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.25rem",
            fontWeight: 700,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          Equipo de Instructores
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instructors.map((instructor) => (
          <InstructorCard key={instructor.name} instructor={instructor} />
        ))}
      </div>
    </section>
  );
}
