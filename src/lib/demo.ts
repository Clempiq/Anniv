import { uid, validatePerson, type Person } from './birthdays';
import { nameDayFor } from './calendarfr';

/** Exemples répartis autour d'aujourd'hui pour découvrir toutes les fonctionnalités. */
export function demoPeople(now = new Date()): Person[] {
  const y = now.getFullYear();
  const rel = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    return { day: d.getDate(), month: d.getMonth() + 1 };
  };
  const gift = (text: string, price: number | null = null, status = 'idea', year: number | null = null) => ({ id: uid(), text, price, status, url: '', year });
  const past = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n).toISOString();
  return [
    { name: 'Maman', ...rel(0), year: y - 58, group: 'Famille', relation: 'Maman', emoji: '👩', budget: 50, favorite: true, interests: ['jardin', 'bienetre', 'cafe'], notes: 'Adore les orchidées et le thé vert', gifts: [gift('Orchidée blanche', 35), gift('Coffret de thés', 30), gift('Écharpe en cachemire', 60, 'given', y - 1)] },
    { name: 'Lucas Bernard', ...rel(3), year: y - 30, group: 'Amis', relation: 'Meilleur·e ami·e', budget: 40, interests: ['rando', 'musique'], notes: 'Fan de randonnée, ne boit pas d’alcool', gifts: [gift('Gourde isotherme', 25)] },
    { name: 'Chloé Petit', ...rel(9), year: y - 17, group: 'Famille', relation: 'Nièce', emoji: '🎸', interests: ['musique', 'mode'], gifts: [gift('Médiators personnalisés', 15)] },
    { name: 'Paul & Léa', kind: 'wedding', ...rel(12), year: y - 10, group: 'Famille', relation: 'Frère', emoji: '💍', budget: 80 },
    { name: 'Mme Garnier', ...rel(20), group: 'Travail', relation: 'Collègue', notes: 'Carte signée par l’équipe', giftReminder: false },
    { name: 'Hugo Leroy', ...rel(45), year: y - 40, group: 'Amis', relation: 'Ami·e', budget: 30, interests: ['vin', 'cuisine'] },
    { name: 'Julie Martin', ...rel(-3), year: y - 29, group: 'Amis', relation: 'Ami·e', interests: ['lecture', 'voyage'] },
    { name: 'Papi Jean', ...rel(80), year: y - 85, group: 'Famille', relation: 'Grand-père', emoji: '👴', notes: 'Appeler plutôt le matin', celebrated: { [y - 1]: past(300) } },
    { name: 'Mamie Rose', kind: 'memorial', ...rel(33), year: y - 6, group: 'Famille', emoji: '🌹', notes: 'Elle adorait les roses anciennes' },
    { name: 'Inès Moreau', day: 29, month: 2, year: 2000, group: 'Amis', relation: 'Ami·e', interests: ['art', 'photo'], celebrated: { [y]: new Date(y, 1, 28, 10).toISOString() }, gifts: [gift('Atelier poterie', 60, 'given', y)] },
    { name: 'Tom Girard', day: 12, month: 4, year: y - 6, group: 'Famille', relation: 'Filleul·e', emoji: '🦖', interests: ['enfant'], gifts: [gift('Lego dinosaure', 40, 'given', y), gift('Kit d’expériences scientifiques', 30)], celebrated: { [y]: new Date(y, 3, 12, 9).toISOString() } },
  ].map((p: Record<string, unknown>) => validatePerson({ ...p, nameDay: p.kind ? null : nameDayFor(String(p.name)), createdAt: past(400) }, now));
}
