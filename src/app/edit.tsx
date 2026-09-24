import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';

import { useToast } from '../components/toast';
import { Button, Card, Chip, Field, H2, Muted, Row } from '../components/ui';
import { MONTHS, MONTHS_SHORT, validatePerson } from '../lib/birthdays';
import { REMINDER_CHOICES } from '../lib/choices';
import { useStore } from '../lib/store';
import { useTheme } from '../theme';

const DEFAULT_GROUPS = ['Famille', 'Amis', 'Travail'];

export default function Edit() {
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getPerson, savePerson, removePerson, restorePerson, people, settings } = useStore();
  const existing = id ? getPerson(id) : undefined;
  const now = new Date();

  const [name, setName] = useState(existing?.name ?? '');
  const [day, setDay] = useState(existing ? String(existing.day) : '');
  const [month, setMonth] = useState(existing?.month ?? now.getMonth() + 1);
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const [group, setGroup] = useState(existing?.group ?? 'Amis');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [budget, setBudget] = useState(existing?.budget != null ? String(existing.budget) : '');
  const [giftReminder, setGiftReminder] = useState(existing?.giftReminder ?? true);
  const [custom, setCustom] = useState(existing?.reminders != null);
  const [reminders, setReminders] = useState<number[]>(existing?.reminders ?? settings.reminders);
  const [error, setError] = useState('');

  const groups = [...new Set([...DEFAULT_GROUPS, ...people.map((p) => p.group)])];

  const save = () => {
    try {
      const p = validatePerson({
        ...(existing ?? {}),
        name, day, month, year, group, emoji, phone, email, notes, budget, giftReminder,
        reminders: custom ? reminders : null,
      });
      savePerson(p);
      toast(existing ? 'Modifications enregistrées ✔️' : `${p.name} ajouté·e 🎈`);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(`Supprimer ${existing.name} ?`, 'Ses rappels seront aussi supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          const removed = removePerson(existing.id);
          router.dismissTo('/');
          if (removed) toast(`${existing.name} supprimé·e`, { label: 'Annuler', onPress: () => restorePerson(removed.person, removed.index) });
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? `Modifier ${existing.name}` : 'Nouvel anniversaire' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Prénom Nom" autoFocus={!existing} maxLength={80} />

        <Text style={{ color: t.muted, fontSize: 13, marginBottom: 6 }}>Mois</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {MONTHS.map((m, i) => (
            <Chip key={m} label={MONTHS_SHORT[i]} selected={month === i + 1} onPress={() => setMonth(i + 1)} />
          ))}
        </View>
        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          <Field containerStyle={{ flex: 1 }} label="Jour" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} placeholder="15" />
          <Field containerStyle={{ flex: 1 }} label="Année (facultatif)" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="1990" />
          <Field containerStyle={{ flex: 1 }} label="Emoji" value={emoji} onChangeText={setEmoji} maxLength={4} placeholder="😊" />
        </Row>

        <Text style={{ color: t.muted, fontSize: 13, marginBottom: 6 }}>Groupe</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {groups.map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />)}
        </View>
        <Field label="…ou un autre groupe" value={groups.includes(group) ? '' : group} onChangeText={(v) => setGroup(v || 'Amis')} placeholder="Club de foot, Voisins…" />

        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          <Field containerStyle={{ flex: 1 }} label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="06…" />
          <Field containerStyle={{ flex: 1 }} label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </Row>
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Goûts, taille, allergies…" style={{ minHeight: 70, textAlignVertical: 'top' }} />

        <Card>
          <H2>🎁 Cadeau</H2>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 15 }}>Me rappeler d’acheter un cadeau</Text>
              <Muted>
                {settings.giftReminders.length
                  ? `${settings.giftReminders.map((d) => `J-${d}`).join(', ')} (modifiable dans Réglages)`
                  : 'Aucun délai choisi dans Réglages'}
              </Muted>
            </View>
            <Switch value={giftReminder} onValueChange={setGiftReminder} trackColor={{ true: t.accent }} />
          </Row>
          <Field label="Budget (€)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="30" containerStyle={{ marginTop: 12, marginBottom: 0 }} />
        </Card>

        <Card>
          <H2>🔔 Rappels d’anniversaire</H2>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>Personnaliser pour cette personne</Text>
            <Switch value={custom} onValueChange={setCustom} trackColor={{ true: t.accent }} />
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, opacity: custom ? 1 : 0.45 }} pointerEvents={custom ? 'auto' : 'none'}>
            {REMINDER_CHOICES.map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={reminders.includes(v)}
                onPress={() => setReminders((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]))}
              />
            ))}
          </View>
        </Card>

        {!!error && <Text style={{ color: t.danger, marginBottom: 10, fontSize: 15 }} accessibilityRole="alert">{error}</Text>}
        <Button title="Enregistrer" variant="primary" onPress={save} />
        {existing && <Button title="Supprimer" variant="danger" onPress={remove} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
