import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePerson } from '../src/lib/birthdays.ts';
import { planNotifications, pruneSnoozes, DEFAULT_SETTINGS, type Settings } from '../src/lib/planner.ts';

const now = new Date(2026, 8, 24, 12, 0); // jeudi 24 septembre 2026, midi
const base: Settings = {
  ...DEFAULT_SETTINGS, reminders: [0, 1, 7], giftReminders: [14, 3], hour: 9, minute: 30,
  eveningNudge: false, weekly: false, nameDays: false, holidays: false, dayMilestones: false,
};
const lucas = validatePerson({
  id: 'lucas', name: 'Lucas Bernard', day: 10, month: 10, year: 1996, budget: 40,
  gifts: [{ text: 'Gourde' }, { text: 'Livre', status: 'given', year: 2025 }],
}, now);

test('rappels anniversaire et cadeau à la bonne date et heure', () => {
  const plan = planNotifications([lucas], base, now).filter((n) => n.id.includes(':2026:'));
  const byId = Object.fromEntries(plan.map((n) => [n.id, n]));
  assert.deepEqual(Object.keys(byId).sort(), ['b:lucas:2026:0', 'b:lucas:2026:1', 'b:lucas:2026:7', 'g:lucas:2026:14', 'g:lucas:2026:3']);
  assert.deepEqual(byId['b:lucas:2026:0'].date, new Date(2026, 9, 10, 9, 30));
  assert.deepEqual(byId['g:lucas:2026:14'].date, new Date(2026, 8, 26, 9, 30));
  assert.match(byId['b:lucas:2026:0'].body, /fête ses 30 ans/);
  assert.match(byId['g:lucas:2026:14'].title, /Cadeau pour Lucas.*dans 14 jours/);
  assert.match(byId['g:lucas:2026:14'].body, /Gourde · budget 40 €/);
  assert.doesNotMatch(byId['g:lucas:2026:14'].body, /Livre/);
});

test('les rappels passés ne sont pas programmés', () => {
  const soon = validatePerson({ id: 's', name: 'Sam', day: 25, month: 9 }, now);
  const ids = planNotifications([soon], base, now).map((n) => n.id).filter((id) => id.includes(':2026:'));
  assert.deepEqual(ids, ['b:s:2026:0']);
});

test('cadeau acheté ou rappel cadeau désactivé : plus de rappel cadeau', () => {
  const bought = { ...lucas, giftBought: { 2026: 'x' } };
  assert.ok(!planNotifications([bought], base, now).some((n) => n.id.startsWith('g:lucas:2026')));
  assert.ok(planNotifications([bought], base, now).some((n) => n.id.startsWith('g:lucas:2027')));
  assert.ok(!planNotifications([{ ...lucas, giftReminder: false }], base, now).some((n) => n.kind === 'gift'));
});

test('rappels personnalisés et report', () => {
  const custom = { ...lucas, reminders: [2] };
  const s: Settings = { ...base, snoozes: [{ personId: 'lucas', at: new Date(2026, 8, 25, 9, 30).toISOString() }] };
  const plan = planNotifications([custom], s, now);
  assert.ok(plan.some((n) => n.id === 'b:lucas:2026:2'));
  assert.ok(!plan.some((n) => n.id === 'b:lucas:2026:0'));
  const snooze = plan.find((n) => n.id.startsWith('s:'));
  assert.ok(snooze);
  assert.match(snooze.title, /dans 15 jours/);
  assert.equal(pruneSnoozes(s, new Date(2026, 8, 26)).snoozes.length, 0);
});

test('relance du soir seulement si pas encore souhaité', () => {
  const s = { ...base, eveningNudge: true };
  const n = planNotifications([lucas], s, now).find((x) => x.id === 'n:lucas:2026');
  assert.deepEqual(n?.date, new Date(2026, 9, 10, 20, 0));
  const wished = { ...lucas, celebrated: { 2026: 'x' } };
  assert.ok(!planNotifications([wished], s, now).some((x) => x.id === 'n:lucas:2026'));
});

test('fêtes, fêtes des mères/pères, jalons, anniversaire de l’utilisateur, récap hebdo', () => {
  const s: Settings = { ...base, nameDays: true, holidays: true, dayMilestones: true, weekly: true, userName: 'Clem', userBirthday: { day: 5, month: 10, year: 1995 } };
  const clement = validatePerson({ id: 'c', name: 'Clément', day: 2, month: 4, nameDay: { day: 23, month: 11 } }, now);
  const papi = validatePerson({ id: 'p', name: 'Papi Jean', day: 2, month: 2, year: 1940, relation: 'Grand-père' }, now);
  const young = validatePerson({ id: 'y', name: 'Yan', day: 12, month: 5, year: 1999 }, now);
  const plan = planNotifications([clement, papi, young, lucas], s, now, 500);
  const ids = plan.map((n) => n.id);
  assert.ok(ids.includes('f:c:2026'));
  assert.deepEqual(plan.find((n) => n.id === 'f:c:2026')?.date, new Date(2026, 10, 23, 9, 30));
  // Fête des grands-pères : 1er dimanche d'octobre 2026 = 4 octobre
  assert.deepEqual(plan.find((n) => n.id === 'h:grands-peres:2026:0')?.date, new Date(2026, 9, 4, 9, 30));
  assert.ok(!ids.some((id) => id.startsWith('h:meres')), 'pas de fête des mères sans « Maman » dans la liste');
  assert.ok(ids.includes('m:y:10 000e jour'));
  assert.deepEqual(plan.find((n) => n.id === 'u:2026')?.date, new Date(2026, 9, 5, 8, 0));
  // Dimanche 4 octobre : Lucas le samedi 10 → récap envoyé ; dimanche 27 septembre : rien le 28/09-4/10 hors fêtes
  assert.ok(ids.includes('w:2026-10-04'));
  assert.match(plan.find((n) => n.id === 'w:2026-10-04')!.body, /Lucas \(sam\.\)/);
});

test('souvenir : ton adapté, sans cadeau ni relance', () => {
  const m = validatePerson({ id: 'm', name: 'Mamie Rose', kind: 'memorial', day: 10, month: 10, year: 2019 }, now);
  const plan = planNotifications([m], { ...base, eveningNudge: true }, now);
  const j = plan.find((n) => n.id === 'b:m:2026:0');
  assert.match(j!.title, /En souvenir de Mamie Rose/);
  assert.match(j!.body, /Il y a 7 ans/);
  assert.ok(!plan.some((n) => n.kind === 'gift' || n.kind === 'nudge'));
});

test('tri chronologique et limite', () => {
  const many = Array.from({ length: 40 }, (_, i) => validatePerson({ id: `p${i}`, name: `P${i}`, day: (i % 28) + 1, month: (i % 12) + 1 }, now));
  const plan = planNotifications(many, base, now, 60);
  assert.equal(plan.length, 60);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i - 1].date <= plan[i].date);
  assert.ok(plan[0].date > now);
});

test('29 février : notification le 28 les années non bissextiles', () => {
  const leap = validatePerson({ id: 'l', name: 'Inès', day: 29, month: 2, year: 2000 }, now);
  const n = planNotifications([leap], base, now).find((x) => x.id === 'b:l:2027:0');
  assert.deepEqual(n?.date, new Date(2027, 1, 28, 9, 30));
});
