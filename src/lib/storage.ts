import AsyncStorage from '@react-native-async-storage/async-storage';

import { validatePerson, type Person } from './birthdays';
import { DEFAULT_SETTINGS, type Settings } from './planner';

const KEY = 'anniv.data.v1';

export type AppData = { people: Person[]; settings: Settings };

export function normalizeData(raw: unknown): AppData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { people?: unknown; settings?: Partial<Settings> };
  const people = Array.isArray(obj.people)
    ? obj.people.flatMap((p) => {
      try {
        return [validatePerson(p as Record<string, unknown>)];
      } catch {
        return [];
      }
    })
    : [];
  return { people, settings: { ...DEFAULT_SETTINGS, ...(obj.settings ?? {}) } };
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
