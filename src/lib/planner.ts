// Calcul pur des notifications à programmer (sans API native), testé dans tests/.
import {
  birthdayInYear, firstName, formatDayMonth, occurrenceYear, startOfDay, type Person,
} from './birthdays.ts';

export type Settings = {
  /** Rappels d'anniversaire par défaut : nombre de jours avant (0 = le jour J). */
  reminders: number[];
  /** Rappels « acheter un cadeau » : nombre de jours avant l'anniversaire. */
  giftReminders: number[];
  /** Heure d'envoi des notifications. */
  hour: number;
  minute: number;
  theme: 'auto' | 'light' | 'dark';
  /** Rappels cadeau reportés (« rappeler demain ») : date ISO d'envoi. */
  snoozes: { personId: string; at: string }[];
};

export const DEFAULT_SETTINGS: Settings = {
  reminders: [0, 1, 7],
  giftReminders: [14, 3],
  hour: 9,
  minute: 0,
  theme: 'auto',
  snoozes: [],
};

export type PlannedNotification = {
  /** Identifiant stable, utile pour le débogage et pour éviter les doublons. */
  id: string;
  date: Date;
  kind: 'birthday' | 'gift';
  personId: string;
  title: string;
  body: string;
};

/** Android garde jusqu'à 500 alarmes par app et iOS 64 notifications : on reste prudent. */
export const MAX_SCHEDULED = 60;

function giftIdeasText(p: Person): string {
  const ideas = p.gifts.filter((g) => !g.done).map((g) => g.text);
  if (!ideas.length) return 'Pas encore d’idée : ouvre l’app pour en noter.';
  const shown = ideas.slice(0, 3).join(', ');
  return `Idées : ${shown}${ideas.length > 3 ? '…' : ''}`;
}

function birthdayBody(p: Person, days: number, age: number | null): { title: string; body: string } {
  const ageStr = age ? ` (${age} ans)` : '';
  if (days === 0) {
    const what = age ? `ses ${age} ans` : 'son anniversaire';
    return { title: `🎂 C’est l’anniversaire de ${p.name} !`, body: `${firstName(p)} fête ${what} aujourd’hui. Envoie-lui un petit mot 💌` };
  }
  if (days === 1) return { title: `🎈 Demain : ${p.name}${ageStr}`, body: 'Pense à préparer un message ou un appel.' };
  return { title: `📅 Anniversaire de ${p.name} dans ${days} jours`, body: `Le ${formatDayMonth(p)}${ageStr}.` };
}


function giftBody(p: Person, days: number): { title: string; body: string } {
  const budget = p.budget ? ` · budget ${p.budget} €` : '';
  const when = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `dans ${days} jours`;
  return {
    title: `🎁 Cadeau pour ${firstName(p)} : anniversaire ${when}`,
    body: `${giftIdeasText(p)}${budget}`,
  };
}

/**
 * Liste des notifications à programmer, triées par date, limitées à `max`.
 * On couvre la prochaine occurrence et celle d'après (les rappels « 1 mois avant »
 * peuvent tomber avant la prochaine occurrence de l'année suivante).
 */
export function planNotifications(
  people: Person[],
  settings: Settings,
  now = new Date(),
  max = MAX_SCHEDULED,
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const today = startOfDay(now);
  const at = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), settings.hour, settings.minute);

  for (const p of people) {
    for (const year of [today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2]) {
      const bday = birthdayInYear(p, year);
      if (bday < today) continue;
      const age = p.year ? year - p.year : null;

      for (const off of p.reminders ?? settings.reminders) {
        const d = at(new Date(bday.getFullYear(), bday.getMonth(), bday.getDate() - off));
        if (d <= now) continue;
        out.push({ id: `b:${p.id}:${year}:${off}`, date: d, kind: 'birthday', personId: p.id, ...birthdayBody(p, off, age) });
      }

      if (p.giftReminder && !p.giftBought[String(year)]) {
        for (const off of settings.giftReminders) {
          const d = at(new Date(bday.getFullYear(), bday.getMonth(), bday.getDate() - off));
          if (d <= now) continue;
          out.push({ id: `g:${p.id}:${year}:${off}`, date: d, kind: 'gift', personId: p.id, ...giftBody(p, off) });
        }
      }
    }
  }

  // Rappels cadeau reportés (« rappeler demain »)
  for (const s of settings.snoozes) {
    const p = people.find((x) => x.id === s.personId);
    const d = new Date(s.at);
    if (!p || Number.isNaN(d.getTime()) || d <= now) continue;
    if (p.giftBought[occurrenceYear(p, now)]) continue;
    const days = Math.round((startOfDay(birthdayInYear(p, Number(occurrenceYear(p, now)))).getTime() - startOfDay(d).getTime()) / 86400000);
    out.push({ id: `s:${p.id}:${s.at}`, date: d, kind: 'gift', personId: p.id, ...giftBody(p, Math.max(0, days)) });
  }

  out.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
  return out.slice(0, max);
}

/** Retire les reports expirés. */
export function pruneSnoozes(settings: Settings, now = new Date()): Settings {
  return { ...settings, snoozes: settings.snoozes.filter((s) => new Date(s.at) > now) };
}
