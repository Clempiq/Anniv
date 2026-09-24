// Idées de cadeaux hors ligne, selon les centres d'intérêt, l'âge et le budget. Logique pure, testée.
import { ageAtNext, currentAge, type Person } from './birthdays.ts';

export type Interest = {
  id: string;
  label: string;
  emoji: string;
};

export const INTERESTS: Interest[] = [
  { id: 'cuisine', label: 'Cuisine', emoji: '🍳' },
  { id: 'lecture', label: 'Lecture', emoji: '📚' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'rando', label: 'Rando & nature', emoji: '🥾' },
  { id: 'musique', label: 'Musique', emoji: '🎸' },
  { id: 'jeux', label: 'Jeux de société', emoji: '🎲' },
  { id: 'gaming', label: 'Jeux vidéo', emoji: '🎮' },
  { id: 'tech', label: 'Tech', emoji: '📱' },
  { id: 'voyage', label: 'Voyage', emoji: '✈️' },
  { id: 'bienetre', label: 'Bien-être', emoji: '🧖' },
  { id: 'mode', label: 'Mode & beauté', emoji: '💄' },
  { id: 'deco', label: 'Déco & maison', emoji: '🪴' },
  { id: 'jardin', label: 'Jardinage', emoji: '🌱' },
  { id: 'art', label: 'Art & DIY', emoji: '🎨' },
  { id: 'cinema', label: 'Cinéma & séries', emoji: '🎬' },
  { id: 'vin', label: 'Vin & gastronomie', emoji: '🍷' },
  { id: 'cafe', label: 'Café & thé', emoji: '☕' },
  { id: 'photo', label: 'Photo', emoji: '📷' },
  { id: 'animaux', label: 'Animaux', emoji: '🐾' },
  { id: 'enfant', label: 'Jouets', emoji: '🧸' },
];

type Idea = { text: string; price: number };

const IDEAS: Record<string, Idea[]> = {
  cuisine: [
    { text: 'Cours de cuisine pour deux', price: 90 }, { text: 'Couteau de chef japonais', price: 70 },
    { text: 'Coffret d’épices du monde', price: 30 }, { text: 'Livre de recettes d’un chef', price: 30 },
    { text: 'Tablier personnalisé', price: 20 },
  ],
  lecture: [
    { text: 'Abonnement à une box livres', price: 30 }, { text: 'Liseuse', price: 130 },
    { text: 'Carte cadeau librairie', price: 30 }, { text: 'Lampe de lecture design', price: 35 },
    { text: 'Beau livre illustré', price: 40 },
  ],
  sport: [
    { text: 'Montre connectée sport', price: 150 }, { text: 'Gourde isotherme', price: 25 },
    { text: 'Séance de massage sportif', price: 60 }, { text: 'Maillot de son équipe', price: 80 },
    { text: 'Tapis de yoga premium', price: 50 },
  ],
  rando: [
    { text: 'Carte IGN de sa région préférée', price: 15 }, { text: 'Lampe frontale', price: 35 },
    { text: 'Nuit en cabane dans les arbres', price: 150 }, { text: 'Sac à dos léger', price: 60 },
    { text: 'Bâtons de marche', price: 40 },
  ],
  musique: [
    { text: 'Places de concert', price: 80 }, { text: 'Vinyle de son artiste préféré', price: 30 },
    { text: 'Enceinte Bluetooth', price: 60 }, { text: 'Casque audio', price: 100 },
    { text: 'Cours de musique d’essai', price: 40 },
  ],
  jeux: [
    { text: 'Jeu de société coopératif', price: 35 }, { text: 'Escape game entre amis', price: 100 },
    { text: 'Jeu d’ambiance pour les soirées', price: 25 }, { text: 'Puzzle 1000 pièces', price: 25 },
  ],
  gaming: [
    { text: 'Carte cadeau jeux vidéo', price: 50 }, { text: 'Manette sans fil', price: 60 },
    { text: 'Figurine de son héros préféré', price: 35 }, { text: 'Casque gaming', price: 70 },
  ],
  tech: [
    { text: 'Batterie externe', price: 35 }, { text: 'Écouteurs sans fil', price: 80 },
    { text: 'Traceur d’objets (clés, sac)', price: 35 }, { text: 'Chargeur sans fil', price: 30 },
    { text: 'Ampoules connectées', price: 45 },
  ],
  voyage: [
    { text: 'Carte du monde à gratter', price: 25 }, { text: 'Trousse de voyage en cuir', price: 45 },
    { text: 'Week-end surprise', price: 250 }, { text: 'Guide de voyage + carnet', price: 30 },
    { text: 'Oreiller de voyage à mémoire de forme', price: 30 },
  ],
  bienetre: [
    { text: 'Bon pour un spa', price: 90 }, { text: 'Bougie parfumée artisanale', price: 30 },
    { text: 'Coffret de soins naturels', price: 40 }, { text: 'Diffuseur d’huiles essentielles', price: 35 },
    { text: 'Plaid tout doux', price: 45 },
  ],
  mode: [
    { text: 'Bijou minimaliste', price: 50 }, { text: 'Parfum', price: 70 },
    { text: 'Écharpe en laine mérinos', price: 45 }, { text: 'Coffret maquillage', price: 40 },
    { text: 'Portefeuille en cuir', price: 50 },
  ],
  deco: [
    { text: 'Plante d’intérieur et joli pot', price: 35 }, { text: 'Affiche encadrée', price: 45 },
    { text: 'Vase en céramique artisanale', price: 40 }, { text: 'Photophore', price: 25 },
  ],
  jardin: [
    { text: 'Kit de semis d’herbes aromatiques', price: 25 }, { text: 'Outils de jardin gravés', price: 40 },
    { text: 'Hôtel à insectes', price: 30 }, { text: 'Arrosoir design', price: 35 },
  ],
  art: [
    { text: 'Atelier poterie', price: 60 }, { text: 'Coffret aquarelle', price: 40 },
    { text: 'Carnet de croquis premium', price: 25 }, { text: 'Kit de broderie', price: 30 },
  ],
  cinema: [
    { text: 'Carte cinéma 5 places', price: 45 }, { text: 'Abonnement streaming 3 mois', price: 40 },
    { text: 'Coffret pop-corn & soirée film', price: 25 }, { text: 'Mini projecteur', price: 120 },
  ],
  vin: [
    { text: 'Dégustation dans un vignoble', price: 60 }, { text: 'Bonne bouteille de son millésime', price: 50 },
    { text: 'Coffret de fromages affinés', price: 45 }, { text: 'Restaurant gastronomique', price: 120 },
  ],
  cafe: [
    { text: 'Café de spécialité + mug', price: 30 }, { text: 'Coffret de thés rares', price: 35 },
    { text: 'Cafetière à piston élégante', price: 40 }, { text: 'Atelier barista', price: 70 },
  ],
  photo: [
    { text: 'Album photo personnalisé', price: 35 }, { text: 'Appareil photo instantané', price: 90 },
    { text: 'Cours de photo en extérieur', price: 70 }, { text: 'Tirage d’art de ses photos', price: 40 },
  ],
  animaux: [
    { text: 'Portrait illustré de son animal', price: 45 }, { text: 'Accessoire design pour son animal', price: 30 },
    { text: 'Séance photo avec son animal', price: 80 },
  ],
  enfant: [
    { text: 'Boîte de construction', price: 40 }, { text: 'Livre illustré', price: 15 },
    { text: 'Kit d’expériences scientifiques', price: 30 }, { text: 'Déguisement', price: 25 },
    { text: 'Sortie au zoo ou au parc', price: 60 },
  ],
};

const UNIVERSAL: Idea[] = [
  { text: 'Une expérience à vivre ensemble (restaurant, spectacle…)', price: 70 },
  { text: 'Album photo de vos souvenirs', price: 35 },
  { text: 'Carte cadeau de sa boutique préférée', price: 40 },
  { text: 'Bouquet de fleurs livré', price: 40 },
  { text: 'Lettre manuscrite + petite douceur', price: 10 },
];

const SENIOR: Idea[] = [
  { text: 'Cadre photo numérique avec photos de famille', price: 80 },
  { text: 'Journée en famille organisée', price: 50 },
];

const WEDDING: Idea[] = [
  { text: 'Dîner aux chandelles réservé', price: 120 },
  { text: 'Week-end en amoureux', price: 250 },
  { text: 'Cadre avec la photo de leur mariage', price: 35 },
];

/**
 * Suggestions : d'abord les centres d'intérêt, complétées par des idées universelles,
 * filtrées selon le budget (avec une marge de 20 %) et sans doublon avec les idées déjà notées.
 */
export function suggestGifts(p: Person, today = new Date(), limit = 8): Idea[] {
  const age = p.kind === 'birthday' ? (ageAtNext(p, today) ?? currentAge(p, today)) : null;
  const pools: Idea[][] = [];
  if (p.kind === 'wedding' || p.kind === 'couple') pools.push(WEDDING);
  for (const i of p.interests) if (IDEAS[i]) pools.push(IDEAS[i]);
  if (age != null && age <= 12 && !p.interests.includes('enfant')) pools.push(IDEAS.enfant);
  if (age != null && age >= 70) pools.push(SENIOR);
  pools.push(UNIVERSAL);

  // Entrelace les listes pour varier
  const merged: Idea[] = [];
  const max = Math.max(...pools.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of pools) if (l[i]) merged.push(l[i]);

  const existing = new Set(p.gifts.map((g) => g.text.toLowerCase()));
  const cap = p.budget != null ? p.budget * 1.2 : Infinity;
  const seen = new Set<string>();
  const out: Idea[] = [];
  for (const idea of merged) {
    const k = idea.text.toLowerCase();
    if (seen.has(k) || existing.has(k) || idea.price > cap) continue;
    seen.add(k);
    out.push(idea);
    if (out.length >= limit) break;
  }
  return out;
}
