// Saisie rapide en langage naturel : « Julie Martin 12 mars 1990 », « Paul 03/07 famille ». Logique pure, testée.
import { MONTHS, type EventKind } from './birthdays.ts';

export type QuickAdd = {
  name: string;
  day: number | null;
  month: number | null;
  year: number | null;
  group: string | null;
  kind: EventKind;
};

const MONTH_ALIASES: Record<string, number> = {};
MONTHS.forEach((m, i) => {
  const plain = m.normalize('NFD').replace(/[̀-ͯ]/g, '');
  MONTH_ALIASES[plain] = i + 1;
  MONTH_ALIASES[plain.slice(0, 3)] = i + 1;
  MONTH_ALIASES[plain.slice(0, 4)] = i + 1;
});
Object.assign(MONTH_ALIASES, { juil: 7, juin: 6, sept: 9, fev: 2, dec: 12, janv: 1 });

const GROUPS: Record<string, string> = { famille: 'Famille', amis: 'Amis', ami: 'Amis', amie: 'Amis', travail: 'Travail', boulot: 'Travail', collegue: 'Travail' };
const KIND_WORDS: [RegExp, EventKind][] = [
  [/\bmariage\b/i, 'wedding'],
  [/\b(couple|rencontre|ensemble)\b/i, 'couple'],
  [/\b(deces|décès|souvenir|disparition)\b/i, 'memorial'],
];

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function parseQuickAdd(input: string): QuickAdd {
  let text = ` ${input.trim()} `;
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  let group: string | null = null;
  let kind: EventKind = 'birthday';

  for (const [re, k] of KIND_WORDS) {
    if (re.test(text)) {
      kind = k;
      text = text.replace(re, ' ');
    }
  }

  // 12/03/1990, 12-03, 12.03.90
  let m = text.match(/\s(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?=\s)/);
  if (m) {
    day = +m[1];
    month = +m[2];
    if (m[3]) year = m[3].length === 2 ? (+m[3] > 30 ? 1900 : 2000) + +m[3] : +m[3];
    text = text.replace(m[0], ' ');
  } else {
    // 12 mars 1990, 1er avril
    m = plain(text).match(/\s(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?(?=\s)/);
    if (m && MONTH_ALIASES[m[2]]) {
      day = +m[1];
      month = MONTH_ALIASES[m[2]];
      if (m[3]) year = +m[3];
      // retire le même passage du texte d'origine (même longueur une fois les accents retirés)
      const start = plain(text).indexOf(m[0]);
      text = text.slice(0, start) + ' ' + text.slice(start + m[0].length);
    }
  }
  if (!year) {
    const y = text.match(/\s(19\d{2}|20\d{2})(?=\s)/);
    if (y) {
      year = +y[1];
      text = text.replace(y[0], ' ');
    }
  }
  for (const word of text.split(/\s+/)) {
    const g = GROUPS[plain(word)];
    if (g) {
      group = g;
      text = text.replace(new RegExp(`\\s${word}(?=\\s)`), ' ');
      break;
    }
  }
  const name = text.replace(/\s+/g, ' ').trim().replace(/^[,;:-]+|[,;:-]+$/g, '').trim();
  return { name, day, month, year, group, kind };
}
