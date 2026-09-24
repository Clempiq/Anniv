import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '../../components/toast';
import { Button, Chip, Empty, PersonRow, SectionLabel } from '../../components/ui';
import {
  ageAtNext, currentAge, daysUntil, firstName, MONTHS, nextBirthday, sortByUpcoming, type Person,
} from '../../lib/birthdays';
import { demoPeople } from '../../lib/demo';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

type SortMode = 'upcoming' | 'name' | 'age';

export default function Home() {
  const t = useTheme();
  const { people, loaded, importPeople } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('upcoming');
  const today = new Date();

  const groups = useMemo(() => [...new Set(people.map((p) => p.group))].sort((a, b) => a.localeCompare(b, 'fr')), [people]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => (!group || p.group === group)
      && (!q || `${p.name} ${p.notes} ${p.group}`.toLowerCase().includes(q)));
    if (sort === 'name') {
      return [{ title: 'Tout le monde', data: [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr')) }];
    }
    if (sort === 'age') {
      return [{ title: 'Du plus âgé au plus jeune', data: [...list].sort((a, b) => (currentAge(b) ?? -1) - (currentAge(a) ?? -1)) }];
    }
    const out: { title: string; data: Person[] }[] = [];
    for (const { person, days } of sortByUpcoming(list, today)) {
      const n = nextBirthday(person, today);
      const title = days <= 6 ? 'Cette semaine'
        : `${MONTHS[n.getMonth()]}${n.getFullYear() !== today.getFullYear() ? ` ${n.getFullYear()}` : ''}`;
      const last = out[out.length - 1];
      if (last?.title === title) last.data.push(person);
      else out.push({ title, data: [person] });
    }
    return out;
  }, [people, query, group, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const todays = people.filter((p) => daysUntil(p, today) === 0);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  if (!people.length) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
        <Empty emoji="🎈" title="Aucun anniversaire pour l’instant. Ajoute ceux de tes proches et reçois un rappel au bon moment, y compris pour acheter le cadeau !">
          <Button title="+ Ajouter un anniversaire" variant="primary" onPress={() => router.push('/edit')} />
          <Button title="Importer depuis mes contacts" onPress={() => router.push('/import-contacts')} />
          <Button
            title="Voir des exemples"
            variant="ghost"
            onPress={() => {
              const r = importPeople(demoPeople());
              toast(`${r.added} exemples ajoutés`);
            }}
          />
        </Empty>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {todays.length > 0 && (
              <View style={[styles.banner, { backgroundColor: t.accent }]}>
                <Text style={styles.bannerTitle}>
                  🎉 Aujourd’hui, on fête {todays.map((p) => firstName(p)).join(' et ')} !
                </Text>
                <Text style={styles.bannerSub}>
                  {todays.map((p) => {
                    const a = ageAtNext(p, today);
                    return a ? `${firstName(p)} a ${a} ans` : null;
                  }).filter(Boolean).join(' · ') || 'N’oublie pas de lui souhaiter !'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {todays.map((p) => (
                    <Pressable key={p.id} onPress={() => router.push(`/person/${p.id}`)} style={styles.bannerBtn}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>💌 Écrire à {firstName(p)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="🔍  Rechercher un nom, une note…"
              placeholderTextColor={t.muted}
              style={[styles.search, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              <Chip label="Tous" selected={!group} onPress={() => setGroup(null)} />
              {groups.map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />)}
              <View style={{ width: 1, backgroundColor: t.border, marginHorizontal: 4 }} />
              <Chip label="📆 Prochains" selected={sort === 'upcoming'} onPress={() => setSort('upcoming')} />
              <Chip label="🔤 Nom" selected={sort === 'name'} onPress={() => setSort('name')} />
              <Chip label="🎂 Âge" selected={sort === 'age'} onPress={() => setSort('age')} />
            </ScrollView>
          </View>
        }
        renderSectionHeader={({ section }) => <SectionLabel>{section.title}</SectionLabel>}
        renderItem={({ item }) => <PersonRow person={item} today={today} onPress={() => router.push(`/person/${item.id}`)} />}
        ListEmptyComponent={<Empty emoji="🔍" title="Aucun résultat." />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter un anniversaire"
        onPress={() => router.push('/edit')}
        style={({ pressed }) => [styles.fab, { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={{ color: t.onAccent, fontSize: 30, lineHeight: 32, fontWeight: '600' }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 18, marginBottom: 14 },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#fff', opacity: 0.92, marginTop: 4 },
  bannerBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 8 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
});
