import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, Tap, Wrap } from '../components/ui';
import { MONTHS_SHORT } from '../lib/birthdays';
import { demoPeople } from '../lib/demo';
import { requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { FONTS, useTheme } from '../theme';

const { width: W } = Dimensions.get('window');

function Floating({ emoji, x, y, size, delay }: { emoji: string; x: number; y: number; size: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2200, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ])).start();
  }, [v, delay]);
  return (
    <Animated.Text style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, fontSize: size, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }] }}>
      {emoji}
    </Animated.Text>
  );
}

export default function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { updateSettings, importPeople, settings } = useStore();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [name, setName] = useState(settings.userName);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [notif, setNotif] = useState(false);

  const go = (n: number) => {
    haptic('light');
    scroll.current?.scrollTo({ x: n * W, animated: true });
    setPage(n);
  };

  const finish = (after?: () => void) => {
    const d = Number(day);
    updateSettings({
      onboarded: true,
      userName: name.trim(),
      userBirthday: month && d >= 1 && d <= new Date(2000, month, 0).getDate() ? { day: d, month, year: null } : settings.userBirthday,
    });
    haptic('success');
    router.replace('/');
    if (after) setTimeout(after, 350);
  };

  const pages = [
    // 1. Bienvenue
    <View key="1" style={s.page}>
      <View style={s.illu}>
        <Floating emoji="🎂" x={34} y={24} size={96} delay={0} />
        <Floating emoji="🎈" x={8} y={8} size={54} delay={300} />
        <Floating emoji="🎁" x={70} y={12} size={50} delay={600} />
        <Floating emoji="✨" x={78} y={58} size={40} delay={900} />
        <Floating emoji="🎉" x={6} y={62} size={46} delay={1200} />
      </View>
      <Text style={s.kicker}>BIENVENUE DANS</Text>
      <Text style={s.brand}>Anniv</Text>
      <Text style={s.lead}>Le carnet qui n’oublie jamais un anniversaire. Ni le cadeau. Ni le petit mot.</Text>
    </View>,
    // 2. Fonctionnalités
    <View key="2" style={s.page}>
      <Text style={s.title}>Tout ce qu’il faut, au bon moment</Text>
      {[
        ['notifications', 'Rappels malins', 'La veille, le jour J, et même le soir si tu as oublié.'],
        ['gift', 'Cadeaux sans stress', 'Idées sur-mesure, budget, et un rappel pour l’acheter à temps.'],
        ['chatbubble-ellipses', 'Le mot juste', 'Messages prêts à envoyer et cartes à partager en un geste.'],
        ['flower', 'Fêtes & grandes dates', 'Fêtes des prénoms, fête des mères, noces d’or, 10 000e jour…'],
      ].map(([icon, title, sub]) => (
        <View key={title} style={s.feature}>
          <View style={s.featureIcon}><Ionicons name={icon as 'gift'} size={22} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.featureTitle}>{title}</Text>
            <Text style={s.featureSub}>{sub}</Text>
          </View>
        </View>
      ))}
    </View>,
    // 3. Profil
    <View key="3" style={s.page}>
      <Text style={s.title}>Et toi, c’est quoi ton petit nom ?</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor="rgba(255,255,255,0.6)" style={s.input} />
      <Text style={[s.featureSub, { marginTop: 22, marginBottom: 10 }]}>Ton anniversaire (pour qu’Anniv te le souhaite aussi 🥳)</Text>
      <Wrap gap={6}>
        {MONTHS_SHORT.map((m, i) => (
          <Tap key={m} onPress={() => setMonth(i + 1)} scale={0.92}>
            <View style={[s.month, month === i + 1 && { backgroundColor: '#fff' }]}>
              <Text style={{ color: month === i + 1 ? t.accent : '#fff', fontFamily: FONTS.bodyBold, fontSize: 13 }}>{m}</Text>
            </View>
          </Tap>
        ))}
      </Wrap>
      <TextInput value={day} onChangeText={setDay} placeholder="Jour (ex. 12)" keyboardType="number-pad" maxLength={2} placeholderTextColor="rgba(255,255,255,0.6)" style={[s.input, { marginTop: 12 }]} />
    </View>,
    // 4. Démarrer
    <View key="4" style={s.page}>
      <Text style={s.title}>On y va{name ? `, ${name.trim()}` : ''} ?</Text>
      <Text style={[s.lead, { marginBottom: 20 }]}>Active les rappels, puis remplis ton carnet en un clin d’œil.</Text>
      <Tap onPress={async () => { setNotif(await requestPermission().catch(() => false)); }}>
        <View style={[s.bigBtn, notif && { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
          <Ionicons name={notif ? 'checkmark-circle' : 'notifications'} size={22} color="#fff" />
          <Text style={s.bigBtnText}>{notif ? 'Rappels activés' : 'Activer les rappels'}</Text>
        </View>
      </Tap>
      <Tap onPress={() => finish(() => router.push('/import-contacts'))}>
        <View style={s.bigBtn}>
          <Ionicons name="people" size={22} color="#fff" />
          <Text style={s.bigBtnText}>Importer depuis mes contacts</Text>
        </View>
      </Tap>
      <Tap onPress={() => finish(() => router.push('/edit'))}>
        <View style={s.bigBtn}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={s.bigBtnText}>Ajouter un premier anniversaire</Text>
        </View>
      </Tap>
      <Tap onPress={() => { importPeople(demoPeople()); finish(); }}>
        <View style={[s.bigBtn, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.5)' }]}>
          <Ionicons name="sparkles" size={22} color="#fff" />
          <Text style={s.bigBtnText}>Découvrir avec des exemples</Text>
        </View>
      </Tap>
    </View>,
  ];

  return (
    <LinearGradient colors={[t.gradient[0], t.gradient[1], '#7C5CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={{ flex: 1 }}
      >
        {pages.map((pg, i) => <ScrollView key={i} style={{ width: W }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{pg}</ScrollView>)}
      </ScrollView>
      <View style={s.footer}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {pages.map((_, i) => <View key={i} style={[s.dot, i === page && s.dotOn]} />)}
        </View>
        {page < pages.length - 1 ? (
          <Tap onPress={() => go(page + 1)}>
            <View style={s.next}>
              <Text style={{ color: t.accent, fontFamily: FONTS.bodyHeavy, fontSize: 15 }}>{page === 0 ? 'C’est parti' : 'Suivant'}</Text>
              <Ionicons name="arrow-forward" size={18} color={t.accent} />
            </View>
          </Tap>
        ) : (
          <Tap onPress={() => finish()}>
            <View style={s.next}>
              <Text style={{ color: t.accent, fontFamily: FONTS.bodyHeavy, fontSize: 15 }}>Terminer</Text>
              <Ionicons name="checkmark" size={18} color={t.accent} />
            </View>
          </Tap>
        )}
      </View>
      {page < pages.length - 1 && (
        <Tap onPress={() => finish()} style={{ position: 'absolute', top: insets.top + 12, right: 20 }}>
          <Text style={{ color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 14, opacity: 0.9 }}>Passer</Text>
        </Tap>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', paddingVertical: 20 },
  illu: { height: 260, marginBottom: 12 },
  kicker: { color: '#fff', opacity: 0.8, fontFamily: FONTS.bodyHeavy, letterSpacing: 3, fontSize: 12 },
  brand: { color: '#fff', fontFamily: FONTS.display, fontSize: 72, lineHeight: 76, letterSpacing: -3 },
  lead: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 18, lineHeight: 26, opacity: 0.95, marginTop: 8 },
  title: { color: '#fff', fontFamily: FONTS.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, marginBottom: 20 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: '#fff', fontFamily: FONTS.bodyHeavy, fontSize: 16 },
  featureSub: { color: '#fff', fontFamily: FONTS.body, fontSize: 14, opacity: 0.9, lineHeight: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  month: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
  bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  bigBtnText: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { width: 26, backgroundColor: '#fff' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 14 },
});
