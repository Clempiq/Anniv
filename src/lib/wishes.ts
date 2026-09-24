// Messages de vœux : modèles par ton et par type d'événement. Logique pure, testée.
import { ageAtNext, daysBetween, firstName, lastOccurrence, type Person } from './birthdays.ts';
import { nocesName } from './calendarfr.ts';

export type Tone = 'chaleureux' | 'drole' | 'poetique' | 'court' | 'pro' | 'romantique' | 'enfant' | 'milestone' | 'retard';

export const TONES: Record<Tone, { label: string; emoji: string }> = {
  chaleureux: { label: 'Chaleureux', emoji: '🤗' },
  drole: { label: 'Drôle', emoji: '😂' },
  poetique: { label: 'Poétique', emoji: '🌸' },
  court: { label: 'Court', emoji: '⚡' },
  pro: { label: 'Pro', emoji: '💼' },
  romantique: { label: 'Romantique', emoji: '❤️' },
  enfant: { label: 'Enfant', emoji: '🧸' },
  milestone: { label: 'Âge rond', emoji: '⭐' },
  retard: { label: 'En retard', emoji: '🙈' },
};

const BIRTHDAY: Record<Tone, string[]> = {
  chaleureux: [
    'Joyeux anniversaire {p} ! 🎂 Je te souhaite une année pleine de bonheur, de rires et de belles surprises.',
    'Bon anniversaire {p} ! 🎉 Que cette nouvelle année t’apporte tout ce dont tu rêves, et même un peu plus.',
    'Happy birthday {p} ! Plein de bisous et une journée à ton image : lumineuse ☀️',
    '{p}, je te souhaite un merveilleux anniversaire, entouré·e des gens que tu aimes. Profite à fond ! 🥳',
    'Joyeux anniversaire {p} ! Merci d’être toi. Que cette année soit douce, drôle et remplie de projets qui te ressemblent 💛',
  ],
  drole: [
    'Joyeux anniversaire {p} ! 🎈 Ne compte pas les bougies, compte plutôt les parts de gâteau.',
    '{p}, tu n’as pas pris une année, tu as gagné un niveau ! 🕹️ Joyeux anniversaire !',
    'Bon anniversaire {p} ! Tu n’es pas vieux·vieille, tu es une édition collector 😄',
    'Joyeux anniversaire {p} ! Bonne nouvelle : tu n’as jamais été aussi jeune que tu le seras jamais plus… attends, non. Bon, joyeux anniversaire quand même 😅',
    '{p}, à ton âge on ne souffle plus les bougies, on appelle les pompiers 🚒 Joyeux anniversaire !',
    'Joyeux anniversaire {p} ! Comme le bon vin, tu te bonifies avec le temps 🍷 (et comme le fromage, tu as du caractère 🧀)',
  ],
  poetique: [
    'Une année de plus à collectionner les instants précieux. Joyeux anniversaire {p} 🌸',
    'Que chaque jour de cette nouvelle année te ressemble : doux, vrai et plein de lumière. Bon anniversaire {p} ✨',
    '{p}, que la vie continue de t’offrir des matins clairs et des soirées qui chantent. Joyeux anniversaire 🌙',
  ],
  court: [
    'Joyeux anniversaire {p} ! 🎂',
    'Bon anniv {p} ! 🥳 Gros bisous',
    'HBD {p} ! 🎉 Belle journée à toi',
  ],
  pro: [
    'Bon anniversaire {p} ! Je vous souhaite une excellente journée et une très belle année.',
    'Joyeux anniversaire {p}, au plaisir de continuer à travailler ensemble. Belle journée !',
    'Toute l’équipe se joint à moi pour vous souhaiter un très bel anniversaire, {p} 🎉',
  ],
  romantique: [
    'Joyeux anniversaire mon amour ❤️ Chaque année à tes côtés est un cadeau. Je t’aime.',
    '{p}, tu es mon plus beau hasard. Joyeux anniversaire, je t’aime plus que tout 💕',
    'Happy birthday à la personne qui rend ma vie plus belle chaque jour. Je t’aime {p} ❤️',
  ],
  enfant: [
    'Joyeux anniversaire {p} ! 🎈 {a} ans, c’est énorme ! Plein de bisous et de cadeaux 🎁',
    'Bon anniversaire {p} ! 🦖 J’espère que tu vas bien t’amuser et manger plein de gâteau 🍰',
    'Coucou {p} ! Joyeux anniversaire à la plus grande star de la journée 🌟',
  ],
  milestone: [
    '{a} ans, ça se fête ! 🥂 Joyeux anniversaire {p}, profite à fond de cette étape.',
    'Joyeux {a}e anniversaire {p} ! 🎊 Un cap mémorable pour une personne formidable.',
    '{a} ans {p} ! 🎉 Une nouvelle décennie qui s’ouvre, pleine de promesses. Joyeux anniversaire !',
  ],
  retard: [
    'Joyeux anniversaire (un peu en retard) {p} ! 🙈 Mieux vaut tard que jamais, je pense bien à toi.',
    '{p}, je suis en retard mais mes vœux sont intacts : joyeux anniversaire ! 🎂',
    'Oups, j’ai raté le jour J… mais pas l’intention ! Joyeux anniversaire {p} 🎈',
  ],
};

const WEDDING: string[] = [
  'Joyeux anniversaire de mariage {p} ! 💍 {a} ans{n}, quel bel exemple. Encore plein d’années de bonheur !',
  '{a} ans de mariage{n} 🥂 Félicitations {p}, que votre amour continue de grandir !',
  'Bravo {p} pour ces {a} belles années ensemble{n} 💕 Joyeux anniversaire de mariage !',
];
const WEDDING_NO_YEAR = [
  'Joyeux anniversaire de mariage {p} ! 💍 Plein d’amour et de bonheur pour les années à venir.',
];
const COUPLE: string[] = [
  'Joyeux anniversaire à nous ! 💞 {a} ans ensemble et toujours autant d’étoiles dans les yeux.',
  '{a} ans à tes côtés, et je signerais pour mille de plus ❤️',
];
const MEMORIAL: string[] = [
  'Je pense fort à toi aujourd’hui. {p} nous manque 🕯️',
  'Une pensée pour {p} en ce jour particulier. Je suis là si tu as besoin 🤍',
];
const OTHER: string[] = [
  'Joyeux {l} ! 🎉',
  'Belle journée pour fêter : {l} ✨',
];

/** Tons proposés selon le type d'événement. */
export function tonesFor(p: Person): Tone[] {
  if (p.kind !== 'birthday') return ['chaleureux'];
  return ['chaleureux', 'drole', 'poetique', 'court', 'romantique', 'enfant', 'pro', 'milestone', 'retard'];
}

/** Ton suggéré : retard si l'anniversaire vient de passer, âge rond, enfant, conjoint·e, collègue… */
export function suggestedTone(p: Person, today = new Date()): Tone {
  if (p.kind !== 'birthday') return 'chaleureux';
  const sinceLast = daysBetween(lastOccurrence(p, today), today);
  const year = String(lastOccurrence(p, today).getFullYear());
  if (sinceLast > 0 && sinceLast <= 10 && !p.celebrated[year]) return 'retard';
  const age = ageAtNext(p, today);
  if (age != null && (age === 18 || (age >= 20 && age % 10 === 0))) return 'milestone';
  if (age != null && age <= 12) return 'enfant';
  if (p.relation === 'Conjoint·e') return 'romantique';
  if (p.relation === 'Collègue' || p.group === 'Travail') return 'pro';
  return 'chaleureux';
}

export function wishMessage(p: Person, tone: Tone = 'chaleureux', index = 0, today = new Date()): string {
  const a = ageAtNext(p, today);
  let list: string[];
  if (p.kind === 'wedding') list = a ? WEDDING : WEDDING_NO_YEAR;
  else if (p.kind === 'couple') list = a ? COUPLE : ['Joyeux anniversaire à nous ! 💞'];
  else if (p.kind === 'memorial') list = MEMORIAL;
  else if (p.kind === 'other') list = OTHER;
  else {
    list = BIRTHDAY[tone] ?? BIRTHDAY.chaleureux;
    if ((tone === 'milestone' || tone === 'enfant') && a == null) list = BIRTHDAY.chaleureux;
  }
  const tpl = list[((index % list.length) + list.length) % list.length];
  const noces = p.kind === 'wedding' ? nocesName(a) : null;
  return tpl
    .replaceAll('{p}', firstName(p))
    .replaceAll('{a}', a == null ? '' : String(a))
    .replaceAll('{n}', noces ? ` (${noces.toLowerCase()})` : '')
    .replaceAll('{l}', (p.label || 'anniversaire').toLowerCase());
}

/** Nombre de variantes pour un ton (pour le bouton « autre »). */
export function wishCount(p: Person, tone: Tone): number {
  if (p.kind === 'wedding') return WEDDING.length;
  if (p.kind === 'couple') return COUPLE.length;
  if (p.kind === 'memorial') return MEMORIAL.length;
  if (p.kind === 'other') return OTHER.length;
  return (BIRTHDAY[tone] ?? BIRTHDAY.chaleureux).length;
}

/** Message de fête (saint du jour). */
export function nameDayMessage(p: Person): string {
  return `Bonne fête ${firstName(p)} ! 🌷 Belle journée à toi.`;
}
