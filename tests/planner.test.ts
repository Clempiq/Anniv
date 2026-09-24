import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePerson } from '../src/lib/birthdays.ts';
import { planNotifications, pruneSnoozes, DEFAULT_SETTINGS, type Settings } from '../src/lib/planner.ts';

const now = new Date(2026, 8, 24, 12, 0); // 24 septembre 2026, midi
const settings: Settings = { ...DEFAULT_SETTINGS, reminders: [0, 1, 7], giftReminders: [14, 3], hour: 9, minute: 30 };
const lucas = validatePerson({
  id: 'lucas', name: 'Lucas Bernard', day: 10, month: 10, year: 1996, budget: 40,
  gifts: [{ text: 'Gourde' }, { text: 'Livre', done: true }],
}, now);

test('rappels anniversaire et cadeau à la bonne date et heure', () => {
  const plan = planNotifications([lucas], settings, now).filter((n) => n.id.includes(':2026:'));
  const byId = Object.fromEntries(plan.map((n) => [n.id, n]));
  assert.deepEqual(Object.keys(byId).sort(), ['b:lucas:2026:0', 'b:lucas:2026:1', 'b:lucas:2026:7', 'g:lucas:2026:14', 'g:lucas:2026:3']);
  assert.deepEqual(byId['b:lucas:2026:0'].date, new Date(2026, 9, 10, 9, 30));
  assert.deepEqual(byId['g:lucas:2026:14'].date, new Date(2026, 8, 26, 9, 30));
  assert.match(byId['b:lucas:2026:0'].body, /fête ses 30 ans/);
  assert.match(byId['g:lucas:2026:14'].title, /Cadeau pour Lucas.*dans 14 jours/);
  assert.match(byId['g:lucas:2026:14'].body, /Gourde · budget 40 €/);
  assert.doesNotMatch(byId['g:lucas:2026:14'].body, /Livre/); // idée déjà offerte
});

test('les rappels passés ne sont pas programmés', () => {
  const soon = validatePerson({ id: 's', name: 'Sam', day: 25, month: 9 }, now);
  const ids = planNotifications([soon], settings, now).map((n) => n.id).filter((id) => id.includes(':2026:'));
  // J-7 et cadeau J-14/J-3 sont passés ; la veille (24/09 9h30) est déjà passée à midi
  assert.deepEqual(ids, ['b:s:2026:0']);
});

test('cadeau acheté ou rappel cadeau désactivé : plus de rappel cadeau', () => {
  const bought = { ...lucas, giftBought: { 2026: 'x' } };
  assert.ok(!planNotifications([bought], settings, now).some((n) => n.id.startsWith('g:lucas:2026')));
  assert.ok(planNotifications([bought], settings, now).some((n) => n.id.startsWith('g:lucas:2027')));
  const off = { ...lucas, giftReminder: false };
  assert.ok(!planNotifications([off], settings, now).some((n) => n.kind === 'gift'));
});

test('rappels personnalisés et report', () => {
  const custom = { ...lucas, reminders: [2] };
  const s: Settings = { ...settings, snoozes: [{ personId: 'lucas', at: new Date(2026, 8, 25, 9, 30).toISOString() }] };
  const plan = planNotifications([custom], s, now);
  assert.ok(plan.some((n) => n.id === 'b:lucas:2026:2'));
  assert.ok(!plan.some((n) => n.id === 'b:lucas:2026:0'));
  const snooze = plan.find((n) => n.id.startsWith('s:'));
  assert.ok(snooze);
  assert.match(snooze.title, /dans 15 jours/);
  assert.equal(pruneSnoozes(s, new Date(2026, 8, 26)).snoozes.length, 0);
});

test('tri chronologique et limite', () => {
  const many = Array.from({ length: 40 }, (_, i) => validatePerson({ id: `p${i}`, name: `P${i}`, day: (i % 28) + 1, month: (i % 12) + 1 }, now));
  const plan = planNotifications(many, settings, now, 60);
  assert.equal(plan.length, 60);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i - 1].date <= plan[i].date);
  assert.ok(plan[0].date > now);
});

test('29 février : notification le 28 les années non bissextiles', () => {
  const leap = validatePerson({ id: 'l', name: 'Inès', day: 29, month: 2, year: 2000 }, now);
  const n = planNotifications([leap], settings, now).find((x) => x.id === 'b:l:2027:0');
  assert.deepEqual(n?.date, new Date(2027, 1, 28, 9, 30));
});
