import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useToast } from '../../components/toast';
import { Avatar, Badge, Button, Card, Chip, Empty, Muted, SectionLabel } from '../../components/ui';
import { firstName, formatCountdown, isGiftBought, occurrenceYear, sortByUpcoming, type Person } from '../../lib/birthdays';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

const HORIZONS = [30, 60, 90, 365];

export default function Gifts() {
  const t = useTheme();
  const toast = useToast();
  const { people, updatePerson, settings } = useStore();
  const [horizon, setHorizon] = useState(60);
  const today = new Date();

  const upcoming = sortByUpcoming(people.filter((p) => p.giftReminder), today).filter((u) => u.days <= horizon);
  const toBuy = upcoming.filter((u) => !isGiftBought(u.person, today));
  const done = upcoming.filter((u) => isGiftBought(u.person, today));
  const budget = toBuy.reduce((s, u) => s + (u.person.budget ?? 0), 0);

  const setBought = (p: Person, v: boolean) => {
    const year = occurrenceYear(p, today);
    updatePerson(p.id, (x) => {
      const giftBought = { ...x.giftBought };
      if (v) giftBought[year] = new Date().toISOString();
      else delete giftBought[year];
      return { ...x, giftBought };
    });
    if (v) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(`🎁 Cadeau pour ${firstName(p)} acheté !`, { label: 'Annuler', onPress: () => setBought(p, false) });
    }
  };

  const item = ({ person, days }: { person: Person; days: number }, bought: boolean) => {
    const ideas = person.gifts.filter((g) => !g.done);
    return (
      <Card key={person.id} style={{ opacity: bought ? 0.7 : 1 }}>
        <Pressable onPress={() => router.push(`/person/${person.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar person={person} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>{person.name}</Text>
            <Muted>{formatCountdown(days)}</Muted>
          </View>
          {person.budget != null && <Badge label={`${person.budget} €`} tone="gold" />}
        </Pressable>
        {!bought && (
          <Text style={{ color: ideas.length ? t.text : t.muted, marginTop: 10, fontSize: 14 }}>
            {ideas.length ? `💡 ${ideas.map((g) => g.text).join(' · ')}` : '💡 Pas encore d’idée : ouvre la fiche pour en ajouter.'}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {bought
            ? <Button small title="↩︎ Pas encore acheté" variant="ghost" onPress={() => setBought(person, false)} />
            : <Button small title="✅ Acheté" variant="primary" onPress={() => setBought(person, true)} />}
        </View>
      </Card>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Card style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ color: t.accent, fontSize: 26, fontWeight: '800' }}>{toBuy.length}</Text>
          <Muted>cadeau{toBuy.length > 1 ? 'x' : ''} à acheter</Muted>
        </Card>
        <Card style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: '800' }}>{budget ? `${budget} €` : '—'}</Text>
          <Muted>budget prévu</Muted>
        </Card>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {HORIZONS.map((h) => (
          <Chip key={h} label={h === 365 ? '1 an' : `${h} jours`} selected={horizon === h} onPress={() => setHorizon(h)} />
        ))}
      </View>
      <Muted style={{ marginTop: 8 }}>
        🔔 Rappels cadeau : {settings.giftReminders.length ? settings.giftReminders.map((d) => `J-${d}`).join(', ') : 'désactivés'} — depuis la notification, appuie sur « Cadeau acheté » ou « Rappeler demain ».
      </Muted>

      {upcoming.length === 0 && <Empty emoji="🎁" title={`Aucun anniversaire dans les ${horizon} prochains jours.`} />}
      {toBuy.length > 0 && <SectionLabel>À acheter</SectionLabel>}
      {toBuy.map((u) => item(u, false))}
      {done.length > 0 && <SectionLabel>Déjà acheté</SectionLabel>}
      {done.map((u) => item(u, true))}
    </ScrollView>
  );
}
