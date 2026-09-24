import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextBirthday, daysUntil, currentAge, ageAtNext, zodiacSign, chineseZodiac, validatePerson,
  parseCSV, parseDateString, mergePeople, exportCSV, formatCountdown, isMilestone,
  stats, sortByUpcoming, isGiftBought, occasionLabel, occasionPhrase, lastOccurrence, toICS,
  pendingIdeas, giftHistory, firstName, formatDayMonth,
} from '../src/lib/birthdays.ts';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const person = (over: Record<string, unknown> = {}) =>
  validatePerson({ name: 'Alice Martin', day: 15, month: 3, year: 1990, ...over }, d(2026, 9, 24));

test('prochain anniversaire : aujourd’hui, plus tard, année suivante', () => {
  const p = person();
  assert.equal(daysUntil(p, d(2026, 3, 15)), 0);
  assert.equal(daysUntil(p, d(2026, 3, 14)), 1);
  assert.deepEqual(nextBirthday(p, d(2026, 3, 16)), d(2027, 3, 15));
  assert.deepEqual(lastOccurrence(p, d(2026, 3, 14)), d(2025, 3, 15));
  assert.deepEqual(lastOccurrence(p, d(2026, 3, 15)), d(2026, 3, 15));
});

test('29 février fêté le 28 les années non bissextiles', () => {
  const p = person({ day: 29, month: 2, year: 2000 });
  assert.deepEqual(nextBirthday(p, d(2026, 1, 1)), d(2026, 2, 28));
  assert.deepEqual(nextBirthday(p, d(2028, 1, 1)), d(2028, 2, 29));
  assert.equal(currentAge(p, d(2026, 2, 28)), 26);
  assert.equal(currentAge(p, d(2026, 2, 27)), 25);
});

test('âges', () => {
  const p = person();
  assert.equal(currentAge(p, d(2026, 3, 14)), 35);
  assert.equal(currentAge(p, d(2026, 3, 15)), 36);
  assert.equal(ageAtNext(p, d(2026, 3, 16)), 37);
  assert.equal(currentAge(person({ year: null }), d(2026, 1, 1)), null);
});

test('signes', () => {
  assert.equal(zodiacSign(1, 19).name, 'Capricorne');
  assert.equal(zodiacSign(1, 20).name, 'Verseau');
  assert.equal(zodiacSign(12, 22).name, 'Capricorne');
  assert.equal(chineseZodiac(2024)?.name, 'Dragon');
  assert.equal(chineseZodiac(1996)?.name, 'Rat');
});

test('validation et migration v1', () => {
  assert.throws(() => validatePerson({ name: '', day: 1, month: 1 }), /nom/);
  assert.throws(() => validatePerson({ name: 'X', day: 31, month: 4 }), /Jour/);
  assert.throws(() => validatePerson({ name: 'X', day: 29, month: 2, year: 2001 }), /bissextile/);
  assert.throws(() => validatePerson({ name: 'X', day: 1, month: 1, budget: 'abc' }), /Budget/);
  const p = validatePerson({ name: 'X', day: 29, month: 2, budget: '25,5', reminders: [7, 1, 7] });
  assert.equal(p.year, null);
  assert.equal(p.budget, 25.5);
  assert.deepEqual(p.reminders, [1, 7]);
  assert.equal(p.giftReminder, true);
  assert.equal(p.kind, 'birthday');
  // Ancien format : { text, done }
  const v1 = validatePerson({ name: 'Y', day: 1, month: 1, gifts: [{ text: 'Livre', done: true }, { text: 'Gourde' }] });
  assert.deepEqual(v1.gifts.map((g) => g.status), ['given', 'idea']);
  assert.deepEqual(pendingIdeas(v1).map((g) => g.text), ['Gourde']);
  // Un souvenir n'a pas de rappel cadeau
  assert.equal(validatePerson({ name: 'Z', day: 1, month: 1, kind: 'memorial' }).giftReminder, false);
  // Fête invalide ignorée
  assert.equal(validatePerson({ name: 'Z', day: 1, month: 1, nameDay: { day: 31, month: 2 } }).nameDay, null);
});

test('libellés selon le type d’événement', () => {
  const t = d(2026, 1, 1);
  assert.equal(occasionPhrase(person(), t), 'aura 36 ans');
  assert.equal(occasionLabel(person({ kind: 'wedding', year: 2016 }), t), '10 ans de mariage');
  assert.equal(occasionLabel(person({ kind: 'couple', year: 2025 }), t), '1 an ensemble');
  assert.equal(occasionLabel(person({ kind: 'memorial', year: 2020 }), t), 'Il y a 6 ans');
  assert.equal(occasionLabel(person({ kind: 'other', label: 'Adoption de Filou' }), t), 'Adoption de Filou');
  assert.equal(firstName({ name: 'Paul & Léa' }), 'Paul & Léa');
  assert.equal(formatDayMonth({ day: 1, month: 5 }), '1er mai');
});

test('historique des cadeaux', () => {
  const p = person({ gifts: [{ text: 'A', status: 'given', year: 2024 }, { text: 'B', status: 'given', year: 2025 }, { text: 'C' }] });
  assert.deepEqual(giftHistory(p).map((g) => g.text), ['B', 'A']);
});

test('dates, CSV et ICS', () => {
  assert.deepEqual(parseDateString('05/07/1988'), { day: 5, month: 7, year: 1988 });
  assert.deepEqual(parseDateString('1988-07-05'), { year: 1988, month: 7, day: 5 });
  assert.deepEqual(parseDateString('--07-05'), { year: null, month: 7, day: 5 });
  const { people, errors } = parseCSV('nom;date;groupe\nBob;01/02/1980;Famille\nZoé;31/02\nLéa;3/4');
  assert.equal(people.length, 2);
  assert.equal(people[0].group, 'Famille');
  assert.equal(errors.length, 1);
  const back = parseCSV(exportCSV(people));
  assert.deepEqual(back.people.map((p) => [p.name, p.day, p.month, p.year]), people.map((p) => [p.name, p.day, p.month, p.year]));
  const ics = toICS([person({ id: 'x' }), person({ id: 'y', day: 29, month: 2, year: null })], d(2026, 9, 24));
  assert.match(ics, /DTSTART;VALUE=DATE:20250315/);
  assert.match(ics, /BYMONTHDAY=-1/);
});

test('fusion sans doublons', () => {
  const r = mergePeople([person()], [person({ id: 'z' }), person({ name: 'Bob' })]);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
});

test('cadeau acheté pour l’occurrence à venir', () => {
  const p = person({ giftBought: { 2027: 'x' } });
  assert.equal(isGiftBought(p, d(2026, 9, 24)), true);
  assert.equal(isGiftBought(p, d(2026, 3, 1)), false);
});

test('divers', () => {
  assert.equal(formatCountdown(0), "Aujourd'hui");
  assert.equal(formatCountdown(3), 'Dans 3 jours');
  assert.ok(isMilestone(30) && isMilestone(18) && isMilestone(25) && !isMilestone(33) && !isMilestone(0));
  const s = stats([person({ budget: 30 }), person({ name: 'B', year: 2000, month: 10, day: 1, budget: 20 })], d(2026, 9, 24));
  assert.equal(s.total, 2);
  assert.equal(s.oldest?.person.name, 'Alice Martin');
  assert.equal(s.budgetNext30, 20);
  assert.equal(s.giftsToBuy, 1);
  // Les favoris passent devant à date égale
  const sorted = sortByUpcoming([person({ name: 'Z' }), person({ name: 'Y', favorite: true })], d(2026, 9, 24));
  assert.equal(sorted[0].person.name, 'Y');
});
