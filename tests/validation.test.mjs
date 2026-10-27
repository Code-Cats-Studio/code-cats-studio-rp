// Ejecutar: node --experimental-strip-types --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/utils/validation.ts';
import * as sch from '../src/utils/schedule.ts';
import * as enrollmentMod from '../src/utils/enrollment.ts';
const { getClosedReason } = enrollmentMod;

test('teléfono: 8 dígitos reales son válidos', () => {
  for (const ok of ['70000000', '75268812', '60123456']) assert.equal(v.isValidPhone(ok), true, ok);
  for (const bad of ['7000000', '700000000', '7000000a', '', 'dddddddd', '7000 0000']) assert.equal(v.isValidPhone(bad), false, bad);
});

test('onlyDigits recorta y limpia', () => {
  assert.equal(v.onlyDigits('+591 7526-8812', 8), '59175268');
  assert.equal(v.onlyDigits('abc'), '');
});

test('CI: 5 a 10 dígitos', () => {
  assert.equal(v.isValidCI('1234'), false);
  assert.equal(v.isValidCI('12345'), true);
  assert.equal(v.isValidCI('12345678901'), false);
  assert.equal(v.isValidCI('12a45'), false);
});

test('duración: parseo de etiquetas existentes', () => {
  assert.deepEqual(v.parseDurationLabel('1h 30min'), { hours: '1', minutes: '30' });
  assert.deepEqual(v.parseDurationLabel('1h20m'), { hours: '1', minutes: '20' });
  assert.deepEqual(v.parseDurationLabel('9 horas'), { hours: '9', minutes: '' });
  assert.deepEqual(v.parseDurationLabel('Por definir'), { hours: '', minutes: '' });
  assert.deepEqual(v.parseDurationLabel(''), { hours: '', minutes: '' });
});

test('duración: formato', () => {
  assert.equal(v.formatDurationLabel({ hours: '1', minutes: '20' }), '1h 20min');
  assert.equal(v.formatDurationLabel({ hours: '2', minutes: '' }), '2h');
  assert.equal(v.formatDurationLabel({ hours: '2', minutes: '0' }), '2h');
  assert.equal(v.formatDurationLabel({ hours: '', minutes: '30' }), '');
});

test('duración: límites (horas <= máx, minutos 0-59)', () => {
  assert.deepEqual(v.clampDuration({ hours: '99', minutes: '10' }, 5), { hours: '5', minutes: '' });
  assert.deepEqual(v.clampDuration({ hours: '1', minutes: '75' }, 5), { hours: '1', minutes: '59' });
  assert.deepEqual(v.clampDuration({ hours: '1', minutes: '60' }, 5), { hours: '1', minutes: '59' });
  assert.deepEqual(v.clampDuration({ hours: 'x2', minutes: 'a5' }, 5), { hours: '2', minutes: '5' });
  assert.deepEqual(v.clampDuration({ hours: '', minutes: '' }, 5), { hours: '', minutes: '' });
  assert.deepEqual(v.clampDuration({ hours: '123', minutes: '' }, 5), { hours: '5', minutes: '' });
});

test('duración: validación por etiqueta', () => {
  assert.equal(v.isValidDurationLabel('1h 20min', 5), true);
  assert.equal(v.isValidDurationLabel('5h', 5), true);
  assert.equal(v.isValidDurationLabel('5h 1min', 5), false);
  assert.equal(v.isValidDurationLabel('6h', 5), false);
  assert.equal(v.isValidDurationLabel('0h', 5), false);
  assert.equal(v.isValidDurationLabel('', 5), false);
  assert.equal(v.isValidDurationLabel('Por definir', 5), false);
  assert.equal(v.isValidDurationLabel('9 horas', 80), true);
  assert.equal(v.isValidDurationLabel('80h', v.MAX_MODULE_HOURS), true);
  assert.equal(v.isValidDurationLabel('81h', v.MAX_MODULE_HOURS), false);
});

test('horario: día de la semana 1=lun … 7=dom', () => {
  assert.equal(sch.weekdayOfDate('2026-10-26'), 1); // lunes
  assert.equal(sch.weekdayOfDate('2026-10-30'), 5); // viernes
  assert.equal(sch.weekdayOfDate('2026-11-01'), 7); // domingo
});

test('horario: próxima fecha sugerida', () => {
  const tue = new Date(2026, 9, 27); // martes
  assert.equal(sch.nextDateForWeekdays([5], tue), '2026-10-30');
  assert.equal(sch.nextDateForWeekdays([2], tue), '2026-10-27'); // hoy cuenta
  assert.equal(sch.nextDateForWeekdays([1, 3], tue), '2026-10-28');
  assert.equal(sch.nextDateForWeekdays([], tue), '2026-10-27');
});

test('horario: duración de clase y nota de motivo', () => {
  assert.equal(sch.classMinutes('2026-10-30T19:00', '2026-10-30T21:00'), 120);
  assert.ok(sch.classMinutes('2026-10-30T10:00', '2026-10-30T16:00') > sch.MAX_CLASS_MINUTES);
  assert.equal(sch.withScheduleNote('Clase 3', ''), 'Clase 3');
  assert.equal(sch.withScheduleNote(' Clase 3 ', 'feriado'), 'Clase 3 (horario especial: feriado)');
});

test('inscripción: motivo de cierre', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(getClosedReason({ status: 'open' }, now), null);
  assert.equal(getClosedReason({ status: 'open', enrollment_closes_at: '2026-11-01T00:00:00Z' }, now), null);
  assert.match(getClosedReason({ status: 'open', enrollment_closes_at: '2026-10-20T00:00:00Z' }, now), /plazo de inscripción terminó/);
  assert.match(getClosedReason({ status: 'in_progress' }, now), /ya comenzó/);
  assert.match(getClosedReason({ status: 'finished' }, now), /terminó/);
  assert.match(getClosedReason({ status: 'draft' }, now), /todavía no abrió/);
  assert.match(getClosedReason({ status: 'cancelled' }, now), /cancelada/);
});

test('horario: nota de horario especial como subtítulo', () => {
  assert.deepEqual(sch.splitScheduleNote('Clase 3 (horario especial: feriado del lunes)'), { title: 'Clase 3', note: 'feriado del lunes' });
  assert.deepEqual(sch.splitScheduleNote('Clase 3'), { title: 'Clase 3', note: null });
  const t = sch.withScheduleNote('Clase 3', 'feriado (lunes)');
  assert.deepEqual(sch.splitScheduleNote(t), { title: 'Clase 3', note: 'feriado (lunes)' });
});

test('inscripción: edición que se muestra en el curso', () => {
  const { pickActiveOffering: pick } = enrollmentMod;
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(pick([], now), null);
  assert.equal(pick(null, now), null);
  assert.equal(pick(undefined, now), null);
  const finished = { id: 'f', status: 'finished', starts_on: '2026-01-01' };
  const running = { id: 'r', status: 'in_progress', starts_on: '2026-09-01' };
  const expired = { id: 'x', status: 'open', enrollment_closes_at: '2026-10-01T00:00:00Z', starts_on: '2026-10-10' };
  const open1 = { id: 'o1', status: 'open', starts_on: '2026-12-01' };
  const open2 = { id: 'o2', status: 'open', enrollment_closes_at: '2026-11-30T00:00:00Z', starts_on: '2026-11-15' };
  assert.equal(pick([finished, running, open1], now).id, 'o1');
  assert.equal(pick([open1, open2], now).id, 'o2'); // la que empieza antes
  assert.equal(pick([finished, expired, running], now).id, 'x'); // la más reciente entre en curso/vencida
  assert.equal(pick([finished, { id: 'c', status: 'cancelled' }], now).id, 'f');
  assert.equal(pick([{ id: 'n', status: 'open', starts_on: 'no-es-fecha' }, open1], now).id, 'o1');
  assert.equal(pick([{ id: 'n', status: 'open', enrollment_closes_at: 'basura' }], now).id, 'n'); // fecha inválida no traba
});
