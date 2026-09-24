import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePerson } from '../src/lib/birthdays.ts';
import {
  easterSunday, fathersDay, grandmothersDay, mothersDay, nameDayFor, nocesName, upcomingHolidays,
} from '../src/lib/calendarfr.ts';
import { achievements, DEFAULT_META, recentMissed, upcomingDayMilestones, wishStreak, yearReview } from '../src/lib/insights.ts';
import { parseQuickAdd } from '../src/lib/quickadd.ts';
import { suggestGifts } from '../src/lib/gifts.ts';
import { suggestedTone, wishMessage } from '../src/lib/wishes.ts';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const now = d(2026, 9, 24);
const person = (over: Record<string, unknown> = {}) =>
  validatePerson({ name: 'Alice Martin', day: 15, month: 3, year: 1990, createdAt: '2024-01-01T00:00:00Z', ...over }, now);

test('Pâques et fêtes du calendrier', () => {
  assert.deepEqual(easterSunday(2024), d(2024, 3, 31));
  assert.deepEqual(easterSunday(2025), d(2025, 4, 20));
  assert.deepEqual(easterSunday(2026), d(2026, 4, 5));
  assert.deepEqual(mothersDay(2025), d(2025, 5, 25));
  assert.deepEqual(mothersDay(2026), d(2026, 5, 31));
  // 2024 : dernier dimanche de mai = 26 mai, Pentecôte = 19 mai → pas de décalage
  assert.deepEqual(mothersDay(2024), d(2024, 5, 26));
  // 2027 : Pâques 28 mars → Pentecôte 16 mai ; 2032 : Pâques 28 mars aussi. Cas de décalage : 2023 (Pentecôte 28 mai)
  assert.deepEqual(mothersDay(2023), d(2023, 6, 4));
  assert.deepEqual(fathersDay(2026), d(2026, 6, 21));
  assert.deepEqual(grandmothersDay(2026), d(2026, 3, 1));
  assert.equal(upcomingHolidays(now)[0].holiday.id, 'grands-peres');
});

test('fêtes des prénoms et noces', () => {
  assert.deepEqual(nameDayFor('Clément Piquenet'), { day: 23, month: 11 });
  assert.deepEqual(nameDayFor('Jean-Pierre Dupont'), { day: 24, month: 6 });
  assert.deepEqual(nameDayFor('Hélène'), { day: 18, month: 8 });
  assert.equal(nameDayFor('Zébulon'), null);
  assert.equal(nocesName(50), 'Noces d’or');
  assert.equal(nocesName(10), 'Noces d’étain');
  assert.equal(nocesName(30), 'Noces de perle');
  assert.equal(nocesName(51), null);
});

test('saisie rapide', () => {
  assert.deepEqual(parseQuickAdd('Julie Martin 12/03/1990 famille'), { name: 'Julie Martin', day: 12, month: 3, year: 1990, group: 'Famille', kind: 'birthday' });
  assert.deepEqual(parseQuickAdd('Paul 1er avril'), { name: 'Paul', day: 1, month: 4, year: null, group: null, kind: 'birthday' });
  assert.deepEqual(parseQuickAdd('Léa 3 févr. 2001 amis'), { name: 'Léa', day: 3, month: 2, year: 2001, group: 'Amis', kind: 'birthday' });
  const w = parseQuickAdd('mariage Paul & Léa 14 juillet 2012');
  assert.equal(w.kind, 'wedding');
  assert.equal(w.name, 'Paul & Léa');
  assert.equal(w.month, 7);
  assert.equal(parseQuickAdd('Hugo 05.06.98').year, 1998);
  assert.equal(parseQuickAdd('Hugo').day, null);
});

test('idées cadeaux', () => {
  const p = person({ interests: ['cuisine', 'vin'], budget: 50, gifts: [{ text: 'Coffret d’épices du monde' }] });
  const ideas = suggestGifts(p, now);
  assert.ok(ideas.length >= 5);
  assert.ok(ideas.every((i) => i.price <= 60));
  assert.ok(!ideas.some((i) => i.text === 'Coffret d’épices du monde'));
  assert.ok(ideas.some((i) => /couteau|fromages|recettes|bouteille/i.test(i.text)));
  const kid = person({ year: 2020 });
  assert.ok(suggestGifts(kid, now, 20).some((i) => /Livre illustré|construction/.test(i.text)));
});

test('vœux et ton suggéré', () => {
  assert.equal(suggestedTone(person({ day: 20, month: 9 }), now), 'retard');
  assert.equal(suggestedTone(person({ day: 20, month: 9, celebrated: { 2026: 'x' } }), now), 'chaleureux');
  assert.equal(suggestedTone(person({ year: 1987, month: 1, day: 5 }), now), 'milestone');
  assert.equal(suggestedTone(person({ year: 2019 }), now), 'enfant');
  assert.equal(suggestedTone(person({ relation: 'Conjoint·e' }), now), 'romantique');
  assert.match(wishMessage(person({ kind: 'wedding', name: 'Paul & Léa', year: 1977, month: 6, day: 1 }), 'chaleureux', 0, now), /50 ans \(noces d’or\)/);
  assert.match(wishMessage(person(), 'milestone', 0, d(2026, 1, 1)), /36 ans.*Alice/);
});

test('oublis récents, jalons, série', () => {
  const late = person({ id: 'l', day: 20, month: 9 });
  const wished = person({ id: 'w', day: 22, month: 9, celebrated: { 2026: '2026-09-22T10:00:00Z' } });
  const old = person({ id: 'o', day: 1, month: 9 });
  assert.deepEqual(recentMissed([late, wished, old], now).map((x) => x.person.id), ['l']);
  const young = person({ id: 'y', year: 1999, month: 5, day: 12 });
  // 12 mai 1999 + 10 000 jours = 27 septembre 2026
  const m = upcomingDayMilestones([young], now);
  assert.equal(m[0].label, '10 000e jour');
  assert.deepEqual(m[0].date, d(2026, 9, 27));
  assert.equal(wishStreak([wished, late], now), 1);
  assert.equal(wishStreak([person({ day: 24, month: 9 }), wished], now), 1); // aujourd'hui non souhaité ne casse pas la série
});

test('badges et bilan', () => {
  const a = person({ celebrated: { 2026: '2026-03-15T09:00:00Z' }, gifts: [{ text: 'Livre', status: 'given', year: 2026, price: 20 }], giftBought: { 2026: '2026-03-01T09:00:00Z' } });
  const b = person({ name: 'Bob', day: 1, month: 6, celebrated: { 2026: '2026-06-03T09:00:00Z' } });
  const badges = achievements([a, b], { ...DEFAULT_META, messagesSent: 12 }, now);
  const get = (id: string) => badges.find((x) => x.id === id)!;
  assert.equal(get('first').unlocked, true);
  assert.equal(get('poet').unlocked, true);
  assert.equal(get('ten').progress, 0.2);
  const r = yearReview([a, b], 2026, now);
  assert.equal(r.total, 2);
  assert.equal(r.wished, 2);
  assert.equal(r.onTime, 1);
  assert.equal(r.giftsPrepared, 1);
  assert.equal(r.spent, 20);
});
