import AsyncStorage from '@react-native-async-storage/async-storage';

import { validatePerson, type Person } from './birthdays';
import { DEFAULT_META, type Meta } from './insights';
import { DEFAULT_SETTINGS, type Settings } from './planner';

const KEY = 'anniv.data.v1';

export type AppData = { people: Person[]; settings: Settings; meta: Meta };

export function normalizeData(raw: unknown): AppData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { people?: unknown; settings?: Partial<Settings>; meta?: Partial<Meta> };
  const people = Array.isArray(obj.people)
    ? obj.people.flatMap((p) => {
      try {
        return [validatePerson(p as Record<string, unknown>)];
      } catch {
        return [];
      }
    })
    : [];
  const settings = { ...DEFAULT_SETTINGS, ...(obj.settings ?? {}) };
  // Un utilisateur de la v1 (qui a déjà des anniversaires) ne repasse pas par l'accueil.
  if (obj.settings && obj.settings.onboarded === undefined && people.length) settings.onboarded = true;
  return { people, settings, meta: { ...DEFAULT_META, ...(obj.meta ?? {}) } };
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalizeData(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeData(null);
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
