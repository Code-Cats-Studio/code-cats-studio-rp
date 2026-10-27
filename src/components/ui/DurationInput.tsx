import { useEffect, useState } from 'react';
import { clampDuration, formatDurationLabel, parseDurationLabel } from '../../utils/validation';

const box = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';

// Duración en dos campos: horas (obligatorio) y minutos (opcional, 0-59). Devuelve «1h 20min».
export default function DurationInput({ value, maxHours, onChange, label = 'Duración', required = true }: {
  value: string;
  maxHours: number;
  onChange: (label: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [parts, setParts] = useState(() => clampDuration(parseDurationLabel(value), maxHours));

  // Si el padre cambia el valor (p. ej. al reordenar o importar una lección), se vuelve a leer
  useEffect(() => {
    setParts((cur) => (formatDurationLabel(cur) === value ? cur : clampDuration(parseDurationLabel(value), maxHours)));
  }, [value, maxHours]);

  const update = (next: Partial<typeof parts>) => {
    const clean = clampDuration({ ...parts, ...next }, maxHours);
    setParts(clean);
    onChange(formatDurationLabel(clean));
  };

  const missing = required && parts.hours === '';
  return (
    <fieldset className="grid gap-1 text-sm min-w-0">
      <legend className="font-medium mb-1">{label}</legend>
      <div className="flex items-center gap-2">
        <input inputMode="numeric" aria-label={`${label}: horas`} aria-invalid={missing} aria-required={required} placeholder="Horas" className={box}
          value={parts.hours} onChange={(e) => update({ hours: e.target.value })} />
        <span aria-hidden>h</span>
        <input inputMode="numeric" aria-label={`${label}: minutos`} placeholder="Min" className={box} disabled={parts.hours === ''}
          value={parts.minutes} onChange={(e) => update({ minutes: e.target.value })} />
        <span aria-hidden>min</span>
      </div>
      <span className="text-xs" style={{ color: missing ? 'var(--error)' : 'var(--text-muted)' }}>
        {missing ? 'Las horas son obligatorias' : `Máximo ${maxHours} h · minutos de 0 a 59 (opcional)`}
      </span>
    </fieldset>
  );
}
