// Calcul pur des notifications à programmer (sans API native), testé dans tests/.
import {
  addDays, birthdayInYear, firstName, formatDayMonth, KINDS, occurrenceYear, pendingIdeas,
  startOfDay, WEEKDAYS, type Person,
} from './birthdays.ts';
import { HOLIDAYS, nocesName } from './calendarfr.ts';
import { upcomingDayMilestones } from './insights.ts';

export type AccentName = 'corail' | 'ocean' | 'foret' | 'lavande' | 'soleil';

export type Settings = {
  /** Rappels par défaut : nombre de jours avant (0 = le jour J). */
  reminders: number[];
  /** Rappels « acheter un cadeau » : nombre de jours avant. */
  giftReminders: number[];
  hour: number;
  minute: number;
  theme: 'auto' | 'light' | 'dark';
  accent: AccentName;
  /** Rappels reportés (« rappeler demain ») : date ISO d'envoi. */
  snoozes: { personId: string; at: string }[];
  userName: string;
  userBirthday: { day: number; month: number; year: number | null } | null;
  onboarded: boolean;
  /** Relance à 20 h le jour J si l'anniversaire n'a pas été marqué comme souhaité. */
  eveningNudge: boolean;
  /** Récap le dimanche à 18 h de la semaine à venir. */
  weekly: boolean;
  nameDays: boolean;
  holidays: boolean;
  dayMilestones: boolean;
  lock: boolean;
  calendarSync: boolean;
  autoBackup: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  reminders: [0, 1, 7],
  giftReminders: [14, 3],
  hour: 9,
  minute: 0,
  theme: 'auto',
  accent: 'corail',
  snoozes: [],
  userName: '',
  userBirthday: null,
  onboarded: false,
  eveningNudge: true,
  weekly: true,
  nameDays: true,
  holidays: true,
  dayMilestones: true,
  lock: false,
  calendarSync: false,
  autoBackup: true,
};

export type NotificationKind = 'birthday' | 'gift' | 'nudge' | 'nameday' | 'holiday' | 'milestone' | 'weekly' | 'self';

export type PlannedNotification = {
  /** Identifiant stable (utile pour le débogage et pour éviter les doublons). */
  id: string;
  date: Date;
  kind: NotificationKind;
  personId: string;
  title: string;
  body: string;
};

export const MAX_SCHEDULED = 60;

function giftIdeasText(p: Person): string {
  const ideas = pendingIdeas(p).map((g) => g.text);
  if (!ideas.length) return 'Pas encore d’idée : ouvre Anniv, il y a des suggestions pour toi.';
  return `Idées : ${ideas.slice(0, 3).join(', ')}${ideas.length > 3 ? '…' : ''}`;
}

function birthdayText(p: Person, days: number, year: number): { title: string; body: string } {
  const age = p.year ? year - p.year : null;
  const when = days === 1 ? 'Demain' : `Dans ${days} jours`;
  if (p.kind === 'memorial') {
    return days === 0
      ? { title: `🕯️ En souvenir de ${p.name}`, body: age ? `Il y a ${age} an${age > 1 ? 's' : ''} aujourd’hui.` : 'Une pensée aujourd’hui.' }
      : { title: `🕯️ ${when} : souvenir de ${p.name}`, body: `Le ${formatDayMonth(p)}.` };
  }
  if (p.kind === 'wedding' || p.kind === 'couple' || p.kind === 'other') {
    const years = age && age > 0 ? `${age} an${age > 1 ? 's' : ''}` : null;
    const label = p.kind === 'wedding'
      ? years ? `${years} de mariage${nocesName(age) ? ` · ${nocesName(age)}` : ''}` : 'Anniversaire de mariage'
      : p.kind === 'couple' ? years ? `${years} ensemble` : 'Anniversaire de couple'
        : p.label || 'Événement';
    const emoji = KINDS[p.kind].emoji;
    return days === 0
      ? { title: `${emoji} C’est aujourd’hui : ${p.name}`, body: `${label}. Un petit mot leur fera plaisir 💌` }
      : { title: `${emoji} ${when} : ${p.name}`, body: `${label}, le ${formatDayMonth(p)}.` };
  }
  const ageStr = age && age > 0 ? ` (${age} ans)` : '';
  if (days === 0) {
    const what = age && age > 0 ? `ses ${age} ans` : 'son anniversaire';
    return { title: `🎂 C’est l’anniversaire de ${p.name} !`, body: `${firstName(p)} fête ${what} aujourd’hui. Envoie-lui un petit mot 💌` };
  }
  if (days === 1) return { title: `🎈 Demain : ${p.name}${ageStr}`, body: 'Pense à préparer un message ou un appel.' };
  return { title: `📅 Anniversaire de ${p.name} dans ${days} jours`, body: `Le ${formatDayMonth(p)}${ageStr}.` };
}

function giftText(p: Person, days: number): { title: string; body: string } {
  const budget = p.budget ? ` · budget ${p.budget} €` : '';
  const when = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `dans ${days} jours`;
  return { title: `🎁 Cadeau pour ${firstName(p)} : c’est ${when}`, body: `${giftIdeasText(p)}${budget}` };
}

/**
 * Liste des notifications à programmer, triées par date, limitées à `max`.
 * Couvre les deux prochaines occurrences de chaque événement.
 */
export function planNotifications(
  people: Person[],
  settings: Settings,
  now = new Date(),
  max = MAX_SCHEDULED,
): PlannedNotification[] {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const out: PlannedNotification[] = [];
  const today = startOfDay(now);
  const at = (d: Date, h = s.hour, m = s.minute) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  const push = (n: PlannedNotification) => {
    if (n.date > now) out.push(n);
  };

  for (const p of people) {
    for (const year of [today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2]) {
      const bday = birthdayInYear(p, year);
      if (bday < today) continue;

      for (const off of p.reminders ?? s.reminders) {
        push({ id: `b:${p.id}:${year}:${off}`, date: at(addDays(bday, -off)), kind: 'birthday', personId: p.id, ...birthdayText(p, off, year) });
      }
      if (p.giftReminder && p.kind !== 'memorial' && !p.giftBought[String(year)]) {
        for (const off of s.giftReminders) {
          push({ id: `g:${p.id}:${year}:${off}`, date: at(addDays(bday, -off)), kind: 'gift', personId: p.id, ...giftText(p, off) });
        }
      }
      if (s.eveningNudge && p.kind !== 'memorial' && !p.celebrated[String(year)]) {
        push({
          id: `n:${p.id}:${year}`,
          date: at(bday, 20, 0),
          kind: 'nudge',
          personId: p.id,
          title: `💬 Tu as pensé à ${firstName(p)} ?`,
          body: 'Il reste quelques heures pour souhaiter. Un message suffit, je te prépare le texte.',
        });
      }
    }

    if (s.nameDays && p.nameDay && p.kind === 'birthday') {
      for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
        const d = birthdayInYear(p.nameDay, year);
        if (d < today) continue;
        // Pas de doublon si la fête tombe le jour de l'anniversaire
        if (d.getTime() === birthdayInYear(p, year).getTime()) continue;
        push({ id: `f:${p.id}:${year}`, date: at(d), kind: 'nameday', personId: p.id, title: `🌷 C’est la fête de ${firstName(p)} !`, body: `Un petit « Bonne fête » fait toujours plaisir.` });
      }
    }
  }

  if (s.holidays) {
    for (const h of HOLIDAYS) {
      const concerned = people.filter((p) => p.kind === 'birthday' && h.relations.includes(p.relation));
      if (!concerned.length) continue;
      const names = concerned.map((p) => firstName(p)).join(', ');
      for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
        const d = h.date(year);
        if (d < today) continue;
        push({ id: `h:${h.id}:${year}:3`, date: at(addDays(d, -3)), kind: 'holiday', personId: concerned[0].id, title: `${h.emoji} ${h.name} dans 3 jours`, body: `Pense à ${names}. C’est ${WEEKDAYS[d.getDay()]} !` });
        push({ id: `h:${h.id}:${year}:0`, date: at(d), kind: 'holiday', personId: concerned[0].id, title: `${h.emoji} C’est la ${h.name.toLowerCase()} !`, body: `Un message pour ${names} ?` });
      }
    }
  }

  if (s.dayMilestones) {
    for (const m of upcomingDayMilestones(people, today, 400)) {
      push({ id: `m:${m.person.id}:${m.label}`, date: at(m.date), kind: 'milestone', personId: m.person.id, title: `✨ ${firstName(m.person)} fête son ${m.label} !`, body: 'Un jalon rare, l’occasion parfaite pour un message original.' });
    }
  }

  if (s.userBirthday) {
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      const d = birthdayInYear(s.userBirthday, year);
      if (d < today) continue;
      const hello = s.userName ? `, ${s.userName}` : '';
      push({ id: `u:${year}`, date: at(d, 8, 0), kind: 'self', personId: '', title: `🎉 Joyeux anniversaire${hello} !`, body: 'Aujourd’hui, c’est toi la star. Toute l’équipe d’Anniv te souhaite une journée merveilleuse 🥳' });
    }
  }

  if (s.weekly) {
    // Prochains dimanches à 18 h, seulement s'il se passe quelque chose la semaine suivante
    const firstSunday = addDays(today, (7 - today.getDay()) % 7);
    for (let w = 0; w < 8; w++) {
      const sunday = addDays(firstSunday, w * 7);
      const items = people
        .filter((p) => p.kind !== 'memorial')
        .map((p) => {
          for (const y of [sunday.getFullYear(), sunday.getFullYear() + 1]) {
            const d = birthdayInYear(p, y);
            const diff = Math.round((d.getTime() - sunday.getTime()) / 86400000);
            if (diff >= 1 && diff <= 7) return { p, d };
          }
          return null;
        })
        .filter((x): x is { p: Person; d: Date } => !!x)
        .sort((a, b) => a.d.getTime() - b.d.getTime());
      if (!items.length) continue;
      const list = items.slice(0, 4).map(({ p, d }) => `${firstName(p)} (${WEEKDAYS[d.getDay()].slice(0, 3)}.)`).join(', ');
      push({
        id: `w:${sunday.toISOString().slice(0, 10)}`,
        date: at(sunday, 18, 0),
        kind: 'weekly',
        personId: '',
        title: `🗓️ Ta semaine : ${items.length} événement${items.length > 1 ? 's' : ''}`,
        body: `${list}${items.length > 4 ? '…' : ''}`,
      });
    }
  }

  // Rappels cadeau reportés
  for (const sn of s.snoozes) {
    const p = people.find((x) => x.id === sn.personId);
    const d = new Date(sn.at);
    if (!p || Number.isNaN(d.getTime())) continue;
    if (p.giftBought[occurrenceYear(p, now)]) continue;
    const days = Math.round((birthdayInYear(p, Number(occurrenceYear(p, now))).getTime() - startOfDay(d).getTime()) / 86400000);
    push({ id: `s:${p.id}:${sn.at}`, date: d, kind: 'gift', personId: p.id, ...giftText(p, Math.max(0, days)) });
  }

  out.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
  return out.slice(0, max);
}

/** Retire les reports expirés. */
export function pruneSnoozes(settings: Settings, now = new Date()): Settings {
  return { ...settings, snoozes: settings.snoozes.filter((x) => new Date(x.at) > now) };
}
