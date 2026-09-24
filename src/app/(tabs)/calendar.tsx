import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Empty, PersonRow, SectionLabel } from '../../components/ui';
import { birthdayInYear, firstName, MONTHS, type Person } from '../../lib/birthdays';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

const DOW = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export default function Calendar() {
  const t = useTheme();
  const { people } = useStore();
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
  const listed = (selected ? byDay[selected] ?? [] : Object.keys(byDay).map(Number).sort((a, b) => a - b).flatMap((d) => byDay[d]));

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} style={[styles.nav, { borderColor: t.border, backgroundColor: t.surface }]}>
          <Text style={{ color: t.text, fontSize: 20 }}>‹</Text>
        </Pressable>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} style={[styles.nav, { borderColor: t.border, backgroundColor: t.surface }]}>
          <Text style={{ color: t.text, fontSize: 20 }}>›</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {DOW.map((d) => (
          <Text key={d} style={[styles.slot, { color: t.muted, fontSize: 12, textAlign: 'center', textTransform: 'uppercase' }]}>{d}</Text>
        ))}
        {cells.map((d, i) => {
          const ppl = d ? byDay[d] ?? [] : [];
          const sel = d != null && selected === d;
          return (
            <View key={i} style={styles.slot}>
            <Pressable
              disabled={!d}
              onPress={() => d && setSelected(sel ? null : d)}
              style={[
                styles.cell,
                d != null && { backgroundColor: ppl.length ? t.accentSoft : t.surface, borderColor: t.border, borderWidth: 1 },
                d != null && isToday(d) && { borderColor: t.accent, borderWidth: 2 },
                sel && { backgroundColor: t.accent },
              ]}
            >
              {d != null && (
                <>
                  <Text style={{ color: sel ? t.onAccent : t.muted, fontWeight: '700', fontSize: 13 }}>{d}</Text>
                  {ppl.length > 0 && (
                    <Text numberOfLines={1} style={{ fontSize: 10, color: sel ? t.onAccent : t.text }}>
                      🎂{ppl.length > 1 ? `×${ppl.length}` : ` ${firstName(ppl[0]).slice(0, 6)}`}
                    </Text>
                  )}
                </>
              )}
            </Pressable>
            </View>
          );
        })}
      </View>

      {(month !== now.getMonth() || year !== now.getFullYear()) && (
        <Button title="Revenir à aujourd’hui" variant="ghost" small onPress={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); setSelected(null); }} style={{ alignSelf: 'center', marginTop: 8 }} />
      )}

      <SectionLabel>{selected ? `Le ${selected} ${MONTHS[month]}` : 'Ce mois-ci'}</SectionLabel>
      {listed.length === 0
        ? <Empty emoji="🗓️" title={selected ? 'Aucun anniversaire ce jour-là.' : 'Aucun anniversaire ce mois-ci.'} />
        : listed.map((p) => <PersonRow key={p.id} person={p} today={now} compact onPress={() => router.push(`/person/${p.id}`)} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  nav: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { width: `${100 / 7}%`, padding: 2 },
  cell: { minHeight: 52, padding: 4, borderRadius: 8, borderColor: 'transparent' },
});
