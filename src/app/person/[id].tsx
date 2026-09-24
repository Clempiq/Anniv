import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useToast } from '../../components/toast';
import { Avatar, Badge, Button, Card, Chip, Empty, H2, Muted, Row } from '../../components/ui';
import {
  ageAtNext, bornWeekday, chineseZodiac, currentAge, daysAlive, daysUntil, firstName, formatCountdown,
  formatDayMonth, isMilestone, occurrenceYear, uid, wishMessage, WISH_TONES, zodiacSign,
} from '../../lib/birthdays';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

export default function PersonScreen() {
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { people, updatePerson, settings } = useStore();
  const p = people.find((x) => x.id === id);
  const [newGift, setNewGift] = useState('');
  const [tone, setTone] = useState<string | null>(null);
  const [wishIndex, setWishIndex] = useState(0);

  if (!p) return <Empty emoji="🤷" title="Cette personne n’existe plus." />;

  const today = new Date();
  const days = daysUntil(p, today);
  const age = currentAge(p, today);
  const nextAge = ageAtNext(p, today);
  const z = zodiacSign(p.month, p.day);
  const cz = chineseZodiac(p.year);
  const year = occurrenceYear(p, today);
  const bought = !!p.giftBought[year];
  const celebrated = !!p.celebrated[year];
  const activeTone = tone ?? (isMilestone(nextAge) ? 'milestone' : 'chaleureux');
  const message = wishMessage(p, activeTone, wishIndex, today);
  const phoneDigits = p.phone.replace(/[^\d+]/g, '');
  const waNumber = phoneDigits.replace(/^\+/, '').replace(/^0/, '33');
  const history = Object.keys(p.celebrated).sort().reverse();
  const pendingIdeas = p.gifts.filter((g) => !g.done);

  const addGift = () => {
    const text = newGift.trim();
    if (!text) return;
    updatePerson(p.id, (x) => ({ ...x, gifts: [...x.gifts, { id: uid(), text, done: false }] }));
    setNewGift('');
  };

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast('Aucune app ne peut ouvrir ce lien');
    }
  };

  const facts: [string, string][] = [
    ['Prochain', formatCountdown(days)],
    ...(age != null ? [['Âge', `${age} ans${isMilestone(nextAge) ? ` → ⭐ ${nextAge}` : ''}`] as [string, string]] : []),
    ['Signe', `${z.emoji} ${z.name}`],
    ...(cz ? [['Signe chinois', `${cz.emoji} ${cz.name}`] as [string, string]] : []),
    ...(p.year ? [['Né·e un', bornWeekday(p) ?? '']] as [string, string][] : []),
    ...(p.year ? [['Jours vécus', (daysAlive(p, today) ?? 0).toLocaleString('fr-FR')]] as [string, string][] : []),
  ];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })} hitSlop={10}>
              <Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>Modifier</Text>
            </Pressable>
          ),
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <Avatar person={p} size={68} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>{p.name}</Text>
          <Muted style={{ fontSize: 15 }}>{formatDayMonth(p)}{p.year ? ` ${p.year}` : ''} · {p.group}</Muted>
        </View>
      </View>

      <View style={styles.facts}>
        {facts.map(([k, v]) => (
          <View key={k} style={[styles.fact, { backgroundColor: t.surface2 }]}>
            <Muted style={{ fontSize: 12 }}>{k}</Muted>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{v}</Text>
          </View>
        ))}
      </View>

      {!!p.notes && (
        <Card><Text style={{ color: t.text, fontSize: 15 }}>📝 {p.notes}</Text></Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2 style={{ marginBottom: 0 }}>🎁 Cadeau {year}</H2>
          {p.budget != null && <Badge label={`Budget ${p.budget} €`} tone="gold" />}
        </Row>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap', marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{bought ? '✅ Cadeau acheté' : 'Cadeau pas encore acheté'}</Text>
            <Muted>
              {bought ? 'Plus de rappel cadeau cette année.'
                : p.giftReminder ? `Rappels ${settings.giftReminders.map((d) => `J-${d}`).join(', ')} à ${settings.hour}h${String(settings.minute).padStart(2, '0')}`
                  : 'Rappel cadeau désactivé pour cette personne.'}
            </Muted>
          </View>
          <Switch
            value={bought}
            trackColor={{ true: t.ok }}
            onValueChange={(v) => {
              updatePerson(p.id, (x) => {
                const giftBought = { ...x.giftBought };
                if (v) giftBought[year] = new Date().toISOString();
                else delete giftBought[year];
                return { ...x, giftBought };
              });
              if (v) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                toast('Bien joué, cadeau prêt ! 🎁');
              }
            }}
          />
        </Row>

        <Text style={{ color: t.muted, fontSize: 13, marginTop: 14, marginBottom: 4 }}>
          Idées ({pendingIdeas.length} à offrir)
        </Text>
        {p.gifts.length === 0 && <Muted>Aucune idée pour l’instant.</Muted>}
        {p.gifts.map((g) => (
          <View key={g.id} style={styles.giftRow}>
            <Pressable
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: g.done }}
              onPress={() => updatePerson(p.id, (x) => ({ ...x, gifts: x.gifts.map((y) => (y.id === g.id ? { ...y, done: !y.done } : y)) }))}
              style={[styles.check, { borderColor: g.done ? t.ok : t.border, backgroundColor: g.done ? t.ok : 'transparent' }]}
            >
              {g.done && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}
            </Pressable>
            <Text style={{ flex: 1, color: g.done ? t.muted : t.text, fontSize: 15, textDecorationLine: g.done ? 'line-through' : 'none' }}>
              {g.text}
            </Text>
            <Pressable
              hitSlop={10}
              accessibilityLabel={`Supprimer ${g.text}`}
              onPress={() => updatePerson(p.id, (x) => ({ ...x, gifts: x.gifts.filter((y) => y.id !== g.id) }))}
            >
              <Text style={{ color: t.muted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Row style={{ flexWrap: 'nowrap', marginTop: 8 }}>
          <TextInput
            value={newGift}
            onChangeText={setNewGift}
            onSubmitEditing={addGift}
            placeholder="Ajouter une idée…"
            placeholderTextColor={t.muted}
            returnKeyType="done"
            style={[styles.input, { flex: 1, color: t.text, borderColor: t.border, backgroundColor: t.bg }]}
          />
          <Button title="Ajouter" small onPress={addGift} />
        </Row>
      </Card>

      <Card>
        <H2>💌 Message de vœux</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {Object.entries(WISH_TONES).map(([k, l]) => (
            <Chip key={k} label={l} selected={activeTone === k} onPress={() => { setTone(k); setWishIndex(0); }} />
          ))}
          <Chip label="🔀 Autre" onPress={() => setWishIndex((i) => i + 1)} />
        </View>
        <View style={[styles.wish, { backgroundColor: t.surface2 }]}>
          <Text selectable style={{ color: t.text, fontSize: 15, lineHeight: 21 }}>{message}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Button small title="📋 Copier" onPress={async () => { await Clipboard.setStringAsync(message); toast('Message copié 📋'); }} />
          <Button small title="📤 Partager" onPress={() => Share.share({ message }).catch(() => {})} />
          {!!phoneDigits && (
            <>
              <Button small title="💬 SMS" onPress={() => open(`sms:${phoneDigits}?body=${encodeURIComponent(message)}`)} />
              <Button small title="WhatsApp" onPress={() => open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`)} />
              <Button small title="📞 Appeler" onPress={() => open(`tel:${phoneDigits}`)} />
            </>
          )}
          {!!p.email && (
            <Button
              small
              title="✉️ E-mail"
              onPress={() => open(`mailto:${p.email}?subject=${encodeURIComponent(`Joyeux anniversaire ${firstName(p)} !`)}&body=${encodeURIComponent(message)}`)}
            />
          )}
        </View>
      </Card>

      <Card>
        <H2>✅ Suivi</H2>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>J’ai souhaité l’anniversaire {year}</Text>
          <Switch
            value={celebrated}
            trackColor={{ true: t.ok }}
            onValueChange={(v) => {
              updatePerson(p.id, (x) => {
                const c = { ...x.celebrated };
                if (v) c[year] = new Date().toISOString();
                else delete c[year];
                return { ...x, celebrated: c };
              });
              if (v) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                toast('Bravo, tu n’as pas oublié ! 🎉');
              }
            }}
          />
        </Row>
        {history.length > 0 && <Muted style={{ marginTop: 6 }}>Historique : {history.join(', ')}</Muted>}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  fact: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexGrow: 1, flexBasis: '45%' },
  giftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  wish: { borderRadius: 12, padding: 12 },
});
