// Spécificités du calendrier français : fêtes des prénoms, fêtes des mères / pères / grands-mères,
// noms des noces. Logique pure, testée.

import { addDays, startOfDay } from './birthdays.ts';

// ---------- Fêtes des prénoms (calendrier traditionnel des saints) ----------
// Format « JJ/MM ». Les variantes courantes pointent vers le même saint.
const NAME_DAYS: Record<string, string> = {
  // janvier
  genevieve: '03/01', odilon: '04/01', edouard: '05/01', melaine: '06/01', raymond: '07/01', lucien: '08/01',
  alix: '09/01', guillaume: '10/01', paulin: '11/01', tatiana: '12/01', yvette: '13/01', nina: '14/01', remi: '15/01',
  marcel: '16/01', roseline: '17/01', prisca: '18/01', marius: '19/01', sebastien: '20/01', fabien: '20/01',
  agnes: '21/01', vincent: '22/01', francois: '24/01', paule: '26/01', angele: '27/01', gildas: '29/01',
  martine: '30/01', marcelle: '31/01',
  // février
  ella: '01/02', blaise: '03/02', veronique: '04/02', agathe: '05/02', gaston: '06/02', eugenie: '07/02',
  jacqueline: '08/02', apolline: '09/02', arnaud: '10/02', beatrice: '13/02', valentin: '14/02', valentine: '14/02',
  claude: '15/02', julienne: '16/02', alexis: '17/02', bernadette: '18/02', gabin: '19/02', aimee: '20/02',
  isabelle: '22/02', lazare: '23/02', modeste: '24/02', romeo: '25/02', nestor: '26/02', honorine: '27/02', romain: '28/02',
  // mars
  aubin: '01/03', charles: '02/03', guenole: '03/03', casimir: '04/03', olive: '05/03', colette: '06/03',
  felicite: '07/03', francoise: '09/03', vivien: '10/03', rosine: '11/03', justine: '12/03', rodrigue: '13/03',
  mathilde: '14/03', louise: '15/03', benedicte: '16/03', patrice: '17/03', patrick: '17/03', cyrille: '18/03',
  joseph: '19/03', clemence: '21/03', lea: '22/03', victorien: '23/03', larissa: '26/03', gontran: '28/03',
  gwladys: '29/03', amedee: '30/03', benjamin: '31/03',
  // avril
  hugues: '01/04', hugo: '01/04', sandrine: '02/04', richard: '03/04', isidore: '04/04', irene: '05/04',
  marcellin: '06/04', julie: '08/04', gautier: '09/04', fulbert: '10/04', stanislas: '11/04', jules: '12/04',
  ida: '13/04', maxime: '14/04', paterne: '15/04', anicet: '17/04', parfait: '18/04', emma: '19/04', odette: '20/04',
  anselme: '21/04', alexandre: '22/04', alexandra: '22/04', georges: '23/04', fidele: '24/04', marc: '25/04',
  alida: '26/04', zita: '27/04', valerie: '28/04', catherine: '25/11', robert: '30/04',
  // mai
  boris: '02/05', zoe: '02/05', philippe: '03/05', jacques: '25/07', sylvain: '04/05', judith: '05/05',
  prudence: '06/05', gisele: '07/05', pacome: '09/05', solange: '10/05', estelle: '11/05', achille: '12/05',
  rolande: '13/05', matthias: '14/05', denise: '15/05', honore: '16/05', pascal: '17/05', pascale: '17/05',
  eric: '18/05', yves: '19/05', yvon: '19/05', bernardin: '20/05', constantin: '21/05', emile: '22/05',
  didier: '23/05', donatien: '24/05', sophie: '25/05', berenger: '26/05', augustin: '28/08', germain: '28/05',
  aymar: '29/05', ferdinand: '30/05', jeanne: '30/05', perrine: '31/05', petronille: '31/05',
  // juin
  justin: '01/06', blandine: '02/06', kevin: '03/06', clotilde: '04/06', igor: '05/06', norbert: '06/06',
  gilbert: '07/06', medard: '08/06', diane: '09/06', landry: '10/06', barnabe: '11/06', guy: '12/06',
  antoine: '13/06', elisee: '14/06', germaine: '15/06', herve: '17/06', leonce: '18/06', romuald: '19/06',
  silvere: '20/06', rodolphe: '21/06', alban: '22/06', audrey: '23/06', jean: '24/06', baptiste: '24/06',
  prosper: '25/06', anthelme: '26/06', fernand: '27/06', irenee: '28/06', pierre: '29/06', paul: '29/06', martial: '30/06',
  // juillet
  thierry: '01/07', martinien: '02/07', thomas: '03/07', florent: '04/07', mariette: '06/07', raoul: '07/07',
  thibaut: '08/07', thibault: '08/07', amandine: '09/07', ulrich: '10/07', benoit: '11/07', olivier: '12/07',
  henri: '13/07', joel: '13/07', camille: '14/07', donald: '15/07', charlotte: '17/07', frederic: '18/07',
  arsene: '19/07', marina: '20/07', victor: '21/07', madeleine: '22/07', brigitte: '23/07', christine: '24/07',
  anne: '26/07', anna: '26/07', annie: '26/07', anais: '26/07', joachim: '26/07', nathalie: '27/07', samson: '28/07',
  marthe: '29/07', juliette: '30/07', ignace: '31/07',
  // août
  alphonse: '01/08', julien: '02/08', lydie: '03/08', abel: '05/08', gaetan: '07/08', dominique: '08/08',
  amour: '09/08', laurent: '10/08', claire: '11/08', clara: '11/08', clarisse: '12/08', hippolyte: '13/08',
  evrard: '14/08', marie: '15/08', manon: '15/08', maryse: '15/08', armel: '16/08', hyacinthe: '17/08',
  helene: '18/08', bernard: '20/08', christophe: '21/08', fabrice: '22/08', rose: '23/08', barthelemy: '24/08',
  louis: '25/08', natacha: '26/08', monique: '27/08', sabine: '29/08', fiacre: '30/08', aristide: '31/08',
  // septembre
  gilles: '01/09', ingrid: '02/09', gregoire: '03/09', rosalie: '04/09', raissa: '05/09', bertrand: '06/09',
  reine: '07/09', adrien: '08/09', alain: '09/09', ines: '10/09', adelphe: '11/09', apollinaire: '12/09',
  aime: '13/09', roland: '15/09', edith: '16/09', renaud: '17/09', nadege: '18/09', emilie: '19/09',
  davy: '20/09', matthieu: '21/09', mathieu: '21/09', maurice: '22/09', constant: '23/09', thecle: '24/09',
  hermann: '25/09', come: '26/09', damien: '26/09', venceslas: '28/09', michel: '29/09', michele: '29/09',
  gabriel: '29/09', gabrielle: '29/09', raphael: '29/09', raphaelle: '29/09', jerome: '30/09',
  // octobre
  therese: '01/10', leger: '02/10', gerard: '03/10', fleur: '05/10', bruno: '06/10', serge: '07/10',
  pelagie: '08/10', denis: '09/10', ghislain: '10/10', firmin: '11/10', wilfried: '12/10', geraud: '13/10',
  juste: '14/10', edwige: '16/10', baudouin: '17/10', luc: '18/10', lucas: '18/10', rene: '19/10', renee: '19/10',
  adeline: '20/10', celine: '21/10', elodie: '22/10', florentin: '24/10', crepin: '25/10', dimitri: '26/10',
  emeline: '27/10', simon: '28/10', jude: '28/10', narcisse: '29/10', bienvenu: '30/10', quentin: '31/10',
  // novembre
  hubert: '03/11', sylvie: '05/11', bertille: '06/11', carine: '07/11', karine: '07/11', geoffroy: '08/11',
  theodore: '09/11', leon: '10/11', martin: '11/11', christian: '12/11', brice: '13/11', sidoine: '14/11',
  albert: '15/11', marguerite: '16/11', margaux: '16/11', margot: '16/11', elisabeth: '17/11', elise: '17/11',
  aude: '18/11', tanguy: '19/11', edmond: '20/11', cecile: '22/11', clement: '23/11', flora: '24/11',
  delphine: '26/11', severin: '27/11', saturnin: '29/11', andre: '30/11', andrea: '30/11',
  // décembre
  florence: '01/12', viviane: '02/12', xavier: '03/12', barbara: '04/12', gerald: '05/12', nicolas: '06/12',
  ambroise: '07/12', romaric: '10/12', daniel: '11/12', daniele: '11/12', lucie: '13/12', odile: '14/12',
  ninon: '15/12', alice: '16/12', gael: '17/12', gaelle: '17/12', gatien: '18/12', urbain: '19/12',
  theophile: '20/12', armand: '23/12', adele: '24/12', emmanuel: '25/12', emmanuelle: '25/12', noel: '25/12',
  etienne: '26/12', stephane: '26/12', stephanie: '26/12', david: '29/12', roger: '30/12', sylvestre: '31/12',
};

export function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

/** Date de fête pour un prénom (prend le premier prénom, puis la première partie d'un prénom composé). */
export function nameDayFor(fullName: string): { day: number; month: number } | null {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  const candidates = [first, first.split('-')[0]].map(normalizeName).filter(Boolean);
  for (const c of candidates) {
    const v = NAME_DAYS[c];
    if (v) {
      const [d, m] = v.split('/').map(Number);
      return { day: d, month: m };
    }
  }
  return null;
}

// ---------- Fêtes du calendrier ----------

/** Dimanche de Pâques (algorithme de Meeus / Gauss). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthSunday(year: number, month: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (7 - first.getDay()) % 7;
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7);
}

function lastSunday(year: number, month: number): Date {
  const last = new Date(year, month, 0);
  return addDays(last, -last.getDay());
}

/** Fête des mères en France : dernier dimanche de mai, décalée au 1er dimanche de juin si c'est la Pentecôte. */
export function mothersDay(year: number): Date {
  const d = lastSunday(year, 5);
  const pentecost = addDays(easterSunday(year), 49);
  return d.getTime() === pentecost.getTime() ? addDays(d, 7) : d;
}

export function fathersDay(year: number): Date {
  return nthSunday(year, 6, 3);
}

export function grandmothersDay(year: number): Date {
  return nthSunday(year, 3, 1);
}

export function grandfathersDay(year: number): Date {
  return nthSunday(year, 10, 1);
}

export type Holiday = {
  id: 'meres' | 'peres' | 'grands-meres' | 'grands-peres' | 'valentin';
  name: string;
  emoji: string;
  /** Relations concernées (voir RELATIONS). */
  relations: string[];
  date: (year: number) => Date;
};

export const HOLIDAYS: Holiday[] = [
  { id: 'grands-meres', name: 'Fête des grands-mères', emoji: '👵', relations: ['Grand-mère'], date: grandmothersDay },
  { id: 'valentin', name: 'Saint-Valentin', emoji: '❤️', relations: ['Conjoint·e'], date: (y) => new Date(y, 1, 14) },
  { id: 'meres', name: 'Fête des mères', emoji: '💐', relations: ['Maman'], date: mothersDay },
  { id: 'peres', name: 'Fête des pères', emoji: '👔', relations: ['Papa'], date: fathersDay },
  { id: 'grands-peres', name: 'Fête des grands-pères', emoji: '👴', relations: ['Grand-père'], date: grandfathersDay },
];

/** Prochaines fêtes du calendrier (aujourd'hui inclus), triées. */
export function upcomingHolidays(today = new Date()): { holiday: Holiday; date: Date }[] {
  const t = startOfDay(today);
  return HOLIDAYS.map((holiday) => {
    let date = holiday.date(t.getFullYear());
    if (date < t) date = holiday.date(t.getFullYear() + 1);
    return { holiday, date };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ---------- Noces ----------

const NOCES: Record<number, string> = {
  1: 'coton', 2: 'cuir', 3: 'froment', 4: 'cire', 5: 'bois', 6: 'chypre', 7: 'laine', 8: 'coquelicot', 9: 'faïence',
  10: 'étain', 11: 'corail', 12: 'soie', 13: 'muguet', 14: 'plomb', 15: 'cristal', 16: 'saphir', 17: 'rose',
  18: 'turquoise', 19: 'cretonne', 20: 'porcelaine', 21: 'opale', 22: 'bronze', 23: 'béryl', 24: 'satin', 25: 'argent',
  26: 'jade', 27: 'acajou', 28: 'nickel', 29: 'velours', 30: 'perle', 31: 'basane', 32: 'cuivre', 33: 'porphyre',
  34: 'ambre', 35: 'rubis', 36: 'mousseline', 37: 'papier', 38: 'mercure', 39: 'crêpe', 40: 'émeraude', 41: 'fer',
  42: 'nacre', 43: 'flanelle', 44: 'topaze', 45: 'vermeil', 46: 'lavande', 47: 'cachemire', 48: 'améthyste',
  49: 'cèdre', 50: 'or', 55: 'orchidée', 60: 'diamant', 65: 'palissandre', 70: 'platine', 75: 'albâtre', 80: 'chêne',
};

export function nocesName(years: number | null): string | null {
  if (!years) return null;
  const n = NOCES[years];
  return n ? `Noces ${/^[aeiouéèêh]/i.test(n) ? 'd’' : 'de '}${n}` : null;
}
