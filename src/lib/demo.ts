import { uid, validatePerson, type Person } from './birthdays';

/** Quelques exemples répartis autour d'aujourd'hui pour découvrir l'app. */
export function demoPeople(now = new Date()): Person[] {
  const y = now.getFullYear();
  const rel = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    return { day: d.getDate(), month: d.getMonth() + 1 };
  };
  const gift = (text: string, done = false) => ({ id: uid(), text, done });
  return [
    { name: 'Maman', ...rel(0), year: y - 58, group: 'Famille', emoji: '👩', budget: 50, notes: 'Adore les orchidées et le thé vert', gifts: [gift('Orchidée blanche'), gift('Coffret de thés')] },
    { name: 'Lucas Bernard', ...rel(3), year: y - 30, group: 'Amis', budget: 40, notes: 'Fan de randonnée', gifts: [gift('Gourde isotherme'), gift('Livre de rando', true)] },
    { name: 'Chloé Petit', ...rel(9), year: y - 17, group: 'Famille', emoji: '🎸', gifts: [gift('Médiators personnalisés')] },
    { name: 'Mme Garnier', ...rel(20), group: 'Travail', notes: 'Carte signée par l’équipe', giftReminder: false },
    { name: 'Hugo Leroy', ...rel(45), year: y - 40, group: 'Amis', budget: 30 },
    { name: 'Papi Jean', ...rel(80), year: y - 85, group: 'Famille', emoji: '👴', notes: 'Appeler plutôt le matin' },
    { name: 'Inès Moreau', day: 29, month: 2, year: 2000, group: 'Amis' },
    { name: 'Tom Girard', ...rel(200), year: y - 6, group: 'Famille', emoji: '🦖', gifts: [gift('Lego dinosaure')] },
  ].map((p) => validatePerson(p, now));
}
