import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConfetti } from '../../components/Confetti';
import { useToast } from '../../components/toast';
import {
  Avatar, Button, Card, Chip, Empty, haptic, IconButton, ListRow, Pill, ProgressBar, Ring, Row, SectionHeader, Tap,
  ToggleRow, Txt, Wrap,
} from '../../components/ui';
import {
  ageAtNext, birthFlower, birthstone, bornWeekday, chineseZodiac, currentAge, daysAlive, daysBetween, daysUntil, firstName,
  fmtInt, formatCountdown, formatDate, formatDayMonth, formatLongDate, giftHistory, KINDS, lastOccurrence, nextBirthday, occasionLabel,
  occurrenceYear, uid, zodiacSign, type GiftIdea, type GiftStatus, type Person,
} from '../../lib/birthdays';
import { nocesName } from '../../lib/calendarfr';
import { sendMessage, type Channel } from '../../lib/device';
import { INTERESTS, suggestGifts } from '../../lib/gifts';
import { useStore } from '../../lib/store';
import { nameDayMessage, suggestedTone, TONES, tonesFor, wishCount, wishMessage, type Tone } from '../../lib/wishes';
import { FONTS, personGradient, useTheme } from '../../theme';

type Tab = 'gifts' | 'message' | 'profile';

const STATUS: Record<GiftStatus, { label: string; icon: 'bulb' | 'bag-check' | 'gift' | 'heart'; next: GiftStatus }> = {
  idea: { label: 'Idée', icon: 'bulb', next: 'bought' },
  bought: { label: 'Acheté', icon: 'bag-check', next: 'wrapped' },
  wrapped: { label: 'Emballé', icon: 'gift', next: 'given' },
  given: { label: 'Offert', icon: 'heart', next: 'idea' },
};

export default function PersonScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, compose } = useLocalSearchParams<{ id: string; compose?: string }>();
  const { people, updatePerson } = useStore();
  const toast = useToast();
  const confetti = useConfetti();
  const p = people.find((x) => x.id === id);
  const [tab, setTab] = useState<Tab>(compose ? 'message' : p?.kind === 'memorial' ? 'profile' : 'gifts');

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
        <Empty emoji="🤷" title="Fiche introuvable" subtitle="Elle a peut-être été supprimée.">
          <Button title="Retour" onPress={() => router.back()} />
        </Empty>
      </View>
    );
  }

  const today = new Date();
  const days = daysUntil(p, today);
  const g = personGradient(p.name);
  const next = nextBirthday(p, today);
  const year = occurrenceYear(p, today);
  // Juste après le jour J, « souhaité » concerne l'occurrence qui vient de passer
  const since = daysBetween(lastOccurrence(p, today), today);
  const wishYear = since >= 1 && since <= 10 ? String(lastOccurrence(p, today).getFullYear()) : year;
  const wished = !!p.celebrated[wishYear];

  const toggleWished = () => {
    updatePerson(p.id, (x) => {
      const c = { ...x.celebrated };
      if (wished) delete c[wishYear];
      else c[wishYear] = new Date().toISOString();
      return { ...x, celebrated: c };
    });
    if (!wished) {
      haptic('success');
      confetti();
      toast(`Bravo, ${firstName(p)} est souhaité·e ! 🎉`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View style={[s.blob, { width: 260, height: 260, top: -80, right: -90 }]} />
          <View style={[s.blob, { width: 160, height: 160, bottom: -50, left: -60, opacity: 0.1 }]} />
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton icon="chevron-back" tone="glass" label="Retour" onPress={() => router.back()} />
            <Row gap={8}>
              <IconButton icon={p.favorite ? 'star' : 'star-outline'} tone="glass" label="Favori" onPress={() => updatePerson(p.id, (x) => ({ ...x, favorite: !x.favorite }))} />
              <IconButton icon="create-outline" tone="glass" label="Modifier" onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })} />
            </Row>
          </Row>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Ring size={148} stroke={7} progress={1 - days / 365} colors={['#FFFFFF', '#FFFFFFAA']}>
              <Avatar person={p} size={118} />
            </Ring>
            <Text style={s.name} numberOfLines={2}>{p.name}</Text>
            <Text style={s.sub}>{KINDS[p.kind].emoji} {occasionLabel(p, today)}{p.relation ? ` · ${p.relation}` : ''}</Text>
            <View style={s.countdown}>
              <Text style={s.countdownText}>
                {days === 0 ? '🎉 C’est aujourd’hui !' : `${formatCountdown(days)} · ${formatDate(next)}`}
              </Text>
            </View>
          </View>
          <Row gap={10} style={{ justifyContent: 'center', marginTop: 18 }}>
            <HeaderAction icon="chatbubble-ellipses" label="Message" onPress={() => setTab('message')} />
            {!!p.phone && <HeaderAction icon="call" label="Appeler" onPress={() => Linking.openURL(`tel:${p.phone.replace(/[^\d+]/g, '')}`).catch(() => {})} />}
            {p.kind !== 'memorial' && <HeaderAction icon="color-palette" label="Carte" onPress={() => router.push({ pathname: '/card/[id]', params: { id: p.id } })} />}
            {p.kind !== 'memorial' && <HeaderAction icon={wished ? 'checkmark-done-circle' : 'checkmark-circle-outline'} label={wished ? 'Souhaité' : 'Souhaité ?'} active={wished} onPress={toggleWished} />}
          </Row>
        </LinearGradient>

        <View style={[s.tabs, { backgroundColor: t.surface2 }]}>
          {(p.kind === 'memorial' ? (['message', 'profile'] as Tab[]) : (['gifts', 'message', 'profile'] as Tab[])).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.tabItem, tab === k && { backgroundColor: t.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 }]}>
              <Text style={{ fontFamily: tab === k ? FONTS.bodyBold : FONTS.bodySemi, color: tab === k ? t.text : t.muted, fontSize: 13.5 }}>
                {k === 'gifts' ? '🎁 Cadeaux' : k === 'message' ? (p.kind === 'memorial' ? '🤍 Pensée' : '💌 Message') : '✨ Profil'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 18 }}>
          {tab === 'gifts' && <GiftsTab p={p} year={year} />}
          {tab === 'message' && <MessageTab p={p} wished={wished} onWished={() => !wished && toggleWished()} />}
          {tab === 'profile' && <ProfileTab p={p} />}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderAction({ icon, label, onPress, active }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Tap onPress={onPress} style={{ alignItems: 'center', gap: 5, width: 72 }}>
      <View style={[s.actionBubble, active && { backgroundColor: '#fff' }]}>
        <Ionicons name={icon} size={22} color={active ? '#14A06F' : '#fff'} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </Tap>
  );
}

// ---------------------------------------------------------------- Cadeaux

function GiftsTab({ p, year }: { p: Person; year: string }) {
  const t = useTheme();
  const toast = useToast();
  const { updatePerson } = useStore();
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const bought = !!p.giftBought[year];
  const current = p.gifts.filter((g) => g.status !== 'given' || g.year === Number(year));
  const spent = p.gifts.filter((g) => g.year === Number(year) && g.status !== 'idea').reduce((s, g) => s + (g.price ?? 0), 0);
  const suggestions = suggestGifts(p);
  const history = giftHistory(p).filter((g) => g.year !== Number(year));

  const setGifts = (fn: (gifts: GiftIdea[]) => GiftIdea[], extra?: Partial<Person>) => updatePerson(p.id, (x) => ({ ...x, ...extra, gifts: fn(x.gifts) }));

  const add = (label: string, cost?: number) => {
    const clean = label.trim();
    if (!clean) return;
    const n = cost ?? (price ? Number(price.replace(',', '.')) : null);
    setGifts((gs) => [...gs, { id: uid(), text: clean, status: 'idea', price: n != null && Number.isFinite(n) ? n : null, url: '', year: null }]);
    setText('');
    setPrice('');
    haptic('light');
  };

  const cycle = (gift: GiftIdea) => {
    const nextStatus = STATUS[gift.status].next;
    const becomesBought = nextStatus !== 'idea';
    setGifts(
      (gs) => gs.map((x) => (x.id === gift.id ? { ...x, status: nextStatus, year: becomesBought ? Number(year) : null } : x)),
      becomesBought && !p.giftBought[year] ? { giftBought: { ...p.giftBought, [year]: new Date().toISOString() } } : undefined,
    );
    haptic(nextStatus === 'given' ? 'success' : 'light');
    if (nextStatus === 'bought') toast('Cadeau acheté ✓ Plus de rappel cadeau cette année');
    if (nextStatus === 'given') toast('Offert ! Il rejoint l’historique 💝');
  };

  return (
    <View>
      <Card style={{ marginTop: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h2">Cadeau {year}</Txt>
            <Txt variant="small" muted>{bought ? 'Prêt ! Plus de rappel cadeau cette année.' : p.giftReminder ? 'Je te rappellerai de l’acheter à temps.' : 'Rappel cadeau désactivé.'}</Txt>
          </View>
          <Tap onPress={() => updatePerson(p.id, (x) => {
            const gb = { ...x.giftBought };
            if (bought) delete gb[year];
            else gb[year] = new Date().toISOString();
            return { ...x, giftBought: gb };
          })}
          >
            <Pill label={bought ? 'Prêt' : 'À trouver'} tone={bought ? 'ok' : 'accent'} icon={bought ? 'checkmark-circle' : 'search'} />
          </Tap>
        </Row>
        {p.budget != null && (
          <View style={{ marginTop: 14 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Txt variant="caption">Budget</Txt>
              <Txt variant="caption" color={spent > p.budget ? t.danger : t.muted}>{spent} € / {p.budget} €</Txt>
            </Row>
            <ProgressBar value={p.budget ? spent / p.budget : 0} color={spent > p.budget ? t.danger : undefined} />
          </View>
        )}
      </Card>

      <SectionHeader title="Idées & achats" style={{ marginTop: 8 }} />
      {current.length === 0 && <Txt muted style={{ marginBottom: 10 }}>Aucune idée pour l’instant. Pioche dans les suggestions ci-dessous !</Txt>}
      {current.map((gift) => (
        <View key={gift.id} style={[s.giftRow, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Tap onPress={() => cycle(gift)} scale={0.9}>
            <View style={[s.statusBubble, { backgroundColor: gift.status === 'idea' ? t.surface2 : gift.status === 'given' ? t.accentSoft : t.okSoft }]}>
              <Ionicons name={STATUS[gift.status].icon} size={18} color={gift.status === 'idea' ? t.muted : gift.status === 'given' ? t.accent : t.ok} />
            </View>
          </Tap>
          <View style={{ flex: 1 }}>
            <Txt variant="bodySemi" style={gift.status === 'given' ? { textDecorationLine: 'line-through', color: t.muted } : undefined}>{gift.text}</Txt>
            <Txt variant="caption">{STATUS[gift.status].label}{gift.price != null ? ` · ${gift.price} €` : ''} · touche l’icône pour avancer</Txt>
          </View>
          {!!gift.url && <IconButton icon="open-outline" size={34} label="Ouvrir le lien" onPress={() => Linking.openURL(gift.url).catch(() => {})} />}
          <Pressable hitSlop={10} onPress={() => setGifts((gs) => gs.filter((x) => x.id !== gift.id))} accessibilityLabel="Supprimer">
            <Ionicons name="close" size={18} color={t.faint} />
          </Pressable>
        </View>
      ))}
      <View style={[s.addRow, { backgroundColor: t.surface, borderColor: t.border }]}>
        <TextInput value={text} onChangeText={setText} placeholder="Nouvelle idée…" placeholderTextColor={t.faint} onSubmitEditing={() => add(text)} returnKeyType="done"
          style={{ flex: 1, color: t.text, fontFamily: FONTS.body, fontSize: 15, paddingVertical: 12 }} />
        <TextInput value={price} onChangeText={setPrice} placeholder="€" placeholderTextColor={t.faint} keyboardType="decimal-pad"
          style={{ width: 54, color: t.text, fontFamily: FONTS.body, fontSize: 15, textAlign: 'right', paddingVertical: 12 }} />
        <IconButton icon="add" tone="accent" size={36} label="Ajouter l’idée" onPress={() => add(text)} />
      </View>

      <SectionHeader title={`Suggestions pour ${firstName(p)}`} />
      {!p.interests.length && (
        <Tap onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })}>
          <Card style={{ borderStyle: 'dashed', borderColor: t.accent, backgroundColor: t.accentSoft }}>
            <Txt variant="bodySemi" color={t.accent}>✨ Ajoute ses centres d’intérêt pour des idées sur-mesure</Txt>
          </Card>
        </Tap>
      )}
      <Wrap>
        {suggestions.map((idea) => (
          <Tap key={idea.text} onPress={() => { add(idea.text, idea.price); toast(`Ajouté : ${idea.text}`); }} scale={0.95}>
            <View style={[s.suggest, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Ionicons name="add-circle" size={16} color={t.accent} />
              <Text style={{ color: t.text, fontFamily: FONTS.bodySemi, fontSize: 13 }}>{idea.text}</Text>
              <Text style={{ color: t.muted, fontFamily: FONTS.body, fontSize: 12 }}>~{idea.price} €</Text>
            </View>
          </Tap>
        ))}
      </Wrap>

      {history.length > 0 && (
        <>
          <SectionHeader title="Déjà offert" />
          <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            {history.map((gift) => (
              <ListRow key={gift.id} emoji="💝" title={gift.text} subtitle={`${gift.year ?? ''}${gift.price != null ? ` · ${gift.price} €` : ''}`} />
            ))}
          </Card>
          <Txt variant="small" muted>Pour ne jamais offrir deux fois la même chose 😉</Txt>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Message

function MessageTab({ p, wished, onWished }: { p: Person; wished: boolean; onWished: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const { bumpMeta } = useStore();
  const [tone, setTone] = useState<Tone>(suggestedTone(p));
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(() => wishMessage(p, suggestedTone(p), 0));
  const tones = tonesFor(p);
  const nameDaySoon = p.nameDay && daysUntil(p.nameDay) <= 3;

  useEffect(() => {
    setText(wishMessage(p, tone, index));
  }, [tone, index]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (channel: Channel) => {
    const ok = await sendMessage(channel, p, text);
    if (!ok) return toast(channel === 'share' ? 'Partage annulé' : 'Impossible d’ouvrir l’application');
    bumpMeta('messagesSent');
    const d = daysUntil(p);
    const since = daysBetween(lastOccurrence(p), new Date());
    if (!wished && (d <= 1 || since <= 10)) {
      setTimeout(() => {
        onWished();
      }, 800);
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      {nameDaySoon && (
        <Tap onPress={() => setText(nameDayMessage(p))}>
          <Card style={{ backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
            <Txt variant="bodySemi" color={t.accent}>🌷 Sa fête approche ({formatDayMonth(p.nameDay!)}) : touche pour un message de fête</Txt>
          </Card>
        </Tap>
      )}
      {tones.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18, marginBottom: 12 }}>
          {tones.map((k) => <Chip key={k} label={TONES[k].label} icon={TONES[k].emoji} selected={tone === k} onPress={() => { setTone(k); setIndex(0); }} />)}
        </ScrollView>
      )}
      <View style={[s.messageBox, { backgroundColor: t.surface, borderColor: t.border }]}>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          style={{ color: t.text, fontFamily: FONTS.body, fontSize: 16, lineHeight: 23, minHeight: 110, textAlignVertical: 'top' }}
        />
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Tap onPress={() => setIndex((i) => (i + 1) % Math.max(1, wishCount(p, tone)))}>
            <Row gap={6}><Ionicons name="shuffle" size={16} color={t.accent} /><Txt variant="caption" color={t.accent}>Autre formulation</Txt></Row>
          </Tap>
          <Tap onPress={async () => { await Clipboard.setStringAsync(text); toast('Message copié 📋'); }}>
            <Row gap={6}><Ionicons name="copy-outline" size={16} color={t.muted} /><Txt variant="caption">Copier</Txt></Row>
          </Tap>
        </Row>
      </View>
      <Txt variant="label" style={{ marginTop: 18, marginBottom: 10 }}>Envoyer</Txt>
      <Wrap gap={10}>
        {!!p.phone && <SendButton icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={() => send('whatsapp')} />}
        {!!p.phone && <SendButton icon="chatbubble" label="SMS" color="#1E7BFF" onPress={() => send('sms')} />}
        {!!p.email && <SendButton icon="mail" label="E-mail" color="#F2A20C" onPress={() => send('mail')} />}
        <SendButton icon="share-social" label="Autre app" color="#7C5CFF" onPress={() => send('share')} />
      </Wrap>
      {!p.phone && !p.email && <Txt variant="small" muted style={{ marginTop: 10 }}>Ajoute son numéro dans la fiche pour envoyer directement par SMS ou WhatsApp.</Txt>}
      {p.kind !== 'memorial' && (
        <Button title="Créer une jolie carte" icon="color-palette" variant="soft" style={{ marginTop: 18 }} onPress={() => router.push({ pathname: '/card/[id]', params: { id: p.id } })} />
      )}
    </View>
  );
}

function SendButton({ icon, label, color, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} style={{ flexGrow: 1, flexBasis: '45%' }}>
      <View style={[s.send, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={[s.sendIcon, { backgroundColor: color }]}><Ionicons name={icon} size={18} color="#fff" /></View>
        <Txt variant="bodySemi">{label}</Txt>
      </View>
    </Tap>
  );
}

// ---------------------------------------------------------------- Profil

function ProfileTab({ p }: { p: Person }) {
  const t = useTheme();
  const { updatePerson, settings } = useStore();
  const today = new Date();
  const age = currentAge(p, today);
  const nextAge = ageAtNext(p, today);
  const z = zodiacSign(p.month, p.day);
  const cz = chineseZodiac(p.year);
  const years = Object.keys(p.celebrated).sort().reverse();

  const facts: [string, string][] = p.kind === 'birthday'
    ? [
      ...(age != null ? [['Âge', `${age} ans`] as [string, string]] : []),
      ...(nextAge != null ? [['Prochain', `${nextAge} ans`] as [string, string]] : []),
      ['Signe', `${z.emoji} ${z.name}`],
      ...(cz ? [['Signe chinois', `${cz.emoji} ${cz.name}`] as [string, string]] : []),
      ...(p.year ? [['Né·e un', bornWeekday(p) ?? '']] as [string, string][] : []),
      ...(p.year ? [['Jours vécus', fmtInt(daysAlive(p, today) ?? 0)]] as [string, string][] : []),
      ['Pierre', birthstone(p.month)],
      ['Fleur', birthFlower(p.month)],
      ...(p.nameDay ? [['Fête', `🌷 ${formatDayMonth(p.nameDay)}`]] as [string, string][] : []),
    ]
    : [
      ['Date', `${formatDayMonth(p)}${p.year ? ` ${p.year}` : ''}`],
      ...(nextAge ? [['Cette année', occasionLabel(p, today)]] as [string, string][] : []),
      ...(p.kind === 'wedding' && nocesName(nextAge) ? [['Noces', nocesName(nextAge)!]] as [string, string][] : []),
    ];

  return (
    <View style={{ marginTop: 16 }}>
      <View style={s.facts}>
        {facts.map(([k, v]) => (
          <View key={k} style={[s.fact, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Txt variant="caption">{k}</Txt>
            <Txt variant="h3" numberOfLines={1}>{v}</Txt>
          </View>
        ))}
      </View>

      {!!p.notes && (
        <Card><Txt variant="caption" style={{ marginBottom: 4 }}>Notes</Txt><Txt>{p.notes}</Txt></Card>
      )}
      {p.interests.length > 0 && (
        <Card>
          <Txt variant="caption" style={{ marginBottom: 8 }}>Centres d’intérêt</Txt>
          <Wrap gap={6}>
            {p.interests.map((i) => {
              const it = INTERESTS.find((x) => x.id === i);
              return <Pill key={i} label={`${it?.emoji ?? ''} ${it?.label ?? i}`} tone="accent" />;
            })}
          </Wrap>
        </Card>
      )}
      {!!(p.phone || p.email) && (
        <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          {!!p.phone && <ListRow icon="call" color={t.ok} title={p.phone} subtitle="Appeler" onPress={() => Linking.openURL(`tel:${p.phone.replace(/[^\d+]/g, '')}`).catch(() => {})} />}
          {!!p.email && <ListRow icon="mail" color="#F2A20C" title={p.email} subtitle="Écrire un e-mail" onPress={() => Linking.openURL(`mailto:${p.email}`).catch(() => {})} />}
        </Card>
      )}

      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <ListRow icon="people" color="#7C5CFF" title="Groupe" subtitle={p.group} />
        <ListRow
          icon="notifications"
          color={t.accent}
          title="Rappels"
          subtitle={(p.reminders ?? settings.reminders).map((d) => (d === 0 ? 'jour J' : `J-${d}`)).join(', ') || 'Aucun'}
          onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })}
        />
        {p.kind !== 'memorial' && (
          <ToggleRow icon="gift" color="#FF8A5B" title="Rappel pour le cadeau" subtitle="Tant qu’il n’est pas acheté" value={p.giftReminder}
            onValueChange={(v) => updatePerson(p.id, (x) => ({ ...x, giftReminder: v }))} />
        )}
      </Card>

      {years.length > 0 && (
        <Card>
          <Txt variant="caption" style={{ marginBottom: 8 }}>Historique des vœux</Txt>
          <Wrap gap={6}>{years.map((y) => <Pill key={y} label={`✓ ${y}`} tone="ok" />)}</Wrap>
        </Card>
      )}
      <Txt variant="small" muted center style={{ marginTop: 6 }}>Ajouté·e le {formatLongDate(new Date(p.createdAt))}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 26, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.14 },
  name: { color: '#fff', fontFamily: FONTS.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, marginTop: 14, textAlign: 'center' },
  sub: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 15, opacity: 0.95, marginTop: 4, textAlign: 'center' },
  countdown: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 12 },
  countdownText: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 13.5, textTransform: 'none' },
  actionBubble: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  actionLabel: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 11.5 },
  tabs: { flexDirection: 'row', borderRadius: 16, padding: 4, marginHorizontal: 18, marginTop: 18 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 13 },
  giftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 8 },
  statusBubble: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 18, paddingLeft: 14, paddingRight: 6, borderStyle: 'dashed' },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9 },
  messageBox: { borderWidth: 1, borderRadius: 22, padding: 16 },
  send: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 12 },
  sendIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  fact: { flexGrow: 1, flexBasis: '30%', borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
});
