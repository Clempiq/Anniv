import Ionicons from '@expo/vector-icons/Ionicons';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../components/toast';
import { Avatar, Button, Empty, haptic, Row, Tap, Txt } from '../components/ui';
import { formatDayMonth, validatePerson, type Person } from '../lib/birthdays';
import { nameDayFor } from '../lib/calendarfr';
import { useStore } from '../lib/store';
import { useTheme } from '../theme';

type State = { status: 'loading' } | { status: 'denied' } | { status: 'ready'; people: Person[] };

const FIELDS = [ContactField.FULL_NAME, ContactField.BIRTHDAY, ContactField.PHONES, ContactField.EMAILS] as const;

export default function ImportContacts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = useStore();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return setState({ status: 'ready', people: [] });
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
            nameDay: nameDayFor(c.fullName),
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
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}><ActivityIndicator color={t.accent} size="large" /></View>;
  }
  if (state.status === 'denied') {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
        <Empty emoji="🔒" title="Accès aux contacts refusé" subtitle="Anniv lit seulement les dates d’anniversaire de ton carnet. Rien ne quitte ton téléphone.">
          <Button title="Ouvrir les paramètres" icon="settings" onPress={() => Linking.openSettings()} />
        </Empty>
      </View>
    );
  }
  if (!state.people.length) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
        <Empty emoji="📇" title="Rien de nouveau" subtitle="Aucun contact avec une date d’anniversaire qui ne soit pas déjà dans Anniv. Astuce : ajoute les dates dans ton carnet d’adresses, puis reviens ici.">
          <Button title="Ajouter à la main" icon="add" variant="primary" onPress={() => router.replace('/edit')} />
        </Empty>
      </View>
    );
  }

  const all = selected.size === state.people.length;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Row style={{ padding: 18, justifyContent: 'space-between' }}>
        <Txt variant="h2">{state.people.length} anniversaire{state.people.length > 1 ? 's' : ''} trouvé{state.people.length > 1 ? 's' : ''}</Txt>
        <Pressable onPress={() => setSelected(all ? new Set() : new Set(state.people.map((p) => p.id)))} hitSlop={10}>
          <Txt variant="bodySemi" color={t.accent}>{all ? 'Tout décocher' : 'Tout cocher'}</Txt>
        </Pressable>
      </Row>
      <FlatList
        data={state.people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Tap
              scale={0.98}
              onPress={() => setSelected((s) => {
                const n = new Set(s);
                if (on) n.delete(item.id);
                else n.add(item.id);
                return n;
              })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Row gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: t.border }}>
                <Avatar person={item} size={42} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodySemi">{item.name}</Txt>
                  <Txt variant="small" muted>{formatDayMonth(item)}{item.year ? ` ${item.year}` : ''}</Txt>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? t.accent : t.faint} />
              </Row>
            </Tap>
          );
        }}
      />
      <View style={{ position: 'absolute', left: 18, right: 18, bottom: insets.bottom + 16 }}>
        <Button
          title={`Importer ${selected.size} anniversaire${selected.size > 1 ? 's' : ''}`}
          icon="download"
          variant="primary"
          disabled={!selected.size}
          onPress={() => {
            const r = store.importPeople(state.people.filter((p) => selected.has(p.id)));
            haptic('success');
            toast(`${r.added} anniversaire(s) importé(s) 🎉`);
            router.back();
          }}
        />
      </View>
    </View>
  );
}
