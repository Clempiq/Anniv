import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useToast } from '../../components/toast';
import { Button, Chip, Empty, Field, haptic, Row, Txt } from '../../components/ui';
import { ageAtNext, firstName, type Person } from '../../lib/birthdays';
import { nocesName } from '../../lib/calendarfr';
import { useStore } from '../../lib/store';
import { suggestedTone, wishMessage } from '../../lib/wishes';
import { FONTS, hashString, personGradient, useTheme } from '../../theme';

type Theme = { id: string; name: string; colors: [string, string]; ink: string; deco: string[]; serif?: boolean; photo?: boolean };

const THEMES: Theme[] = [
  { id: 'fete', name: 'Fête', colors: ['#FF4D6D', '#FF8A5B'], ink: '#fff', deco: ['🎉', '🎈', '✨', '🎊'] },
  { id: 'nuit', name: 'Nuit étoilée', colors: ['#0F1B4C', '#5B2A86'], ink: '#fff', deco: ['✨', '⭐', '🌙', '💫'] },
  { id: 'pastel', name: 'Pastel', colors: ['#FFD6E8', '#C9E7FF'], ink: '#2A1B3D', deco: ['🎈', '🌸', '🍰', '💖'] },
  { id: 'jungle', name: 'Jungle', colors: ['#0FA37F', '#B7E36B'], ink: '#fff', deco: ['🌿', '🦜', '🌺', '🍍'] },
  { id: 'or', name: 'Chic', colors: ['#1D1420', '#3E2A1F'], ink: '#F6D38A', deco: ['✦', '✧', '🥂', '✦'], serif: true },
  { id: 'soleil', name: 'Soleil', colors: ['#FFB300', '#FF5E3A'], ink: '#fff', deco: ['☀️', '🌻', '🍹', '😎'] },
  { id: 'perso', name: 'Ses couleurs', colors: ['#000', '#000'], ink: '#fff', deco: ['🎂', '🎁', '✨', '🎉'] },
  { id: 'photo', name: 'Photo', colors: ['#000', '#000'], ink: '#fff', deco: ['✨', '💛'], photo: true },
];

function headline(p: Person): string {
  const a = ageAtNext(p);
  if (p.kind === 'wedding') return a ? `${a} ans de mariage` : 'Joyeux anniversaire de mariage';
  if (p.kind === 'couple') return a ? `${a} ans ensemble` : 'Joyeux anniversaire';
  if (p.kind === 'other') return p.label || 'Félicitations';
  if (a && (a === 18 || (a >= 20 && a % 10 === 0))) return `Joyeux ${a} ans !`;
  return 'Joyeux anniversaire';
}

export default function CardComposer() {
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPerson, settings, bumpMeta } = useStore();
  const p = getPerson(id);
  const ref = useRef<View>(null);
  const available = THEMES.filter((th) => !th.photo || p?.photo);
  const [themeId, setThemeId] = useState(available[0].id);
  const [title, setTitle] = useState(p ? headline(p) : '');
  const [message, setMessage] = useState(p ? wishMessage(p, suggestedTone(p), 1) : '');
  const [signature, setSignature] = useState(settings.userName ? `— ${settings.userName}` : '');
  const [busy, setBusy] = useState(false);

  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
  const colors = theme.id === 'perso' && p ? personGradient(p.name) : theme.colors;
  const decos = useMemo(() => {
    const seed = hashString((p?.name ?? '') + theme.id);
    return Array.from({ length: 14 }, (_, i) => {
      const r = (n: number) => ((seed * (i + 3) * 9301 + n * 49297) % 233280) / 233280;
      return { x: r(1) * 92, y: r(2) * 92, size: 14 + r(3) * 22, rot: r(4) * 60 - 30, emoji: theme.deco[i % theme.deco.length], op: 0.35 + r(5) * 0.5 };
    });
  }, [p?.name, theme]);

  if (!p) return <Empty emoji="🤷" title="Fiche introuvable" />;

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      haptic('success');
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Carte pour ${firstName(p)}` });
      }
      bumpMeta('cardsShared');
    } catch {
      toast('Impossible de créer l’image');
    } finally {
      setBusy(false);
    }
  };

  const noces = p.kind === 'wedding' ? nocesName(ageAtNext(p)) : null;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View ref={ref} collapsable={false} style={s.card}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {theme.photo && !!p.photo && (
          <>
            <Image source={{ uri: p.photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
          </>
        )}
        {decos.map((d, i) => (
          <Text key={i} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, fontSize: d.size, opacity: theme.photo ? 0.5 : d.op, transform: [{ rotate: `${d.rot}deg` }], color: theme.ink }}>
            {d.emoji}
          </Text>
        ))}
        <View style={s.cardInner}>
          <Text style={[s.kicker, { color: theme.ink }]}>{noces ? noces.toUpperCase() : '★ ★ ★'}</Text>
          <Text style={[s.title, { color: theme.ink, fontFamily: theme.serif ? FONTS.displaySemi : FONTS.display }]}>{title}</Text>
          <Text style={[s.name, { color: theme.ink }]} numberOfLines={2}>{firstName(p)}</Text>
          <View style={[s.sep, { backgroundColor: theme.ink }]} />
          <Text style={[s.message, { color: theme.ink }]}>{message}</Text>
          {!!signature && <Text style={[s.signature, { color: theme.ink }]}>{signature}</Text>}
        </View>
      </View>

      <Txt variant="label" style={{ marginTop: 20, marginBottom: 10 }}>Thème</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
        {available.map((th) => {
          const c = th.id === 'perso' ? personGradient(p.name) : th.colors;
          const sel = th.id === themeId;
          return (
            <View key={th.id} style={{ alignItems: 'center', gap: 6 }}>
              <Chip label={th.name} selected={sel} onPress={() => { setThemeId(th.id); haptic('light'); }} />
              <LinearGradient colors={c} style={{ width: 28, height: 6, borderRadius: 3 }} />
            </View>
          );
        })}
      </ScrollView>

      <Txt variant="label" style={{ marginTop: 20, marginBottom: 10 }}>Texte</Txt>
      <Field label="Titre" value={title} onChangeText={setTitle} />
      <Txt variant="caption" style={{ marginBottom: 6, marginLeft: 4 }}>Message</Txt>
      <View style={{ backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <TextInput multiline value={message} onChangeText={setMessage} style={{ color: t.text, fontFamily: FONTS.body, fontSize: 15, minHeight: 70, textAlignVertical: 'top' }} />
      </View>
      <Row gap={8} style={{ marginBottom: 14 }}>
        <Button small icon="shuffle" title="Autre message" variant="soft" onPress={() => setMessage(wishMessage(p, suggestedTone(p), Math.floor(Math.random() * 6)))} />
      </Row>
      <Field label="Signature" value={signature} onChangeText={setSignature} placeholder="— Clem" />

      <Button title={busy ? 'Création…' : 'Partager la carte'} icon="share-social" variant="primary" onPress={share} disabled={busy} />
      <Row gap={6} style={{ justifyContent: 'center', marginTop: 12 }}>
        <Ionicons name="information-circle-outline" size={15} color={t.muted} />
        <Txt variant="small" muted>La carte est envoyée en image : WhatsApp, Instagram, SMS…</Txt>
      </Row>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { aspectRatio: 4 / 5, borderRadius: 28, overflow: 'hidden', backgroundColor: '#000' },
  cardInner: { flex: 1, padding: 26, justifyContent: 'center', alignItems: 'center' },
  kicker: { fontFamily: FONTS.bodyHeavy, fontSize: 12, letterSpacing: 3, opacity: 0.85 },
  title: { fontSize: 30, lineHeight: 34, textAlign: 'center', marginTop: 10, letterSpacing: -0.5 },
  name: { fontFamily: FONTS.display, fontSize: 54, lineHeight: 58, textAlign: 'center', letterSpacing: -1.5, marginTop: 4 },
  sep: { width: 40, height: 3, borderRadius: 2, marginVertical: 16, opacity: 0.7 },
  message: { fontFamily: FONTS.bodySemi, fontSize: 15.5, lineHeight: 22, textAlign: 'center', opacity: 0.95 },
  signature: { fontFamily: FONTS.displayBold, fontSize: 17, marginTop: 16, opacity: 0.95 },
});
