import { useColorScheme } from 'react-native';

import type { AccentName } from './lib/planner';
import { useStore } from './lib/store';

export const FONTS = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'PlusJakartaSans_500Medium',
  bodyRegular: 'PlusJakartaSans_400Regular',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  bodyHeavy: 'PlusJakartaSans_800ExtraBold',
};

export const ACCENTS: Record<AccentName, { name: string; a: string; b: string; softLight: string; softDark: string }> = {
  corail: { name: 'Corail', a: '#FF4D6D', b: '#FF8A5B', softLight: '#FFE4E8', softDark: '#3E1C27' },
  lavande: { name: 'Lavande', a: '#7C5CFF', b: '#C86BFA', softLight: '#ECE6FF', softDark: '#2A2046' },
  ocean: { name: 'Océan', a: '#1E7BFF', b: '#00C6D7', softLight: '#E1EEFF', softDark: '#15283F' },
  foret: { name: 'Forêt', a: '#0FA37F', b: '#7ED957', softLight: '#DDF5EB', softDark: '#133329' },
  soleil: { name: 'Soleil', a: '#FF7A00', b: '#FFC233', softLight: '#FFEEDB', softDark: '#3D2A12' },
};

const light = {
  dark: false,
  bg: '#FFF8F4',
  surface: '#FFFFFF',
  surface2: '#F7EEE9',
  surface3: '#EFE3DC',
  text: '#1D1420',
  muted: '#86777F',
  faint: '#B9ABB2',
  border: '#F0E4DD',
  ok: '#14A06F',
  okSoft: '#DDF4EA',
  warn: '#F2A20C',
  warnSoft: '#FFF1D6',
  danger: '#E5484D',
  shadow: 'rgba(80, 30, 50, 0.10)',
  overlay: 'rgba(20, 10, 20, 0.45)',
};

const dark: typeof light = {
  dark: true,
  bg: '#0F0B13',
  surface: '#1A1420',
  surface2: '#241C2B',
  surface3: '#2E2537',
  text: '#F7F0F5',
  muted: '#A396A0',
  faint: '#6E6270',
  border: '#2B2233',
  ok: '#3CCB94',
  okSoft: '#16362A',
  warn: '#FFC24D',
  warnSoft: '#3A2D12',
  danger: '#FF6B6F',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export type Theme = typeof light & {
  accent: string;
  accent2: string;
  accentSoft: string;
  onAccent: string;
  gradient: [string, string];
};

export function makeTheme(mode: 'light' | 'dark', accent: AccentName = 'corail'): Theme {
  const base = mode === 'dark' ? dark : light;
  const a = ACCENTS[accent] ?? ACCENTS.corail;
  return {
    ...base,
    accent: a.a,
    accent2: a.b,
    accentSoft: mode === 'dark' ? a.softDark : a.softLight,
    onAccent: '#FFFFFF',
    gradient: [a.a, a.b],
  };
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const { settings } = useStore();
  const mode = settings.theme === 'auto' || !settings.theme ? (system === 'dark' ? 'dark' : 'light') : settings.theme;
  return makeTheme(mode, settings.accent);
}

/** Dégradés vifs attribués à chaque personne (stables selon le nom). */
const PERSON_GRADIENTS: [string, string][] = [
  ['#FF5F6D', '#FFC371'],
  ['#F7797D', '#C471ED'],
  ['#7F53AC', '#647DEE'],
  ['#00B4DB', '#0083B0'],
  ['#11998E', '#38EF7D'],
  ['#FC466B', '#3F5EFB'],
  ['#F2994A', '#F2C94C'],
  ['#8E2DE2', '#4A00E0'],
  ['#DA4453', '#89216B'],
  ['#56AB2F', '#A8E063'],
  ['#FF512F', '#DD2476'],
  ['#1FA2FF', '#12D8FA'],
  ['#EB5757', '#F2994A'],
  ['#6A11CB', '#2575FC'],
];

export function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function personGradient(name: string): [string, string] {
  return PERSON_GRADIENTS[hashString(name) % PERSON_GRADIENTS.length];
}

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
