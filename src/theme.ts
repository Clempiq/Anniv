import { useColorScheme } from 'react-native';

import { useStore } from './lib/store';

const light = {
  dark: false,
  bg: '#FBF7F4',
  surface: '#FFFFFF',
  surface2: '#F3ECE7',
  text: '#2A2226',
  muted: '#7B6F74',
  border: '#E8DFDA',
  accent: '#E8505B',
  accentSoft: '#FDE4E5',
  onAccent: '#FFFFFF',
  gold: '#F2A93B',
  goldSoft: '#FCEBCF',
  ok: '#2F9E6E',
  danger: '#C93A3A',
};

const dark: typeof light = {
  dark: true,
  bg: '#17131A',
  surface: '#221C25',
  surface2: '#2C2530',
  text: '#F1EAEE',
  muted: '#A99EA6',
  border: '#3A3140',
  accent: '#FF6B75',
  accentSoft: '#4A2A31',
  onAccent: '#1A0E10',
  gold: '#F2B24F',
  goldSoft: '#4A3A20',
  ok: '#4CC38A',
  danger: '#FF7A7A',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { settings } = useStore();
  const mode = settings.theme === 'auto' || !settings.theme ? system : settings.theme;
  return mode === 'dark' ? dark : light;
}

export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 62%, 52%)`;
}
