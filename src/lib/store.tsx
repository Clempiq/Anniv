import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { mergePeople, type Person } from './birthdays';
import { syncNotifications } from './notifications';
import { DEFAULT_SETTINGS, pruneSnoozes, type Settings } from './planner';
import { loadData, saveData, type AppData } from './storage';

type Store = {
  loaded: boolean;
  people: Person[];
  settings: Settings;
  getPerson: (id: string) => Person | undefined;
  savePerson: (p: Person) => void;
  updatePerson: (id: string, fn: (p: Person) => Person) => void;
  removePerson: (id: string) => { person: Person; index: number } | null;
  restorePerson: (person: Person, index: number) => void;
  importPeople: (incoming: Person[]) => { added: number; skipped: number };
  replaceAll: (data: AppData) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resync: () => Promise<number>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    loadData().then((d) => {
      const settings = pruneSnoozes(d.settings);
      const next = { ...d, settings };
      dataRef.current = next;
      setData(next);
      syncNotifications(next.people, next.settings).catch(() => {});
    });
  }, []);

  const commit = useCallback((fn: (d: AppData) => AppData) => {
    const current = dataRef.current;
    if (!current) return;
    const next = fn(current);
    dataRef.current = next;
    setData(next);
    saveData(next).catch(() => {});
    syncNotifications(next.people, next.settings).catch(() => {});
  }, []);

  const store = useMemo<Store>(() => ({
    loaded: !!data,
    people: data?.people ?? [],
    settings: data?.settings ?? DEFAULT_SETTINGS,
    getPerson: (id) => dataRef.current?.people.find((p) => p.id === id),
    savePerson: (p) => commit((d) => {
      const idx = d.people.findIndex((x) => x.id === p.id);
      const people = [...d.people];
      if (idx >= 0) people[idx] = p;
      else people.push(p);
      return { ...d, people };
    }),
    updatePerson: (id, fn) => commit((d) => ({ ...d, people: d.people.map((p) => (p.id === id ? fn(p) : p)) })),
    removePerson: (id) => {
      const d = dataRef.current;
      const index = d?.people.findIndex((p) => p.id === id) ?? -1;
      if (!d || index < 0) return null;
      const person = d.people[index];
      commit((x) => ({ ...x, people: x.people.filter((p) => p.id !== id) }));
      return { person, index };
    },
    restorePerson: (person, index) => commit((d) => {
      const people = [...d.people];
      people.splice(Math.min(index, people.length), 0, person);
      return { ...d, people };
    }),
    importPeople: (incoming) => {
      const d = dataRef.current;
      if (!d) return { added: 0, skipped: incoming.length };
      const r = mergePeople(d.people, incoming);
      commit((x) => ({ ...x, people: r.people }));
      return { added: r.added, skipped: r.skipped };
    },
    replaceAll: (next) => commit(() => next),
    updateSettings: (patch) => commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    resync: () => (dataRef.current ? syncNotifications(dataRef.current.people, dataRef.current.settings) : Promise.resolve(0)),
  }), [data, commit]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
