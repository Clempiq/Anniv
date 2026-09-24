import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';

import { useToast } from '../components/toast';
import { Avatar, Button, Empty, Muted } from '../components/ui';
import { formatDayMonth, validatePerson, type Person } from '../lib/birthdays';
import { useStore } from '../lib/store';
import { useTheme } from '../theme';

type State = { status: 'loading' } | { status: 'denied' } | { status: 'ready'; people: Person[] };

const FIELDS = [ContactField.FULL_NAME, ContactField.BIRTHDAY, ContactField.PHONES, ContactField.EMAILS] as const;

export default function ImportContacts() {
  const t = useTheme();
  const toast = useToast();
  const store = useStore();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const perm = await requestPermissionsAsync();
      if (!perm.granted) return setState({ status: 'denied' });
      const contacts = await Contact.getAllDetails(FIELDS);
      const known = new Set(store.people.map((p) => `${p.name.toLowerCase()}|${p.day}|${p.month}`));
      const people: Person[] = [];
      for (const c of contacts) {
        const b = c.birthday;
        if (!c.fullName || !b?.month || !b?.day) continue;
        try {
          const p = validatePerson({
            name: c.fullName,
            day: b.day,
            month: b.month,
            year: b.year && b.year > 1900 ? b.year : null,
            phone: c.phones?.[0]?.number ?? '',
            email: c.emails?.[0]?.address ?? '',
            group: 'Contacts',
          });
          if (!known.has(`${p.name.toLowerCase()}|${p.day}|${p.month}`)) people.push(p);
        } catch {
          // date invalide dans le carnet : ignorée
        }
      }
      people.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      setState({ status: 'ready', people });
      setSelected(new Set(people.map((p) => p.id)));
    })().catch(() => setState({ status: 'ready', people: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === 'loading') {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator color={t.accent} /></View>;
  }
  if (state.status === 'denied') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Empty emoji="🔒" title="Anniv a besoin d’accéder à tes contacts pour y trouver les dates d’anniversaire. Rien n’est envoyé sur Internet.">
          <Button title="Ouvrir les paramètres" onPress={() => Linking.openSettings()} />
        </Empty>
      </View>
    );
  }
  if (!state.people.length) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Empty emoji="📇" title="Aucun nouveau contact avec une date d’anniversaire." />
      </View>
    );
  }

  const all = selected.size === state.people.length;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Muted>{state.people.length} contact(s) avec un anniversaire</Muted>
        <Pressable onPress={() => setSelected(all ? new Set() : new Set(state.people.map((p) => p.id)))} hitSlop={10}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>{all ? 'Tout décocher' : 'Tout cocher'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={state.people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => setSelected((s) => {
                const n = new Set(s);
                if (on) n.delete(item.id);
                else n.add(item.id);
                return n;
              })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: t.border }}
            >
              <Avatar person={item} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 16 }}>{item.name}</Text>
                <Muted>{formatDayMonth(item)}{item.year ? ` ${item.year}` : ''}</Muted>
              </View>
              <Text style={{ fontSize: 22, color: on ? t.accent : t.muted }}>{on ? '☑' : '☐'}</Text>
            </Pressable>
          );
        }}
      />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
        <Button
          title={`Importer ${selected.size} anniversaire${selected.size > 1 ? 's' : ''}`}
          variant="primary"
          disabled={!selected.size}
          onPress={() => {
            const r = store.importPeople(state.people.filter((p) => selected.has(p.id)));
            toast(`${r.added} anniversaire(s) importé(s) 🎉`);
            router.back();
          }}
        />
      </View>
    </View>
  );
}
