// Logique métier pure (sans React ni API native) : dates, âges, signes, vœux, import/export.
// Testée avec `node --test` (voir tests/).

export type GiftIdea = { id: string; text: string; done: boolean };

export type Person = {
  id: string;
  name: string;
  day: number;
  month: number; // 1-12
  year: number | null;
  group: string;
  emoji: string;
  notes: string;
  phone: string;
  email: string;
  gifts: GiftIdea[];
  /** Budget cadeau en euros (facultatif). */
  budget: number | null;
  /** Rappels d'anniversaire propres à la personne (jours avant) ; null = réglages par défaut. */
  reminders: number[] | null;
  /** Rappel « acheter un cadeau » activé pour cette personne. */
  giftReminder: boolean;
  /** Années pour lesquelles le cadeau est acheté : { "2026": "2026-09-10T…" }. */
  giftBought: Record<string, string>;
  /** Années pour lesquelles l'anniversaire a été souhaité. */
  celebrated: Record<string, string>;
  createdAt: string;
};

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
export const MONTHS_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];
export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const DAY_MS = 86400000;

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(month: number, year = 2000): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type DayMonth = Pick<Person, 'day' | 'month'>;
type WithYear = DayMonth & Pick<Person, 'year'>;

/** Date de l'anniversaire pour une année (29 février → 28 février les années non bissextiles). */
export function birthdayInYear(p: DayMonth, year: number): Date {
  const day = p.month === 2 && p.day === 29 && !isLeapYear(year) ? 28 : p.day;
  return new Date(year, p.month - 1, day);
}

/** Prochaine occurrence, aujourd'hui inclus. */
export function nextBirthday(p: DayMonth, today = new Date()): Date {
  const t = startOfDay(today);
  const d = birthdayInYear(p, t.getFullYear());
  return d < t ? birthdayInYear(p, t.getFullYear() + 1) : d;
}

export function daysBetween(a: Date, b: Date): number {
  // Math.round absorbe les changements d'heure
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function daysUntil(p: DayMonth, today = new Date()): number {
  return daysBetween(today, nextBirthday(p, today));
}

export function currentAge(p: WithYear, today = new Date()): number | null {
  if (!p.year) return null;
  const t = startOfDay(today);
  let age = t.getFullYear() - p.year;
  if (birthdayInYear(p, t.getFullYear()) > t) age--;
  return age;
}

export function ageAtNext(p: WithYear, today = new Date()): number | null {
  if (!p.year) return null;
  return nextBirthday(p, today).getFullYear() - p.year;
}

export function isMilestone(age: number | null): boolean {
  if (age == null || age <= 0) return false;
  return age === 1 || age === 18 || age === 21 || (age >= 10 && age % 10 === 0) || age % 25 === 0;
}

const ZODIAC: [string, string, number, number][] = [
  ['Capricorne', '♑', 1, 19], ['Verseau', '♒', 2, 18], ['Poissons', '♓', 3, 20],
  ['Bélier', '♈', 4, 19], ['Taureau', '♉', 5, 20], ['Gémeaux', '♊', 6, 20],
  ['Cancer', '♋', 7, 22], ['Lion', '♌', 8, 22], ['Vierge', '♍', 9, 22],
  ['Balance', '♎', 10, 22], ['Scorpion', '♏', 11, 21], ['Sagittaire', '♐', 12, 21],
  ['Capricorne', '♑', 12, 31],
];

export function zodiacSign(month: number, day: number): { name: string; emoji: string } {
  for (const [name, emoji, m, d] of ZODIAC) {
    if (month < m || (month === m && day <= d)) return { name, emoji };
  }
  return { name: 'Capricorne', emoji: '♑' };
}

const CHINESE: [string, string][] = [
  ['Rat', '🐀'], ['Bœuf', '🐂'], ['Tigre', '🐅'], ['Lapin', '🐇'], ['Dragon', '🐉'], ['Serpent', '🐍'],
  ['Cheval', '🐎'], ['Chèvre', '🐐'], ['Singe', '🐒'], ['Coq', '🐓'], ['Chien', '🐕'], ['Cochon', '🐖'],
];

/** Signe chinois (approximation par année grégorienne ; 2020 = Rat). */
export function chineseZodiac(year: number | null): { name: string; emoji: string } | null {
  if (!year) return null;
  const [name, emoji] = CHINESE[(((year - 2020) % 12) + 12) % 12];
  return { name, emoji };
}

export function bornWeekday(p: WithYear): string | null {
  if (!p.year) return null;
  return WEEKDAYS[new Date(p.year, p.month - 1, p.day).getDay()];
}

export function daysAlive(p: WithYear, today = new Date()): number | null {
  if (!p.year) return null;
  return daysBetween(new Date(p.year, p.month - 1, p.day), today);
}

export function formatDayMonth(p: DayMonth): string {
  return `${p.day} ${MONTHS[p.month - 1]}`;
}

export function formatCountdown(days: number): string {
  if (days === 0) return "Aujourd'hui 🎉";
  if (days === 1) return 'Demain';
  if (days < 7) return `Dans ${days} jours`;
  if (days < 14) return 'Dans 1 semaine';
  if (days < 31) return `Dans ${Math.floor(days / 7)} semaines`;
  const months = Math.round(days / 30.4);
  return months <= 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
}

export function firstName(p: Pick<Person, 'name'>): string {
  return p.name.trim().split(/\s+/)[0] ?? p.name;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toRecord(v: unknown): Record<string, string> {
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, string>) } : {};
}

/** Valide et normalise une personne. Lève une erreur (en français) si invalide. */
export function validatePerson(input: Record<string, unknown>, now = new Date()): Person {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('Le nom est obligatoire.');
  const day = Number(input.day);
  const month = Number(input.month);
  const rawYear = input.year;
  const year = rawYear === '' || rawYear == null ? null : Number(rawYear);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Mois invalide.');
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month, 2000)) throw new Error('Jour invalide.');
  if (year !== null) {
    if (!Number.isInteger(year) || year < 1900 || year > now.getFullYear()) throw new Error('Année invalide.');
    if (month === 2 && day === 29 && !isLeapYear(year)) throw new Error(`${year} n'est pas bissextile.`);
  }
  const rawBudget = input.budget;
  const budget = rawBudget === '' || rawBudget == null ? null : Number(String(rawBudget).replace(',', '.'));
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error('Budget invalide.');

  const gifts = Array.isArray(input.gifts)
    ? (input.gifts as Record<string, unknown>[])
      .filter((g) => g && String(g.text ?? '').trim())
      .map((g) => ({ id: String(g.id ?? uid()), text: String(g.text).trim(), done: !!g.done }))
    : [];

  return {
    id: String(input.id ?? '') || uid(),
    name,
    day,
    month,
    year,
    group: String(input.group ?? '').trim() || 'Amis',
    emoji: String(input.emoji ?? '').trim(),
    notes: String(input.notes ?? ''),
    phone: String(input.phone ?? '').trim(),
    email: String(input.email ?? '').trim(),
    gifts,
    budget,
    reminders: Array.isArray(input.reminders)
      ? [...new Set((input.reminders as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b)
      : null,
    giftReminder: input.giftReminder === undefined ? true : !!input.giftReminder,
    giftBought: toRecord(input.giftBought),
    celebrated: toRecord(input.celebrated),
    createdAt: String(input.createdAt ?? '') || now.toISOString(),
  };
}

export function sortByUpcoming(people: Person[], today = new Date()): { person: Person; days: number }[] {
  return people
    .map((person) => ({ person, days: daysUntil(person, today) }))
    .sort((a, b) => a.days - b.days || a.person.name.localeCompare(b.person.name, 'fr'));
}

/** Année de la prochaine occurrence : c'est la clé utilisée pour « cadeau acheté » / « souhaité ». */
export function occurrenceYear(p: DayMonth, today = new Date()): string {
  return String(nextBirthday(p, today).getFullYear());
}

export function isGiftBought(p: Person, today = new Date()): boolean {
  return !!p.giftBought[occurrenceYear(p, today)];
}

// ---------- Messages de vœux ----------

const WISHES: Record<string, string[]> = {
  chaleureux: [
    'Joyeux anniversaire {prenom} ! 🎂 Je te souhaite une année pleine de bonheur, de rires et de belles surprises.',
    'Bon anniversaire {prenom} ! 🎉 Que cette nouvelle année t’apporte tout ce dont tu rêves.',
    'Happy birthday {prenom} ! Plein de bisous et une journée magnifique ☀️',
  ],
  drole: [
    'Joyeux anniversaire {prenom} ! 🎈 Ne compte pas les bougies, compte plutôt les parts de gâteau.',
    '{prenom}, tu n’as pas pris une année, tu as gagné un niveau ! 🕹️ Joyeux anniversaire !',
    'Bon anniversaire {prenom} ! Tu n’es pas vieux·vieille, tu es une édition collector. 😄',
  ],
  pro: [
    'Bon anniversaire {prenom} ! Je vous souhaite une excellente journée et une très belle année.',
    'Joyeux anniversaire {prenom}, au plaisir de continuer à travailler ensemble. Belle journée !',
  ],
  milestone: [
    '{age} ans, ça se fête ! 🥂 Joyeux anniversaire {prenom}, profite à fond de cette étape.',
    'Joyeux {age}e anniversaire {prenom} ! 🎊 Un cap mémorable pour une personne formidable.',
  ],
};

export const WISH_TONES: Record<string, string> = {
  chaleureux: 'Chaleureux', drole: 'Drôle', pro: 'Pro', milestone: 'Âge rond',
};

export function wishMessage(p: Person, tone = 'chaleureux', index = 0, today = new Date()): string {
  const list = WISHES[tone] ?? WISHES.chaleureux;
  const tpl = list[((index % list.length) + list.length) % list.length];
  const age = ageAtNext(p, today);
  return tpl.replaceAll('{prenom}', firstName(p)).replaceAll('{age}', age == null ? '' : String(age));
}

// ---------- Import ----------

/** Accepte JJ/MM, JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ, --MM-JJ (vCard). */
export function parseDateString(s: string): { day: number; month: number; year: number | null } | null {
  const t = s.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{4})-?(\d{2})-?(\d{2})$/))) return { year: +m[1], month: +m[2], day: +m[3] };
  if ((m = t.match(/^--(\d{2})-?(\d{2})$/))) return { year: null, month: +m[1], day: +m[2] };
  if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/))) {
    return { day: +m[1], month: +m[2], year: m[3] ? +m[3] : null };
  }
  return null;
}

/** CSV simple : nom;date(JJ/MM[/AAAA]);groupe;notes — séparateur ; ou , */
export function parseCSV(text: string): { people: Person[]; errors: string[] } {
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const people: Person[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const sep = row.includes(';') ? ';' : ',';
    const cols = row.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (i === 0 && /^(nom|name)$/i.test(cols[0])) return;
    const date = parseDateString(cols[1] ?? '');
    if (!date) {
      errors.push(`Ligne ${i + 1} : date illisible « ${cols[1] ?? ''} »`);
      return;
    }
    try {
      people.push(validatePerson({ name: cols[0], ...date, group: cols[2], notes: cols[3] }));
    } catch (e) {
      errors.push(`Ligne ${i + 1} : ${(e as Error).message}`);
    }
  });
  return { people, errors };
}

export function exportCSV(people: Person[]): string {
  const rows = [['nom', 'date', 'groupe', 'notes', 'telephone', 'email']];
  for (const p of people) {
    const date = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}${p.year ? `/${p.year}` : ''}`;
    rows.push([p.name, date, p.group, p.notes.replace(/[\n;]/g, ' '), p.phone, p.email]);
  }
  return `﻿${rows.map((r) => r.join(';')).join('\n')}`;
}

/** Fusionne des personnes importées en ignorant les doublons (même nom + même date). */
export function mergePeople(existing: Person[], incoming: Person[]) {
  const key = (p: Person) => `${p.name.toLowerCase()}|${p.day}|${p.month}`;
  const seen = new Set(existing.map(key));
  const added: Person[] = [];
  for (const p of incoming) {
    if (seen.has(key(p))) continue;
    seen.add(key(p));
    added.push(p);
  }
  return { people: [...existing, ...added], added: added.length, skipped: incoming.length - added.length };
}

// ---------- Statistiques ----------

export function stats(people: Person[], today = new Date()) {
  const byMonth: number[] = Array(12).fill(0);
  const byGroup: Record<string, number> = {};
  const bySign: Record<string, number> = {};
  const ages: { person: Person; age: number }[] = [];
  for (const p of people) {
    byMonth[p.month - 1]++;
    byGroup[p.group] = (byGroup[p.group] ?? 0) + 1;
    const z = zodiacSign(p.month, p.day);
    const k = `${z.emoji} ${z.name}`;
    bySign[k] = (bySign[k] ?? 0) + 1;
    const a = currentAge(p, today);
    if (a != null) ages.push({ person: p, age: a });
  }
  ages.sort((a, b) => a.age - b.age);
  const upcoming = sortByUpcoming(people, today);
  const next30 = upcoming.filter((u) => u.days <= 30);
  return {
    total: people.length,
    byMonth,
    byGroup,
    bySign,
    avgAge: ages.length ? ages.reduce((s, a) => s + a.age, 0) / ages.length : null,
    youngest: ages[0] ?? null,
    oldest: ages[ages.length - 1] ?? null,
    thisMonth: people.filter((p) => p.month === today.getMonth() + 1).length,
    milestones: upcoming.filter((u) => isMilestone(ageAtNext(u.person, today))),
    budgetNext30: next30.reduce((s, u) => s + (u.person.budget ?? 0), 0),
    giftsToBuy: next30.filter((u) => u.person.giftReminder && !isGiftBought(u.person, today)).length,
  };
}
