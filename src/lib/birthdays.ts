// Logique métier pure (sans React ni API native) : modèle, dates, âges, signes, import/export.
// Testée avec `node --test` (voir tests/). Garder les imports relatifs avec l'extension `.ts`.

export type EventKind = 'birthday' | 'wedding' | 'couple' | 'memorial' | 'other';
export type GiftStatus = 'idea' | 'bought' | 'wrapped' | 'given';

export type GiftIdea = {
  id: string;
  text: string;
  status: GiftStatus;
  price: number | null;
  url: string;
  /** Année de l'occurrence pour laquelle le cadeau a été acheté / offert. */
  year: number | null;
};

export type Person = {
  id: string;
  /** Nom affiché (« Julie Martin », « Paul & Léa »…). */
  name: string;
  kind: EventKind;
  /** Libellé libre pour le type « other » (« Adoption de Filou »). */
  label: string;
  day: number;
  month: number; // 1-12
  year: number | null;
  group: string;
  /** Lien avec moi : maman, frère, meilleure amie, collègue… */
  relation: string;
  emoji: string;
  /** Photo (URI locale dans le dossier de l'app). */
  photo: string;
  favorite: boolean;
  notes: string;
  phone: string;
  email: string;
  interests: string[];
  /** Date de fête (saint du jour), ou null. */
  nameDay: { day: number; month: number } | null;
  gifts: GiftIdea[];
  budget: number | null;
  reminders: number[] | null;
  giftReminder: boolean;
  giftBought: Record<string, string>;
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

export const KINDS: Record<EventKind, { label: string; emoji: string; short: string }> = {
  birthday: { label: 'Anniversaire', emoji: '🎂', short: 'Anniv' },
  wedding: { label: 'Anniversaire de mariage', emoji: '💍', short: 'Mariage' },
  couple: { label: 'Anniversaire de couple', emoji: '💞', short: 'Couple' },
  memorial: { label: 'Souvenir', emoji: '🕯️', short: 'Souvenir' },
  other: { label: 'Autre événement', emoji: '⭐', short: 'Événement' },
};

export const RELATIONS = [
  'Maman', 'Papa', 'Sœur', 'Frère', 'Fille', 'Fils', 'Grand-mère', 'Grand-père', 'Tante', 'Oncle',
  'Cousin·e', 'Neveu', 'Nièce', 'Conjoint·e', 'Meilleur·e ami·e', 'Ami·e', 'Collègue', 'Voisin·e', 'Filleul·e', 'Parrain / marraine',
];

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

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

type DayMonth = { day: number; month: number };
type WithYear = DayMonth & { year: number | null };

/** Date de l'événement pour une année (29 février → 28 février les années non bissextiles). */
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

/** Dernière occurrence passée ou aujourd'hui. */
export function lastOccurrence(p: DayMonth, today = new Date()): Date {
  const t = startOfDay(today);
  const d = birthdayInYear(p, t.getFullYear());
  return d > t ? birthdayInYear(p, t.getFullYear() - 1) : d;
}

export function daysBetween(a: Date, b: Date): number {
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

/** « Âge » atteint à la prochaine occurrence (années de mariage, de couple…). */
export function ageAtNext(p: WithYear, today = new Date()): number | null {
  if (!p.year) return null;
  const n = nextBirthday(p, today).getFullYear() - p.year;
  return n > 0 ? n : null;
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

/** Pierre de naissance traditionnelle par mois. */
const BIRTHSTONES = ['Grenat', 'Améthyste', 'Aigue-marine', 'Diamant', 'Émeraude', 'Perle', 'Rubis', 'Péridot', 'Saphir', 'Opale', 'Topaze', 'Turquoise'];
const FLOWERS = ['Perce-neige', 'Violette', 'Jonquille', 'Marguerite', 'Muguet', 'Rose', 'Pied-d’alouette', 'Glaïeul', 'Aster', 'Souci', 'Chrysanthème', 'Houx'];
export function birthstone(month: number): string {
  return BIRTHSTONES[month - 1];
}
export function birthFlower(month: number): string {
  return FLOWERS[month - 1];
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
  return `${p.day === 1 ? '1er' : p.day} ${MONTHS[p.month - 1]}`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function formatDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Nombre avec espaces de milliers (sans dépendre d'Intl, incomplet sur certains moteurs). */
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** « 24 septembre 2026 » (sans dépendre d'Intl). */
export function formatLongDate(d: Date, withWeekday = false): string {
  return `${withWeekday ? `${WEEKDAYS[d.getDay()]} ` : ''}${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCountdown(days: number): string {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days === 2) return 'Après-demain';
  if (days < 7) return `Dans ${days} jours`;
  if (days < 14) return 'Dans 1 semaine';
  if (days < 31) return `Dans ${Math.floor(days / 7)} semaines`;
  const months = Math.round(days / 30.4);
  return months <= 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
}

export function firstName(p: { name: string }): string {
  const n = p.name.trim();
  if (/[&+]| et /i.test(n)) return n;
  return n.split(/\s+/)[0] ?? n;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Ce que l'on « fête » à la prochaine occurrence, en toutes lettres. */
export function occasionLabel(p: Person, today = new Date()): string {
  const n = ageAtNext(p, today);
  switch (p.kind) {
    case 'wedding':
      return n ? `${n} an${n > 1 ? 's' : ''} de mariage` : 'Anniversaire de mariage';
    case 'couple':
      return n ? `${n} an${n > 1 ? 's' : ''} ensemble` : 'Anniversaire de couple';
    case 'memorial':
      return n ? `Il y a ${n} an${n > 1 ? 's' : ''}` : 'Souvenir';
    case 'other':
      return p.label || 'Événement';
    default:
      return n ? `${n} an${n > 1 ? 's' : ''}` : 'Anniversaire';
  }
}

/** Petite phrase pour la liste : « aura 30 ans », « 12 ans de mariage »… */
export function occasionPhrase(p: Person, today = new Date()): string | null {
  const n = ageAtNext(p, today);
  const isToday = daysUntil(p, today) === 0;
  if (p.kind === 'birthday') return n ? `${isToday ? 'fête ses' : 'aura'} ${n} ans` : null;
  return occasionLabel(p, today);
}

// ---------- Validation ----------

function toRecord(v: unknown): Record<string, string> {
  return v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, string>) } : {};
}

function toNumberOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const GIFT_STATUSES: GiftStatus[] = ['idea', 'bought', 'wrapped', 'given'];

export function normalizeGift(g: Record<string, unknown>): GiftIdea {
  // Compatibilité v1 : { done: true } = idée déjà offerte
  const status = GIFT_STATUSES.includes(g.status as GiftStatus) ? (g.status as GiftStatus) : g.done ? 'given' : 'idea';
  const price = toNumberOrNull(g.price);
  return {
    id: String(g.id ?? '') || uid(),
    text: String(g.text ?? '').trim(),
    status,
    price: price != null && price >= 0 ? price : null,
    url: String(g.url ?? '').trim(),
    year: g.year == null || g.year === '' ? null : Number(g.year) || null,
  };
}

const KIND_LIST: EventKind[] = ['birthday', 'wedding', 'couple', 'memorial', 'other'];

/** Valide et normalise une fiche. Lève une erreur (en français) si invalide. */
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

  const kind = KIND_LIST.includes(input.kind as EventKind) ? (input.kind as EventKind) : 'birthday';
  const nd = input.nameDay as { day?: unknown; month?: unknown } | null | undefined;
  const nameDay = nd && Number.isInteger(Number(nd.day)) && Number.isInteger(Number(nd.month))
    && Number(nd.month) >= 1 && Number(nd.month) <= 12 && Number(nd.day) >= 1 && Number(nd.day) <= daysInMonth(Number(nd.month))
    ? { day: Number(nd.day), month: Number(nd.month) } : null;

  const gifts = Array.isArray(input.gifts)
    ? (input.gifts as Record<string, unknown>[]).filter((g) => g && String(g.text ?? '').trim()).map(normalizeGift)
    : [];

  return {
    id: String(input.id ?? '') || uid(),
    name,
    kind,
    label: String(input.label ?? '').trim(),
    day,
    month,
    year,
    group: String(input.group ?? '').trim() || (kind === 'birthday' ? 'Amis' : 'Famille'),
    relation: String(input.relation ?? '').trim(),
    emoji: String(input.emoji ?? '').trim(),
    photo: String(input.photo ?? '').trim(),
    favorite: !!input.favorite,
    notes: String(input.notes ?? ''),
    phone: String(input.phone ?? '').trim(),
    email: String(input.email ?? '').trim(),
    interests: Array.isArray(input.interests) ? [...new Set((input.interests as unknown[]).map(String).filter(Boolean))] : [],
    nameDay,
    gifts,
    budget,
    reminders: Array.isArray(input.reminders)
      ? [...new Set((input.reminders as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b)
      : null,
    giftReminder: input.giftReminder === undefined ? kind !== 'memorial' : !!input.giftReminder && kind !== 'memorial',
    giftBought: toRecord(input.giftBought),
    celebrated: toRecord(input.celebrated),
    createdAt: String(input.createdAt ?? '') || now.toISOString(),
  };
}

export function sortByUpcoming(people: Person[], today = new Date()): { person: Person; days: number }[] {
  return people
    .map((person) => ({ person, days: daysUntil(person, today) }))
    .sort((a, b) => a.days - b.days || Number(b.person.favorite) - Number(a.person.favorite) || a.person.name.localeCompare(b.person.name, 'fr'));
}

/** Année de la prochaine occurrence : clé utilisée pour « cadeau acheté » / « souhaité ». */
export function occurrenceYear(p: DayMonth, today = new Date()): string {
  return String(nextBirthday(p, today).getFullYear());
}

export function isGiftBought(p: Person, today = new Date()): boolean {
  return !!p.giftBought[occurrenceYear(p, today)];
}

/** Idées encore à offrir (ni achetées, ni offertes). */
export function pendingIdeas(p: Person): GiftIdea[] {
  return p.gifts.filter((g) => g.status === 'idea');
}

/** Cadeaux déjà offerts, du plus récent au plus ancien : utile pour ne pas offrir deux fois la même chose. */
export function giftHistory(p: Person): GiftIdea[] {
  return p.gifts.filter((g) => g.status === 'given').sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

// ---------- Import / export ----------

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
  const rows = text.replace(/^\ufeff/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
      people.push(validatePerson({ name: cols[0], ...date, group: cols[2], notes: cols[3], phone: cols[4], email: cols[5] }));
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
  return `\ufeff${rows.map((r) => r.join(';')).join('\n')}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Export iCalendar : événements annuels, importables dans n'importe quel agenda. */
export function toICS(people: Person[], now = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T000000Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Anniv//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Anniv'];
  for (const p of people) {
    const y = p.month === 2 && p.day === 29 ? 2024 : now.getFullYear() - 1;
    const end = new Date(y, p.month - 1, p.day + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${p.id}@anniv`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${y}${pad(p.month)}${pad(p.day)}`,
      `DTEND;VALUE=DATE:${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`,
      p.month === 2 && p.day === 29 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEscape(`${KINDS[p.kind].emoji} ${p.kind === 'other' && p.label ? p.label : p.name}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Fusionne des fiches importées en ignorant les doublons (même nom + même date). */
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
  const births = people.filter((p) => p.kind === 'birthday');
  for (const p of people) {
    byMonth[p.month - 1]++;
    byGroup[p.group] = (byGroup[p.group] ?? 0) + 1;
  }
  for (const p of births) {
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
    milestones: upcoming.filter((u) => u.person.kind !== 'memorial' && isMilestone(ageAtNext(u.person, today))),
    budgetNext30: next30.reduce((s, u) => s + (u.person.budget ?? 0), 0),
    giftsToBuy: next30.filter((u) => u.person.giftReminder && !isGiftBought(u.person, today)).length,
  };
}
