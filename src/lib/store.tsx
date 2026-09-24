import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { mergePeople, type Person } from './birthdays';
import { DEFAULT_META, type Meta } from './insights';
import { syncNotifications } from './notifications';
import { DEFAULT_SETTINGS, pruneSnoozes, type Settings } from './planner';
import { loadData, saveData, type AppData } from './storage';

type Store = {
  loaded: boolean;
  people: Person[];
  settings: Settings;
  meta: Meta;
  getPerson: (id: string) => Person | undefined;
  savePerson: (p: Person) => void;
  updatePerson: (id: string, fn: (p: Person) => Person) => void;
  removePerson: (id: string) => { person: Person; index: number } | null;
  restorePerson: (person: Person, index: number) => void;
  importPeople: (incoming: Person[]) => { added: number; skipped: number };
  replaceAll: (data: Partial<AppData> & { people: Person[] }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  bumpMeta: (key: keyof Meta) => void;
  resync: () => Promise<number>;
  snapshot: () => AppData | null;
};

const StoreContext = createContext<Store | null>(null);

type Listener = (d: AppData) => void;
const listeners = new Set<Listener>();
/** Permet à des modules hors React (agenda, sauvegardes) de réagir aux changements. */
export function onDataChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    loadData().then((d) => {
      const next = { ...d, settings: pruneSnoozes(d.settings) };
      dataRef.current = next;
      setData(next);
      syncNotifications(next.people, next.settings).catch(() => {});
      listeners.forEach((l) => l(next));
    });
  }, []);

  const commit = useCallback((fn: (d: AppData) => AppData, opts: { sync?: boolean } = {}) => {
    const current = dataRef.current;
    if (!current) return;
    const next = fn(current);
    dataRef.current = next;
    setData(next);
    saveData(next).catch(() => {});
    if (opts.sync !== false) syncNotifications(next.people, next.settings).catch(() => {});
    listeners.forEach((l) => l(next));
  }, []);

  const store = useMemo<Store>(() => ({
    loaded: !!data,
    people: data?.people ?? [],
    settings: data?.settings ?? DEFAULT_SETTINGS,
    meta: data?.meta ?? DEFAULT_META,
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
    replaceAll: (next) => commit((d) => ({
      people: next.people,
      settings: { ...d.settings, ...(next.settings ?? {}), snoozes: [] },
      meta: next.meta ?? d.meta,
    })),
    updateSettings: (patch) => commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    bumpMeta: (key) => commit((d) => ({ ...d, meta: { ...d.meta, [key]: (d.meta[key] ?? 0) + 1 } }), { sync: false }),
    resync: () => (dataRef.current ? syncNotifications(dataRef.current.people, dataRef.current.settings) : Promise.resolve(0)),
    snapshot: () => dataRef.current,
  }), [data, commit]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
