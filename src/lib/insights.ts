// Tableau de bord : oublis récents, jalons en jours, série, badges, bilan de l'année. Logique pure, testée.
import {
  addDays, birthdayInYear, daysBetween, fmtInt, lastOccurrence, MONTHS, startOfDay, type Person,
} from './birthdays.ts';

export type Meta = {
  /** Messages envoyés depuis l'app (SMS, WhatsApp, partage…). */
  messagesSent: number;
  /** Cartes de vœux partagées. */
  cardsShared: number;
};

export const DEFAULT_META: Meta = { messagesSent: 0, cardsShared: 0 };

/** Anniversaires passés depuis moins de `window` jours et pas encore souhaités (hors souvenirs). */
export function recentMissed(people: Person[], today = new Date(), window = 7): { person: Person; daysAgo: number; year: string }[] {
  const out: { person: Person; daysAgo: number; year: string }[] = [];
  for (const p of people) {
    if (p.kind === 'memorial') continue;
    const last = lastOccurrence(p, today);
    const daysAgo = daysBetween(last, today);
    const year = String(last.getFullYear());
    if (daysAgo >= 1 && daysAgo <= window && !p.celebrated[year]) out.push({ person: p, daysAgo, year });
  }
  return out.sort((a, b) => a.daysAgo - b.daysAgo);
}

const DAY_MILESTONES = [1000, 5000, 10000, 15000, 20000, 25000, 30000];

export type DayMilestone = { person: Person; date: Date; label: string; days: number };

/** Jalons insolites à venir : 10 000e jour, milliard de secondes… (uniquement avec l'année de naissance). */
export function upcomingDayMilestones(people: Person[], today = new Date(), horizon = 365): DayMilestone[] {
  const t = startOfDay(today);
  const out: DayMilestone[] = [];
  for (const p of people) {
    if (!p.year || p.kind !== 'birthday') continue;
    const birth = new Date(p.year, p.month - 1, p.day);
    for (const n of DAY_MILESTONES) {
      const date = addDays(birth, n);
      const days = daysBetween(t, date);
      if (days >= 0 && days <= horizon) out.push({ person: p, date, days, label: `${fmtInt(n)}e jour` });
    }
    // 1 milliard de secondes ≈ 11 574 jours
    const billion = addDays(birth, 11574);
    const bd = daysBetween(t, billion);
    if (bd >= 0 && bd <= horizon) out.push({ person: p, date: billion, days: bd, label: '1 milliard de secondes' });
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Occurrences passées (365 derniers jours), de la plus récente à la plus ancienne. */
export function pastOccurrences(people: Person[], today = new Date()): { person: Person; date: Date; year: string; wished: boolean }[] {
  const t = startOfDay(today);
  const out: { person: Person; date: Date; year: string; wished: boolean }[] = [];
  for (const p of people) {
    if (p.kind === 'memorial') continue;
    const created = startOfDay(new Date(p.createdAt));
    for (const y of [t.getFullYear(), t.getFullYear() - 1]) {
      const d = birthdayInYear(p, y);
      if (d > t || daysBetween(d, t) > 365 || d < created) continue;
      out.push({ person: p, date: d, year: String(y), wished: !!p.celebrated[String(y)] });
    }
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Série d'anniversaires souhaités d'affilée (les plus récents d'abord ; aujourd'hui non souhaité ne casse pas la série). */
export function wishStreak(people: Person[], today = new Date()): number {
  let n = 0;
  for (const o of pastOccurrences(people, today)) {
    if (o.wished) n++;
    else if (daysBetween(o.date, today) === 0) continue;
    else break;
  }
  return n;
}

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  progress: number; // 0..1
  unlocked: boolean;
};

function badge(id: string, emoji: string, title: string, description: string, value: number, goal: number): Badge {
  return { id, emoji, title, description, progress: Math.min(1, value / goal), unlocked: value >= goal };
}

export function achievements(people: Person[], meta: Meta, today = new Date()): Badge[] {
  const wished = people.reduce((s, p) => s + Object.keys(p.celebrated).length, 0);
  const gifts = people.reduce((s, p) => s + p.gifts.filter((g) => g.status !== 'idea').length, 0);
  const early = people.reduce((s, p) => s + Object.entries(p.giftBought).filter(([y, iso]) => {
    const d = birthdayInYear(p, Number(y));
    return daysBetween(new Date(iso), d) >= 7;
  }).length, 0);
  const withPhoto = people.filter((p) => p.photo).length;
  const streak = wishStreak(people, today);
  const ideas = people.reduce((s, p) => s + p.gifts.length, 0);
  return [
    badge('first', '🌱', 'Premier pas', 'Ajouter un premier anniversaire', people.length, 1),
    badge('ten', '📒', 'Carnet bien rempli', 'Suivre 10 anniversaires', people.length, 10),
    badge('fifty', '🏛️', 'Mémoire d’éléphant', 'Suivre 50 anniversaires', people.length, 50),
    badge('wish5', '💌', 'Toujours là', 'Souhaiter 5 anniversaires', wished, 5),
    badge('wish25', '🏆', 'Ami·e en or', 'Souhaiter 25 anniversaires', wished, 25),
    badge('streak5', '🔥', 'En feu', '5 anniversaires souhaités d’affilée', streak, 5),
    badge('gift5', '🎁', 'Lutin', 'Préparer 5 cadeaux', gifts, 5),
    badge('gift20', '🎅', 'Père Noël', 'Préparer 20 cadeaux', gifts, 20),
    badge('early', '⏰', 'Jamais pris de court', 'Acheter 3 cadeaux au moins une semaine avant', early, 3),
    badge('ideas', '💡', 'Boîte à idées', 'Noter 15 idées de cadeaux', ideas, 15),
    badge('poet', '✍️', 'Plume d’or', 'Envoyer 10 messages depuis l’app', meta.messagesSent, 10),
    badge('artist', '🎨', 'Artiste', 'Partager 3 cartes de vœux', meta.cardsShared, 3),
    badge('photo', '📸', 'Trombinoscope', 'Ajouter 5 photos', withPhoto, 5),
  ];
}

export type YearReview = {
  year: number;
  wished: number;
  total: number;
  onTime: number;
  giftsPrepared: number;
  spent: number;
  added: number;
  busiestMonth: string | null;
};

/** Bilan d'une année civile. */
export function yearReview(people: Person[], year: number, today = new Date()): YearReview {
  const t = startOfDay(today);
  let wished = 0;
  let total = 0;
  let onTime = 0;
  let giftsPrepared = 0;
  let spent = 0;
  const months = Array(12).fill(0);
  for (const p of people) {
    if (p.kind === 'memorial') continue;
    const d = birthdayInYear(p, year);
    if (d <= t && d >= startOfDay(new Date(p.createdAt))) {
      total++;
      months[d.getMonth()]++;
      const w = p.celebrated[String(year)];
      if (w) {
        wished++;
        if (daysBetween(d, new Date(w)) <= 0) onTime++;
      }
    }
    for (const g of p.gifts) {
      if (g.year === year && g.status !== 'idea') {
        giftsPrepared++;
        spent += g.price ?? 0;
      }
    }
  }
  const added = people.filter((p) => new Date(p.createdAt).getFullYear() === year).length;
  const max = Math.max(...months);
  return {
    year, wished, total, onTime, giftsPrepared, spent, added,
    busiestMonth: max > 0 ? MONTHS[months.indexOf(max)] : null,
  };
}
