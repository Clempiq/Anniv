import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PersonActions } from '../../components/PersonActions';
import { Avatar, Chip, Empty, IconButton, PersonRow, Row, Tap, Txt } from '../../components/ui';
import {
  birthdayInYear, currentAge, firstName, KINDS, MONTHS, nextBirthday, sortByUpcoming, startOfDay, type EventKind, type Person,
} from '../../lib/birthdays';
import { useStore } from '../../lib/store';
import { FONTS, personGradient, useTheme } from '../../theme';

type Mode = 'list' | 'month' | 'year';
type Filter = { group: string | null; kind: EventKind | 'fav' | null };
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function Agenda() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { people } = useStore();
  const [mode, setMode] = useState<Mode>('list');
  const [filter, setFilter] = useState<Filter>({ group: null, kind: null });
  const [sort, setSort] = useState<'upcoming' | 'name' | 'age'>('upcoming');
  const [actions, setActions] = useState<Person | null>(null);
  const today = startOfDay(new Date());

  const groups = useMemo(() => [...new Set(people.map((p) => p.group))].sort((a, b) => a.localeCompare(b, 'fr')), [people]);
  const kinds = useMemo(() => [...new Set(people.map((p) => p.kind))].filter((k) => k !== 'birthday'), [people]);
  const filtered = people.filter((p) => (!filter.group || p.group === filter.group)
    && (!filter.kind || (filter.kind === 'fav' ? p.favorite : p.kind === filter.kind)));

  const open = (p: Person) => router.push({ pathname: '/person/[id]', params: { id: p.id } });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="title">Agenda</Txt>
          <IconButton icon="search" label="Rechercher" onPress={() => router.push('/search')} />
        </Row>
        <View style={[s.segment, { backgroundColor: t.surface2 }]}>
          {(['list', 'month', 'year'] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[s.segItem, mode === m && { backgroundColor: t.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }]}>
              <Text style={{ fontFamily: mode === m ? FONTS.bodyBold : FONTS.bodySemi, color: mode === m ? t.text : t.muted, fontSize: 13.5 }}>
                {m === 'list' ? 'Liste' : m === 'month' ? 'Mois' : 'Année'}
              </Text>
            </Pressable>
          ))}
        </View>
        {mode !== 'month' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
            <Chip label="Tous" selected={!filter.group && !filter.kind} onPress={() => setFilter({ group: null, kind: null })} />
            <Chip label="Favoris" icon="⭐" selected={filter.kind === 'fav'} onPress={() => setFilter({ group: null, kind: filter.kind === 'fav' ? null : 'fav' })} />
            {kinds.map((k) => <Chip key={k} label={KINDS[k].short} icon={KINDS[k].emoji} selected={filter.kind === k} onPress={() => setFilter({ group: null, kind: filter.kind === k ? null : k })} />)}
            {groups.map((g) => <Chip key={g} label={g} selected={filter.group === g} onPress={() => setFilter({ kind: null, group: filter.group === g ? null : g })} />)}
          </ScrollView>
        )}
      </View>

      {mode === 'list' && <ListMode people={filtered} sort={sort} setSort={setSort} onOpen={open} onLong={setActions} today={today} />}
      {mode === 'month' && <MonthMode people={people} onOpen={open} onLong={setActions} />}
      {mode === 'year' && <YearMode people={filtered} onOpen={open} />}
      <PersonActions person={actions} onClose={() => setActions(null)} />
    </View>
  );
}

function ListMode({ people, sort, setSort, onOpen, onLong, today }: {
  people: Person[]; sort: 'upcoming' | 'name' | 'age'; setSort: (s: 'upcoming' | 'name' | 'age') => void;
  onOpen: (p: Person) => void; onLong: (p: Person) => void; today: Date;
}) {
  const t = useTheme();
  const sections = useMemo(() => {
    if (sort === 'name') return [{ title: 'De A à Z', data: [...people].sort((a, b) => a.name.localeCompare(b.name, 'fr')) }];
    if (sort === 'age') return [{ title: 'Du plus âgé au plus jeune', data: [...people].sort((a, b) => (currentAge(b) ?? -1) - (currentAge(a) ?? -1)) }];
    const out: { title: string; data: Person[] }[] = [];
    for (const { person, days } of sortByUpcoming(people, today)) {
      const n = nextBirthday(person, today);
      const title = days === 0 ? 'Aujourd’hui' : days <= 7 ? 'Cette semaine'
        : `${MONTHS[n.getMonth()]}${n.getFullYear() !== today.getFullYear() ? ` ${n.getFullYear()}` : ''}`;
      const last = out[out.length - 1];
      if (last?.title === title) last.data.push(person);
      else out.push({ title, data: [person] });
    }
    return out;
  }, [people, sort, today]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <Row gap={14} style={{ marginBottom: 2 }}>
          {([['upcoming', 'Prochains'], ['name', 'Nom'], ['age', 'Âge']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setSort(k)} hitSlop={8}>
              <Text style={{ fontFamily: sort === k ? FONTS.bodyBold : FONTS.bodySemi, color: sort === k ? t.accent : t.muted, fontSize: 13 }}>
                {sort === k ? '● ' : ''}{l}
              </Text>
            </Pressable>
          ))}
        </Row>
      }
      renderSectionHeader={({ section }) => (
        <Txt variant="label" style={{ marginTop: 18, marginBottom: 10 }}>{section.title} · {section.data.length}</Txt>
      )}
      renderItem={({ item }) => <PersonRow person={item} today={today} onPress={() => onOpen(item)} onLongPress={() => onLong(item)} />}
      ListEmptyComponent={<Empty emoji="🔍" title="Rien par ici" subtitle="Aucun événement ne correspond à ce filtre." />}
      ListFooterComponent={people.length > 0 ? <Txt variant="small" muted center style={{ marginTop: 12 }}>Astuce : appui long sur une personne pour les actions rapides</Txt> : null}
    />
  );
}

function MonthMode({ people, onOpen, onLong }: { people: Person[]; onOpen: (p: Person) => void; onLong: (p: Person) => void }) {
  const t = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState<number | null>(null);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
    setSelected(null);
  };

  const byDay: Record<number, Person[]> = {};
  for (const p of people) {
    const b = birthdayInYear(p, year);
    if (b.getMonth() === month) (byDay[b.getDate()] ??= []).push(p);
  }
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const nDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: nDays }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const isToday = (d: number) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  const listed = selected ? byDay[selected] ?? [] : Object.keys(byDay).map(Number).sort((a, b) => a - b).flatMap((d) => byDay[d]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140, paddingTop: 12 }}>
      <View style={[s.monthCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <IconButton icon="chevron-back" label="Mois précédent" onPress={() => shift(-1)} size={38} />
          <Pressable onPress={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); setSelected(null); }}>
            <Txt variant="h1" style={{ textTransform: 'capitalize' }}>{MONTHS[month]} <Txt variant="h1" muted>{year}</Txt></Txt>
          </Pressable>
          <IconButton icon="chevron-forward" label="Mois suivant" onPress={() => shift(1)} size={38} />
        </Row>
        <View style={s.grid}>
          {DOW.map((d, i) => <Text key={i} style={[s.slot, { color: t.faint, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 12, marginBottom: 6 }]}>{d}</Text>)}
          {cells.map((d, i) => {
            const ppl = d ? byDay[d] ?? [] : [];
            const sel = d != null && selected === d;
            const today = d != null && isToday(d);
            return (
              <View key={i} style={s.slot}>
                {d != null && (
                  <Pressable onPress={() => setSelected(sel ? null : d)} style={s.dayCell}>
                    {sel || (ppl.length > 0) ? (
                      <LinearGradient
                        colors={sel ? t.gradient : ppl.length ? personGradient(ppl[0].name) : [t.surface, t.surface]}
                        style={[s.dayInner, !sel && { opacity: 0.9 }]}
                      >
                        <Text style={{ color: '#fff', fontFamily: FONTS.bodyHeavy, fontSize: 14 }}>{d}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[s.dayInner, today && { borderWidth: 2, borderColor: t.accent }]}>
                        <Text style={{ color: today ? t.accent : t.text, fontFamily: today ? FONTS.bodyHeavy : FONTS.bodySemi, fontSize: 14 }}>{d}</Text>
                      </View>
                    )}
                    {ppl.length > 1 && <View style={[s.countDot, { backgroundColor: t.text }]}><Text style={{ color: t.bg, fontSize: 9, fontFamily: FONTS.bodyHeavy }}>{ppl.length}</Text></View>}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
      <Txt variant="label" style={{ marginTop: 18, marginBottom: 10 }}>{selected ? `Le ${selected} ${MONTHS[month]}` : `En ${MONTHS[month]}`} · {listed.length}</Txt>
      {listed.length === 0
        ? <Empty emoji="🗓️" title={selected ? 'Rien ce jour-là' : 'Mois tranquille'} subtitle="Profites-en pour ajouter des anniversaires !" />
        : listed.map((p) => <PersonRow key={p.id} person={p} occurrence={birthdayInYear(p, year)} onPress={() => onOpen(p)} onLongPress={() => onLong(p)} />)}
    </ScrollView>
  );
}

function YearMode({ people, onOpen }: { people: Person[]; onOpen: (p: Person) => void }) {
  const t = useTheme();
  const now = new Date();
  const byMonth = MONTHS.map((_, m) => people.filter((p) => p.month === m + 1).sort((a, b) => a.day - b.day));
  const max = Math.max(1, ...byMonth.map((l) => l.length));
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {byMonth.map((list, m) => {
          const current = m === now.getMonth();
          const intensity = list.length / max;
          return (
            <View key={m} style={[s.yearCard, { backgroundColor: t.surface, borderColor: current ? t.accent : t.border }]}>
              <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { opacity: 0.06 + intensity * 0.22, borderRadius: 20 }]} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="h2" style={{ textTransform: 'capitalize' }}>{MONTHS[m]}</Txt>
                <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: list.length ? t.accent : t.faint }}>{list.length}</Text>
              </Row>
              <View style={{ marginTop: 8, gap: 6 }}>
                {list.slice(0, 4).map((p) => (
                  <Tap key={p.id} onPress={() => onOpen(p)} scale={0.97}>
                    <Row gap={8}>
                      <Avatar person={p} size={22} />
                      <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontFamily: FONTS.bodySemi, fontSize: 12.5 }}>{p.day} · {firstName(p)}</Text>
                    </Row>
                  </Tap>
                ))}
                {list.length > 4 && <Txt variant="caption">+ {list.length - 4} autres</Txt>}
                {!list.length && <Row gap={6}><Ionicons name="leaf-outline" size={14} color={t.faint} /><Txt variant="caption" color={t.faint}>Rien</Txt></Row>}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 14 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 },
  monthCard: { borderRadius: 26, borderWidth: 1, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { width: `${100 / 7}%`, alignItems: 'center' },
  dayCell: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  dayInner: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  countDot: { position: 'absolute', top: 0, right: 0, minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  yearCard: { width: '48%', flexGrow: 1, borderRadius: 20, borderWidth: 1, padding: 14, minHeight: 104, overflow: 'hidden' },
});
