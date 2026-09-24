import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextBirthday, daysUntil, currentAge, ageAtNext, zodiacSign, chineseZodiac,
  validatePerson, dueReminders, parseCSV, parseVCard, parseDateString, mergePeople,
  toICS, formatCountdown, isMilestone, wishMessage, stats, sortByUpcoming,
} from '../js/lib.js';

const d = (y, m, day) => new Date(y, m - 1, day);
const person = (over = {}) => validatePerson({ name: 'Alice Martin', day: 15, month: 3, year: 1990, ...over });

test('prochain anniversaire : aujourd’hui, plus tard, année suivante', () => {
  const p = person();
  assert.equal(daysUntil(p, d(2026, 3, 15)), 0);
  assert.equal(daysUntil(p, d(2026, 3, 14)), 1);
  assert.deepEqual(nextBirthday(p, d(2026, 3, 16)), d(2027, 3, 15));
});

test('29 février fêté le 28 les années non bissextiles', () => {
  const p = person({ day: 29, month: 2, year: 2000 });
  assert.deepEqual(nextBirthday(p, d(2026, 1, 1)), d(2026, 2, 28));
  assert.deepEqual(nextBirthday(p, d(2028, 1, 1)), d(2028, 2, 29));
  assert.equal(currentAge(p, d(2026, 2, 28)), 26);
  assert.equal(currentAge(p, d(2026, 2, 27)), 25);
});

test('âge actuel et âge au prochain anniversaire', () => {
  const p = person();
  assert.equal(currentAge(p, d(2026, 3, 14)), 35);
  assert.equal(currentAge(p, d(2026, 3, 15)), 36);
  assert.equal(ageAtNext(p, d(2026, 3, 16)), 37);
  assert.equal(currentAge(person({ year: null }), d(2026, 1, 1)), null);
});

test('signes du zodiaque (bornes)', () => {
  assert.equal(zodiacSign(1, 19).name, 'Capricorne');
  assert.equal(zodiacSign(1, 20).name, 'Verseau');
  assert.equal(zodiacSign(3, 21).name, 'Bélier');
  assert.equal(zodiacSign(12, 22).name, 'Capricorne');
  assert.equal(chineseZodiac(2024).name, 'Dragon');
  assert.equal(chineseZodiac(1990).name, 'Cheval');
});

test('validation', () => {
  assert.throws(() => validatePerson({ name: '', day: 1, month: 1 }), /nom/);
  assert.throws(() => validatePerson({ name: 'X', day: 31, month: 4 }), /Jour/);
  assert.throws(() => validatePerson({ name: 'X', day: 29, month: 2, year: 2001 }), /bissextile/);
  assert.equal(validatePerson({ name: 'X', day: 29, month: 2 }).year, null);
});

test('rappels dus', () => {
  const a = person({ id: 'a' });
  const b = person({ id: 'b', day: 22, month: 3, reminders: [7] });
  const due = dueReminders([a, b], [0, 1], d(2026, 3, 15));
  assert.deepEqual(due.map((r) => r.person.id).sort(), ['a', 'b']);
  assert.equal(dueReminders([a, b], [0, 1], d(2026, 3, 10)).length, 0);
});

test('parse dates et CSV', () => {
  assert.deepEqual(parseDateString('05/07/1988'), { day: 5, month: 7, year: 1988 });
  assert.deepEqual(parseDateString('1988-07-05'), { year: 1988, month: 7, day: 5 });
  assert.deepEqual(parseDateString('--07-05'), { year: null, month: 7, day: 5 });
  const { people, errors } = parseCSV('nom;date;groupe\nBob;01/02/1980;Famille\nZoé;31/02\nLéa;3/4');
  assert.equal(people.length, 2);
  assert.equal(people[0].group, 'Famille');
  assert.equal(errors.length, 1);
});

test('import vCard', () => {
  const vcf = 'BEGIN:VCARD\nVERSION:3.0\nFN:Paul Durand\nBDAY:1975-11-02\nTEL:0600000000\nEND:VCARD\nBEGIN:VCARD\nFN:Sans date\nEND:VCARD';
  const { people } = parseVCard(vcf);
  assert.equal(people.length, 1);
  assert.equal(people[0].month, 11);
  assert.equal(people[0].phone, '0600000000');
});

test('fusion sans doublons', () => {
  const a = person();
  const r = mergePeople([a], [person({ id: 'z' }), person({ name: 'Bob' })]);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
});

test('export ICS', () => {
  const ics = toICS([person({ id: 'x', notes: 'aime, le chocolat' }), person({ id: 'y', day: 29, month: 2, year: null })], [0, 7], d(2026, 9, 24));
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20250315/);
  assert.match(ics, /BYMONTHDAY=-1/);
  assert.match(ics, /TRIGGER:-P6DT15H/);
  assert.match(ics, /aime\\, le chocolat/);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 4);
});

test('divers', () => {
  assert.equal(formatCountdown(0), "Aujourd'hui 🎉");
  assert.equal(formatCountdown(3), 'Dans 3 jours');
  assert.ok(isMilestone(30) && isMilestone(18) && isMilestone(25) && !isMilestone(33));
  assert.match(wishMessage(person(), 'milestone', 0, d(2026, 1, 1)), /36 ans.*Alice/);
  const s = stats([person(), person({ name: 'B', year: 2000, month: 9 })], d(2026, 9, 24));
  assert.equal(s.total, 2);
  assert.equal(s.byMonth[2], 1);
  assert.equal(s.oldest.person.name, 'Alice Martin');
  const sorted = sortByUpcoming([person(), person({ name: 'B', month: 10, day: 1 })], d(2026, 9, 24));
  assert.equal(sorted[0].person.name, 'B');
});
