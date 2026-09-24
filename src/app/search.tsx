import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Empty, PersonRow, Txt } from '../components/ui';
import { MONTHS, sortByUpcoming } from '../lib/birthdays';
import { normalizeName } from '../lib/calendarfr';
import { INTERESTS } from '../lib/gifts';
import { useStore } from '../lib/store';
import { FONTS, useTheme } from '../theme';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Recherche plein texte : nom, relation, groupe, notes, idées cadeaux, centres d'intérêt, mois. */
export default function Search() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { people } = useStore();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const query = norm(q.trim());
    if (!query) return sortByUpcoming(people).map((u) => u.person);
    return sortByUpcoming(people).map((u) => u.person).filter((p) => {
      const hay = norm([
        p.name, p.relation, p.group, p.notes, p.label, MONTHS[p.month - 1], p.phone, p.email,
        ...p.gifts.map((g) => g.text),
        ...p.interests.map((i) => INTERESTS.find((x) => x.id === i)?.label ?? i),
      ].join(' '));
      return query.split(/\s+/).every((w) => hay.includes(w) || normalizeName(p.name).includes(w));
    });
  }, [q, people]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 }}>
          <Ionicons name="search" size={18} color={t.muted} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Nom, relation, idée cadeau, mois…"
            placeholderTextColor={t.faint}
            returnKeyType="search"
            style={{ flex: 1, color: t.text, fontFamily: FONTS.body, fontSize: 16, paddingVertical: 13, paddingHorizontal: 10 }}
          />
          {!!q && <Pressable onPress={() => setQ('')} hitSlop={10}><Ionicons name="close-circle" size={18} color={t.faint} /></Pressable>}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Txt variant="bodySemi" color={t.accent}>Fermer</Txt>
        </Pressable>
      </View>
      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={q ? <Txt variant="label" style={{ marginVertical: 10 }}>{results.length} résultat{results.length > 1 ? 's' : ''}</Txt> : null}
        renderItem={({ item }) => <PersonRow person={item} compact onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.id } })} />}
        ListEmptyComponent={<Empty emoji="🔎" title="Aucun résultat" subtitle={`Rien ne correspond à « ${q} ».`} />}
      />
    </View>
  );
}
