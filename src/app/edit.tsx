import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '../components/Sheet';
import { useToast } from '../components/toast';
import {
  Avatar, Button, Card, Chip, Field, haptic, IconButton, Row, Tap, ToggleRow, Txt, Wrap,
} from '../components/ui';
import {
  formatDayMonth, KINDS, MONTHS_SHORT, RELATIONS, validatePerson, type EventKind, type Person,
} from '../lib/birthdays';
import { nameDayFor } from '../lib/calendarfr';
import { REMINDER_CHOICES } from '../lib/choices';
import { deletePhoto, pickPhoto } from '../lib/device';
import { INTERESTS } from '../lib/gifts';
import { parseQuickAdd } from '../lib/quickadd';
import { useStore } from '../lib/store';
import { FONTS, useTheme } from '../theme';

const DEFAULT_GROUPS = ['Famille', 'Amis', 'Travail'];
const EMOJIS = ['😊', '😎', '🥰', '🤓', '👩', '👨', '👧', '👦', '👵', '👴', '👶', '💃', '🕺', '🦸', '🧑‍🍳', '🧑‍🎨', '🐶', '🐱', '🦊', '🐼', '🦄', '🦖', '🌸', '⚽', '🎸', '🎮', '📚', '✈️', '💍', '💞', '🕯️', '⭐'];

export default function Edit() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getPerson, savePerson, removePerson, restorePerson, people, settings } = useStore();
  const existing = id ? getPerson(id) : undefined;
  const now = new Date();

  const [quick, setQuick] = useState('');
  const [kind, setKind] = useState<EventKind>(existing?.kind ?? 'birthday');
  const [name, setName] = useState(existing?.name ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [day, setDay] = useState(existing ? String(existing.day) : '');
  const [month, setMonth] = useState(existing?.month ?? now.getMonth() + 1);
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const [group, setGroup] = useState(existing?.group ?? 'Amis');
  const [relation, setRelation] = useState(existing?.relation ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [photo, setPhoto] = useState(existing?.photo ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [budget, setBudget] = useState(existing?.budget != null ? String(existing.budget) : '');
  const [interests, setInterests] = useState<string[]>(existing?.interests ?? []);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [giftReminder, setGiftReminder] = useState(existing?.giftReminder ?? true);
  const [custom, setCustom] = useState(existing?.reminders != null);
  const [reminders, setReminders] = useState<number[]>(existing?.reminders ?? settings.reminders);
  const [nameDayOn, setNameDayOn] = useState(existing ? existing.nameDay != null : true);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [error, setError] = useState('');

  const groups = [...new Set([...DEFAULT_GROUPS, ...people.map((p) => p.group)])];
  const detectedNameDay = useMemo(() => existing?.nameDay ?? nameDayFor(name), [name, existing?.nameDay]);
  const preview = { name: name || '?', emoji, photo } as Pick<Person, 'name' | 'emoji' | 'photo'>;

  const applyQuick = () => {
    const q = parseQuickAdd(quick);
    if (q.name) setName(q.name);
    if (q.day) setDay(String(q.day));
    if (q.month) setMonth(q.month);
    if (q.year) setYear(String(q.year));
    if (q.group) setGroup(q.group);
    setKind(q.kind);
    setQuick('');
    haptic('success');
    if (!q.day || !q.month) toast('Je n’ai pas trouvé de date : complète-la ci-dessous');
  };

  const save = () => {
    try {
      const p = validatePerson({
        ...(existing ?? {}),
        kind, name, label, day, month, year, group, relation, emoji, photo, phone, email, notes, budget, interests, favorite,
        giftReminder: kind === 'memorial' ? false : giftReminder,
        reminders: custom ? reminders : null,
        nameDay: kind === 'birthday' && nameDayOn ? detectedNameDay : null,
      });
      if (existing?.photo && existing.photo !== photo) deletePhoto(existing.photo);
      savePerson(p);
      haptic('success');
      toast(existing ? 'Modifications enregistrées ✓' : `${p.name} ajouté·e 🎈`);
      if (existing) router.back();
      else router.replace({ pathname: '/person/[id]', params: { id: p.id } });
    } catch (e) {
      haptic('warning');
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

  const nameLabel = kind === 'wedding' ? 'Qui ? (ex. Paul & Léa)' : kind === 'couple' ? 'Avec qui ?' : kind === 'other' ? 'Personne ou sujet' : 'Nom';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Modifier' : 'Nouvel événement' }} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {!existing && (
          <Card style={{ backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
            <Row gap={8} style={{ marginBottom: 8 }}>
              <Ionicons name="flash" size={16} color={t.accent} />
              <Txt variant="h3" color={t.accent}>Saisie éclair</Txt>
            </Row>
            <Row gap={8}>
              <View style={{ flex: 1 }}>
                <Field value={quick} onChangeText={setQuick} placeholder="Julie Martin 12 mars 1990 famille" onSubmitEditing={applyQuick} returnKeyType="done" containerStyle={{ marginBottom: 0 }} />
              </View>
              <IconButton icon="arrow-forward" tone="accent" label="Remplir" onPress={applyQuick} size={46} />
            </Row>
          </Card>
        )}

        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Tap onPress={() => setAvatarSheet(true)}>
            <Avatar person={preview} size={104} ring />
            <View style={{ position: 'absolute', right: 0, bottom: 4, width: 34, height: 34, borderRadius: 17, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: t.bg }}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </Tap>
        </View>

        <Txt variant="label" style={{ marginBottom: 8, marginTop: 8 }}>Type d’événement</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18, marginBottom: 16 }}>
          {(Object.keys(KINDS) as EventKind[]).map((k) => (
            <Chip key={k} label={KINDS[k].short} icon={KINDS[k].emoji} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ScrollView>

        <Field label={nameLabel} value={name} onChangeText={setName} placeholder={kind === 'wedding' ? 'Paul & Léa' : 'Prénom Nom'} maxLength={80} autoFocus={!existing} />
        {kind === 'other' && <Field label="Libellé" value={label} onChangeText={setLabel} placeholder="Adoption de Filou, arrivée en France…" />}

        <Txt variant="label" style={{ marginBottom: 8 }}>Date</Txt>
        <Wrap gap={6} style={{ marginBottom: 12 }}>
          {MONTHS_SHORT.map((m, i) => <Chip key={m} label={m} selected={month === i + 1} onPress={() => setMonth(i + 1)} />)}
        </Wrap>
        <Row gap={10}>
          <Field label="Jour" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} placeholder="15" containerStyle={{ flex: 1 }} />
          <Field label={kind === 'birthday' ? 'Année de naissance' : 'Année'} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="facultatif" containerStyle={{ flex: 1.4 }} />
        </Row>

        {kind === 'birthday' && detectedNameDay && (
          <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
            <ToggleRow emoji="🌷" title={`Fête le ${formatDayMonth(detectedNameDay)}`} subtitle="D’après le calendrier des prénoms : je te le rappellerai" value={nameDayOn} onValueChange={setNameDayOn} />
          </Card>
        )}

        {kind !== 'memorial' && (
          <>
            <Txt variant="label" style={{ marginBottom: 8, marginTop: 4 }}>Lien</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18, marginBottom: 14 }}>
              {RELATIONS.map((r) => <Chip key={r} label={r} selected={relation === r} onPress={() => setRelation(relation === r ? '' : r)} />)}
            </ScrollView>
          </>
        )}

        <Txt variant="label" style={{ marginBottom: 8 }}>Groupe</Txt>
        <Wrap gap={6} style={{ marginBottom: 8 }}>
          {groups.map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />)}
        </Wrap>
        <Field value={groups.includes(group) ? '' : group} onChangeText={(v) => setGroup(v || 'Amis')} placeholder="…ou un nouveau groupe (Club de foot, Voisins…)" />

        {kind === 'birthday' && (
          <>
            <Txt variant="label" style={{ marginBottom: 8 }}>Centres d’intérêt · pour des idées cadeaux sur-mesure</Txt>
            <Wrap gap={6} style={{ marginBottom: 16 }}>
              {INTERESTS.map((i) => (
                <Chip key={i.id} label={i.label} icon={i.emoji} selected={interests.includes(i.id)}
                  onPress={() => setInterests((xs) => (xs.includes(i.id) ? xs.filter((x) => x !== i.id) : [...xs, i.id]))} />
              ))}
            </Wrap>
          </>
        )}

        <Row gap={10}>
          <Field label="Téléphone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="06…" containerStyle={{ flex: 1 }} />
        </Row>
        <Field label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="facultatif" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Taille, goûts, allergies, anecdotes…" style={{ minHeight: 80, textAlignVertical: 'top' }} />

        <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
          <ToggleRow icon="star" color={t.warn} title="Favori" subtitle="Toujours en tête à date égale" value={favorite} onValueChange={setFavorite} />
          {kind !== 'memorial' && (
            <ToggleRow icon="gift" color="#FF8A5B" title="Rappel pour le cadeau"
              subtitle={settings.giftReminders.length ? settings.giftReminders.map((d) => `J-${d}`).join(', ') : 'Aucun délai choisi dans Réglages'}
              value={giftReminder} onValueChange={setGiftReminder} />
          )}
        </Card>
        {kind !== 'memorial' && (
          <Field label="Budget cadeau (€)" icon="wallet-outline" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="30" />
        )}

        <Card>
          <ToggleRow icon="notifications" title="Rappels personnalisés" subtitle={custom ? 'Pour cette personne uniquement' : `Par défaut : ${settings.reminders.map((d) => (d === 0 ? 'jour J' : `J-${d}`)).join(', ')}`} value={custom} onValueChange={setCustom} />
          {custom && (
            <Wrap gap={6} style={{ marginTop: 8 }}>
              {REMINDER_CHOICES.map(([v, l]) => (
                <Chip key={v} label={l} selected={reminders.includes(v)} onPress={() => setReminders((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]))} />
              ))}
            </Wrap>
          )}
        </Card>

        {existing && <Button title="Supprimer" icon="trash" variant="danger" onPress={remove} />}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 12, backgroundColor: t.bg, borderTopWidth: 1, borderColor: t.border }}>
        {!!error && <Text style={{ color: t.danger, marginBottom: 8, fontFamily: FONTS.bodySemi }} accessibilityRole="alert">{error}</Text>}
        <Button title={existing ? 'Enregistrer' : 'Ajouter'} icon="checkmark" variant="primary" onPress={save} />
      </View>

      <Sheet visible={avatarSheet} onClose={() => setAvatarSheet(false)} title="Photo ou emoji">
        <Row gap={10} style={{ marginBottom: 14 }}>
          <Button title="Choisir une photo" icon="image" variant="primary" style={{ flex: 1 }} onPress={async () => {
            setAvatarSheet(false);
            try {
              const uri = await pickPhoto();
              if (uri) setPhoto(uri);
            } catch {
              toast('Impossible d’ouvrir la galerie');
            }
          }} />
          {(!!photo || !!emoji) && <Button title="Retirer" icon="close" onPress={() => { setPhoto(''); setEmoji(''); setAvatarSheet(false); }} />}
        </Row>
        <Wrap gap={8}>
          {EMOJIS.map((e) => (
            <Tap key={e} onPress={() => { setEmoji(e); setPhoto(''); setAvatarSheet(false); }} scale={0.85}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: emoji === e ? t.accentSoft : t.surface, borderWidth: 1, borderColor: emoji === e ? t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26 }}>{e}</Text>
              </View>
            </Tap>
          ))}
        </Wrap>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
