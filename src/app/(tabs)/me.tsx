import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/toast';
import {
  Button, Card, Chip, Field, FadeIn, IconButton, ListRow, ProgressBar, Row, SectionHeader, Tap, Txt, Wrap,
} from '../../components/ui';
import { daysUntil, formatCountdown, MONTHS, MONTHS_SHORT, stats } from '../../lib/birthdays';
import { achievements, wishStreak, yearReview } from '../../lib/insights';
import { useStore } from '../../lib/store';
import { FONTS, useTheme } from '../../theme';

export default function Me() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { people, settings, meta } = useStore();
  const [profile, setProfile] = useState(false);
  const now = new Date();
  const review = yearReview(people, now.getFullYear(), now);
  const badges = achievements(people, meta, now);
  const unlocked = badges.filter((b) => b.unlocked).length;
  const streak = wishStreak(people, now);
  const st = stats(people, now);
  const maxMonth = Math.max(1, ...st.byMonth);
  const myDays = settings.userBirthday ? daysUntil(settings.userBirthday, now) : null;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 140 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="title">Moi</Txt>
        <IconButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
      </Row>

      <FadeIn>
        <Tap onPress={() => setProfile(true)} scale={0.98}>
          <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LinearGradient colors={t.gradient} style={s.me}>
              <Text style={{ color: '#fff', fontFamily: FONTS.display, fontSize: 26 }}>{(settings.userName || '?').slice(0, 1).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Txt variant="h2">{settings.userName || 'Ton profil'}</Txt>
              <Txt variant="small" muted>
                {myDays == null ? 'Ajoute ta date d’anniversaire 🎂' : myDays === 0 ? 'C’est ton anniversaire ! 🥳' : `Ton anniversaire : ${formatCountdown(myDays).toLowerCase()}`}
              </Txt>
            </View>
            <Ionicons name="create-outline" size={20} color={t.muted} />
          </Card>
        </Tap>
      </FadeIn>

      <FadeIn delay={80}>
        <LinearGradient colors={['#1D1420', '#3B1F3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.review}>
          <View style={[s.blob, { width: 220, height: 220, top: -80, right: -70, backgroundColor: t.accent }]} />
          <View style={[s.blob, { width: 140, height: 140, bottom: -60, left: -40, backgroundColor: t.accent2 }]} />
          <Text style={s.reviewKicker}>TON ANNÉE {review.year}</Text>
          <Text style={s.reviewTitle}>
            {review.total ? `${review.wished} anniversaire${review.wished > 1 ? 's' : ''} souhaité${review.wished > 1 ? 's' : ''} sur ${review.total}` : 'L’aventure commence !'}
          </Text>
          <Row gap={10} style={{ marginTop: 16 }}>
            <ReviewStat value={`${review.total ? Math.round((review.wished / review.total) * 100) : 0}%`} label="de réussite" />
            <ReviewStat value={String(review.giftsPrepared)} label="cadeaux" />
            <ReviewStat value={`${review.spent} €`} label="offerts" />
          </Row>
          <Row gap={10} style={{ marginTop: 10 }}>
            <ReviewStat value={`🔥 ${streak}`} label="série actuelle" />
            <ReviewStat value={String(review.added)} label="ajoutés" />
            <ReviewStat value={review.busiestMonth ? review.busiestMonth.slice(0, 4) + '.' : '—'} label="mois chargé" />
          </Row>
        </LinearGradient>
      </FadeIn>

      <SectionHeader title={`Badges · ${unlocked}/${badges.length}`} />
      <View style={s.badges}>
        {badges.map((b, i) => (
          <FadeIn key={b.id} delay={i * 25} style={{ width: '31.6%' }}>
            <View style={[s.badge, { backgroundColor: b.unlocked ? t.surface : t.surface2, borderColor: b.unlocked ? t.accent + '55' : t.border }]}>
              <Text style={{ fontSize: 30, opacity: b.unlocked ? 1 : 0.3 }}>{b.emoji}</Text>
              <Txt variant="caption" center color={b.unlocked ? t.text : t.muted} numberOfLines={1} style={{ fontFamily: FONTS.bodyBold }}>{b.title}</Txt>
              <Txt variant="caption" center numberOfLines={2} style={{ fontSize: 10.5, lineHeight: 13 }}>{b.description}</Txt>
              {!b.unlocked && <View style={{ alignSelf: 'stretch', marginTop: 6 }}><ProgressBar value={b.progress} height={5} /></View>}
            </View>
          </FadeIn>
        ))}
      </View>

      {people.length > 0 && (
        <>
          <SectionHeader title="Répartition sur l’année" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 5 }}>
              {st.byMonth.map((v, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <Text style={{ color: t.text, fontSize: 10.5, fontFamily: FONTS.bodyBold }}>{v || ''}</Text>
                  <LinearGradient
                    colors={i === now.getMonth() ? [t.warn, t.warn] : t.gradient}
                    style={{ width: '80%', height: `${(v / maxMonth) * 78}%`, minHeight: 4, borderRadius: 6, marginTop: 3 }}
                  />
                  <Text style={{ color: t.muted, fontSize: 9.5, marginTop: 5, fontFamily: FONTS.bodySemi }}>{MONTHS_SHORT[i].slice(0, 3)}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Row gap={10}>
            <Card style={{ flex: 1 }}>
              <Txt variant="caption">Âge moyen</Txt>
              <Txt variant="number">{st.avgAge != null ? Math.round(st.avgAge) : '—'}</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt variant="caption">Le plus chargé</Txt>
              <Txt variant="number" style={{ textTransform: 'capitalize', fontSize: 22 }}>{MONTHS[st.byMonth.indexOf(Math.max(...st.byMonth))]}</Txt>
            </Card>
          </Row>
          {Object.keys(st.bySign).length > 0 && (
            <Card>
              <Txt variant="h3" style={{ marginBottom: 10 }}>Signes astro</Txt>
              <Wrap gap={6}>
                {Object.entries(st.bySign).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <View key={k} style={[s.sign, { backgroundColor: t.surface2 }]}><Txt variant="caption" color={t.text}>{k} · {v}</Txt></View>
                ))}
              </Wrap>
            </Card>
          )}
        </>
      )}

      <SectionHeader title="Raccourcis" />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <ListRow icon="settings" color={t.accent} title="Réglages" subtitle="Rappels, apparence, sauvegardes, verrou" onPress={() => router.push('/settings')} />
        <ListRow icon="people" color="#7C5CFF" title="Importer depuis mes contacts" onPress={() => router.push('/import-contacts')} />
        <ListRow icon="search" color="#1E7BFF" title="Rechercher" onPress={() => router.push('/search')} />
      </Card>

      <ProfileSheet visible={profile} onClose={() => setProfile(false)} />
    </ScrollView>
  );
}

function ReviewStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.reviewStat}>
      <Text style={{ color: '#fff', fontFamily: FONTS.display, fontSize: 21 }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: '#fff', opacity: 0.75, fontFamily: FONTS.bodySemi, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function ProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useStore();
  const toast = useToast();
  const [name, setName] = useState(settings.userName);
  const [day, setDay] = useState(settings.userBirthday ? String(settings.userBirthday.day) : '');
  const [month, setMonth] = useState(settings.userBirthday?.month ?? 1);
  const [year, setYear] = useState(settings.userBirthday?.year ? String(settings.userBirthday.year) : '');
  return (
    <Sheet visible={visible} onClose={onClose} title="Ton profil" subtitle="Pour que l’app te souhaite ton anniversaire, à toi aussi 🎂">
      <Field label="Prénom" value={name} onChangeText={setName} placeholder="Clem" />
      <Txt variant="label" style={{ marginBottom: 8 }}>Ton anniversaire</Txt>
      <Wrap gap={6} style={{ marginBottom: 10 }}>
        {MONTHS_SHORT.map((m, i) => <Chip key={m} label={m} selected={month === i + 1} onPress={() => setMonth(i + 1)} />)}
      </Wrap>
      <Row gap={10}>
        <Field label="Jour" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} containerStyle={{ flex: 1 }} />
        <Field label="Année" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="facultatif" containerStyle={{ flex: 1 }} />
      </Row>
      <Button title="Enregistrer" variant="primary" icon="checkmark" onPress={() => {
        const d = Number(day);
        const y = year ? Number(year) : null;
        const valid = Number.isInteger(d) && d >= 1 && d <= new Date(2000, month, 0).getDate();
        updateSettings({ userName: name.trim(), userBirthday: valid ? { day: d, month, year: y && y > 1900 ? y : null } : null });
        toast('Profil enregistré ✓');
        onClose();
      }} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  me: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  review: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.35 },
  reviewKicker: { color: '#fff', opacity: 0.7, fontFamily: FONTS.bodyHeavy, fontSize: 11, letterSpacing: 2 },
  reviewTitle: { color: '#fff', fontFamily: FONTS.display, fontSize: 26, lineHeight: 30, marginTop: 6 },
  reviewStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 18, borderWidth: 1, padding: 10, alignItems: 'center', gap: 3, minHeight: 124, justifyContent: 'center' },
  sign: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
