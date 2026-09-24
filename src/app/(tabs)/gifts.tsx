import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../../components/toast';
import { Avatar, Button, Card, Chip, Empty, FadeIn, haptic, Pill, Row, SectionHeader, Tap, Txt } from '../../components/ui';
import {
  firstName, formatCountdown, isGiftBought, occurrenceYear, pendingIdeas, sortByUpcoming, startOfDay, type Person,
} from '../../lib/birthdays';
import { suggestGifts } from '../../lib/gifts';
import { useStore } from '../../lib/store';
import { FONTS, useTheme } from '../../theme';

const HORIZONS = [30, 60, 90, 365];

export default function Gifts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { people, updatePerson } = useStore();
  const [horizon, setHorizon] = useState(60);
  const today = startOfDay(new Date());

  const upcoming = sortByUpcoming(people.filter((p) => p.giftReminder && p.kind !== 'memorial'), today).filter((u) => u.days <= horizon);
  const toBuy = upcoming.filter((u) => !isGiftBought(u.person, today));
  const done = upcoming.filter((u) => isGiftBought(u.person, today));
  const budget = upcoming.reduce((s, u) => s + (u.person.budget ?? 0), 0);
  const thisYear = today.getFullYear();
  const spentYear = people.reduce((s, p) => s + p.gifts.filter((g) => g.year === thisYear && g.status !== 'idea').reduce((a, g) => a + (g.price ?? 0), 0), 0);
  const progress = upcoming.length ? done.length / upcoming.length : 0;

  const setBought = (p: Person, v: boolean) => {
    const year = occurrenceYear(p, today);
    updatePerson(p.id, (x) => {
      const giftBought = { ...x.giftBought };
      if (v) giftBought[year] = new Date().toISOString();
      else delete giftBought[year];
      return { ...x, giftBought };
    });
    if (v) {
      haptic('success');
      toast(`🎁 Cadeau pour ${firstName(p)} prêt !`, { label: 'Annuler', onPress: () => setBought(p, false) });
    }
  };

  const item = ({ person, days }: { person: Person; days: number }, bought: boolean, i: number) => {
    const ideas = pendingIdeas(person);
    const sugg = !ideas.length && !bought ? suggestGifts(person, today, 2) : [];
    return (
      <FadeIn key={person.id} delay={i * 40}>
        <Tap onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id } })} scale={0.98}>
          <Card style={{ opacity: bought ? 0.75 : 1, padding: 16 }} padded={false}>
            <Row gap={12}>
              <Avatar person={person} size={46} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{person.name}</Txt>
                <Txt variant="small" muted>{formatCountdown(days)}{person.relation ? ` · ${person.relation}` : ''}</Txt>
              </View>
              {person.budget != null && <Pill label={`${person.budget} €`} tone="warn" />}
            </Row>
            {!bought && (
              <View style={[s.ideas, { backgroundColor: t.surface2 }]}>
                {ideas.length > 0 ? ideas.slice(0, 3).map((g) => (
                  <Row key={g.id} gap={8}><Text>💡</Text><Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>{g.text}{g.price != null ? ` · ${g.price} €` : ''}</Txt></Row>
                )) : sugg.map((g) => (
                  <Row key={g.text} gap={8}><Text>✨</Text><Txt variant="small" muted style={{ flex: 1 }} numberOfLines={1}>Suggestion : {g.text}</Txt></Row>
                ))}
              </View>
            )}
            <Row gap={8} style={{ marginTop: 12 }}>
              {bought
                ? <Button small title="Pas encore prêt" icon="arrow-undo" variant="secondary" onPress={() => setBought(person, false)} />
                : <Button small title="C’est acheté !" icon="checkmark" variant="primary" onPress={() => setBought(person, true)} />}
              {!bought && <Button small title="Idées" icon="bulb" variant="soft" onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id } })} />}
            </Row>
          </Card>
        </Tap>
      </FadeIn>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 140 }}>
      <Txt variant="title">Cadeaux</Txt>
      <Txt muted style={{ marginBottom: 16 }}>Ne sois plus jamais pris·e de court.</Txt>

      <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={[s.blob, { width: 200, height: 200, top: -70, right: -60 }]} />
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={s.heroNumber}>{toBuy.length}</Text>
            <Text style={s.heroLabel}>cadeau{toBuy.length > 1 ? 'x' : ''} à trouver</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.heroNumber, { fontSize: 30 }]}>{budget ? `${budget} €` : '—'}</Text>
            <Text style={s.heroLabel}>budget prévu</Text>
          </View>
        </Row>
        <View style={{ marginTop: 16 }}>
          <View style={{ height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: '#fff', borderRadius: 8 }} />
          </View>
          <Text style={[s.heroLabel, { marginTop: 8 }]}>{done.length}/{upcoming.length} prêts · {spentYear} € dépensés en {thisYear}</Text>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginTop: 16 }}>
        {HORIZONS.map((h) => <Chip key={h} label={h === 365 ? '1 an' : `${h} jours`} selected={horizon === h} onPress={() => setHorizon(h)} />)}
      </ScrollView>

      {upcoming.length === 0 && <Empty emoji="🎁" title="Rien à préparer" subtitle={`Aucun anniversaire dans les ${horizon} prochains jours. Profites-en pour noter des idées !`} />}
      {toBuy.length > 0 && <SectionHeader title={`À trouver · ${toBuy.length}`} />}
      {toBuy.map((u, i) => item(u, false, i))}
      {done.length > 0 && <SectionHeader title={`Prêts · ${done.length}`} />}
      {done.map((u, i) => item(u, true, i))}

      <Card style={{ marginTop: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Ionicons name="notifications" size={22} color={t.accent} />
        <Txt variant="small" muted style={{ flex: 1 }}>
          Les rappels cadeau ont deux boutons : « Cadeau acheté » et « Rappeler demain ». Réglages des délais dans Moi → Réglages.
        </Txt>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.14 },
  heroNumber: { color: '#fff', fontFamily: FONTS.display, fontSize: 46, lineHeight: 50 },
  heroLabel: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 13, opacity: 0.92 },
  ideas: { borderRadius: 14, padding: 10, gap: 6, marginTop: 12 },
});
