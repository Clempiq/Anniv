import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConfetti } from '../../components/Confetti';
import {
  Avatar, Button, Card, Empty, FadeIn, GradientCard, IconButton, PersonRow, Pill, Ring, Row, SectionHeader, Tap, Txt,
} from '../../components/ui';
import {
  birthdayInYear, capitalize, daysBetween, daysUntil, firstName, formatCountdown, formatDate, formatDayMonth, isGiftBought, KINDS,
  nextBirthday, occasionLabel, pendingIdeas, sortByUpcoming, startOfDay, type Person,
} from '../../lib/birthdays';
import { upcomingHolidays } from '../../lib/calendarfr';
import { demoPeople } from '../../lib/demo';
import { recentMissed, upcomingDayMilestones, wishStreak } from '../../lib/insights';
import { useStore } from '../../lib/store';
import { FONTS, personGradient, useTheme } from '../../theme';

let celebratedThisSession = false;

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const confetti = useConfetti();
  const { people, settings, importPeople } = useStore();
  const now = new Date();
  const today = startOfDay(now);

  const upcoming = useMemo(() => sortByUpcoming(people, today), [people]); // eslint-disable-line react-hooks/exhaustive-deps
  const hero = upcoming[0];
  const todays = upcoming.filter((u) => u.days === 0);
  const week = upcoming.filter((u) => u.days > 0 && u.days <= 7 && u.person.id !== hero?.person.id);
  const missed = recentMissed(people, today);
  const giftsTodo = upcoming.filter((u) => u.days <= 30 && u.person.giftReminder && !isGiftBought(u.person, today)).slice(0, 3);
  const streak = wishStreak(people, today);
  const isMyBirthday = !!settings.userBirthday && daysBetween(today, birthdayInYear(settings.userBirthday, today.getFullYear())) === 0;

  const nameDays = people
    .filter((p) => p.nameDay && p.kind === 'birthday')
    .map((p) => ({ p, days: daysUntil(p.nameDay!, today) }))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days);
  const specials = [
    ...upcomingHolidays(today)
      .map(({ holiday, date }) => ({ holiday, date, days: daysBetween(today, date), who: people.filter((p) => holiday.relations.includes(p.relation)) }))
      .filter((h) => h.days <= 30 && h.who.length)
      .map((h) => ({ key: h.holiday.id, emoji: h.holiday.emoji, title: h.holiday.name, sub: `${formatCountdown(h.days)} · ${h.who.map((p) => firstName(p)).join(', ')}`, id: h.who[0].id })),
    ...upcomingDayMilestones(people, today, 60).map((m) => ({
      key: `${m.person.id}${m.label}`, emoji: '✨', title: `${firstName(m.person)} : ${m.label}`, sub: `${formatCountdown(m.days)} · ${formatDate(m.date)}`, id: m.person.id,
    })),
  ];

  const fired = useRef(false);
  useEffect(() => {
    if ((todays.length || isMyBirthday) && !celebratedThisSession && !fired.current) {
      fired.current = true;
      celebratedThisSession = true;
      setTimeout(confetti, 600);
    }
  }, [todays.length, isMyBirthday, confetti]);

  const open = (p: Person, compose?: boolean) => router.push({ pathname: '/person/[id]', params: compose ? { id: p.id, compose: '1' } : { id: p.id } });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient colors={[t.accentSoft, t.bg]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption">{capitalize(formatDate(now))}</Txt>
            <Txt variant="title">{greeting(now)}{settings.userName ? ` ${settings.userName}` : ''} 👋</Txt>
          </View>
          <IconButton icon="search" label="Rechercher" onPress={() => router.push('/search')} />
        </Row>

        {isMyBirthday && (
          <FadeIn>
            <GradientCard colors={['#FF4D6D', '#7C5CFF']}>
              <Text style={{ fontSize: 44 }}>🥳</Text>
              <Text style={s.heroTitle}>Joyeux anniversaire{settings.userName ? ` ${settings.userName}` : ''} !</Text>
              <Text style={s.heroSub}>Aujourd’hui c’est toi la star. Profite de chaque minute, tu le mérites.</Text>
            </GradientCard>
          </FadeIn>
        )}

        {!people.length ? (
          <Card>
            <Empty emoji="🎈" title="Ton carnet est vide" subtitle="Ajoute les anniversaires de tes proches : je m’occupe de te les rappeler, de te souffler des idées de cadeaux et même d’écrire le message.">
              <Button title="Ajouter un anniversaire" icon="add" variant="primary" onPress={() => router.push('/edit')} style={{ alignSelf: 'stretch' }} />
              <Button title="Importer mes contacts" icon="people" onPress={() => router.push('/import-contacts')} style={{ alignSelf: 'stretch' }} />
              <Button title="Essayer avec des exemples" variant="soft" onPress={() => importPeople(demoPeople())} style={{ alignSelf: 'stretch' }} />
            </Empty>
          </Card>
        ) : (
          <>
            {hero && <Hero person={hero.person} days={hero.days} onOpen={() => open(hero.person)} onCompose={() => open(hero.person, true)} others={todays.length - 1} />}

            <FadeIn delay={120}>
              <Row gap={10} style={{ marginBottom: 4 }}>
                <MiniStat icon="calendar" value={String(upcoming.filter((u) => u.days <= 7).length)} label="cette semaine" onPress={() => router.navigate('/agenda')} />
                <MiniStat icon="gift" value={String(upcoming.filter((u) => u.days <= 30 && u.person.giftReminder && !isGiftBought(u.person, today)).length)} label="cadeaux à trouver" onPress={() => router.navigate('/gifts')} />
                <MiniStat icon="flame" value={String(streak)} label="série de vœux" onPress={() => router.navigate('/me')} />
              </Row>
            </FadeIn>

            {missed.length > 0 && (
              <FadeIn delay={180}>
                <SectionHeader title="Il n’est pas trop tard 🙈" />
                {missed.map(({ person, daysAgo }) => (
                  <Card key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderColor: t.warn + '66' }} padded={false}>
                    <Avatar person={person} size={44} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="h3">{person.name}</Txt>
                      <Txt variant="small" muted>{daysAgo === 1 ? 'C’était hier' : `C’était il y a ${daysAgo} jours`} · pas encore souhaité</Txt>
                    </View>
                    <Button small title="Rattraper" variant="primary" onPress={() => open(person, true)} />
                  </Card>
                ))}
              </FadeIn>
            )}

            {week.length > 0 && (
              <FadeIn delay={220}>
                <SectionHeader title="Cette semaine" action="Tout voir" onAction={() => router.navigate('/agenda')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
                  {week.map(({ person, days }) => (
                    <Tap key={person.id} onPress={() => open(person)}>
                      <LinearGradient colors={personGradient(person.name)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.weekCard}>
                        <Avatar person={person} size={46} ring />
                        <Text numberOfLines={1} style={s.weekName}>{firstName(person)}</Text>
                        <Text style={s.weekSub}>{occasionLabel(person, today)}</Text>
                        <View style={s.weekDays}>
                          <Text style={s.weekDaysText}>{days === 1 ? 'Demain' : `J-${days}`}</Text>
                        </View>
                      </LinearGradient>
                    </Tap>
                  ))}
                </ScrollView>
              </FadeIn>
            )}

            {giftsTodo.length > 0 && (
              <FadeIn delay={260}>
                <SectionHeader title="Cadeaux à préparer" action="Gérer" onAction={() => router.navigate('/gifts')} />
                <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                  {giftsTodo.map(({ person, days }, i) => {
                    const ideas = pendingIdeas(person);
                    return (
                      <Tap key={person.id} onPress={() => open(person)} scale={0.98}>
                        <Row gap={12} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderColor: t.border }]}>
                          <Avatar person={person} size={40} />
                          <View style={{ flex: 1 }}>
                            <Txt variant="h3">{person.name}</Txt>
                            <Txt variant="small" muted numberOfLines={1}>{ideas.length ? `💡 ${ideas.map((g) => g.text).join(' · ')}` : '💡 Des idées t’attendent dans la fiche'}</Txt>
                          </View>
                          <Pill label={days === 0 ? 'Aujourd’hui' : `J-${days}`} tone={days <= 7 ? 'accent' : 'default'} />
                        </Row>
                      </Tap>
                    );
                  })}
                </Card>
              </FadeIn>
            )}

            {(nameDays.length > 0 || specials.length > 0) && (
              <FadeIn delay={300}>
                <SectionHeader title="Moments spéciaux" />
                <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                  {[...nameDays.map(({ p, days }) => ({ key: `f${p.id}`, emoji: '🌷', title: `Fête de ${firstName(p)}`, sub: `${formatCountdown(days)} · ${formatDayMonth(p.nameDay!)}`, id: p.id })), ...specials].map((x, i) => (
                    <Tap key={x.key} onPress={() => router.push({ pathname: '/person/[id]', params: { id: x.id } })} scale={0.98}>
                      <Row gap={12} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderColor: t.border }]}>
                        <View style={[s.emojiBubble, { backgroundColor: t.surface2 }]}><Text style={{ fontSize: 20 }}>{x.emoji}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Txt variant="h3">{x.title}</Txt>
                          <Txt variant="small" muted>{x.sub}</Txt>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={t.faint} />
                      </Row>
                    </Tap>
                  ))}
                </Card>
              </FadeIn>
            )}

            <FadeIn delay={340}>
              <SectionHeader title="Prochainement" action="Agenda" onAction={() => router.navigate('/agenda')} />
              {upcoming.filter((u) => u.days > 7).slice(0, 5).map(({ person }) => (
                <PersonRow key={person.id} person={person} today={today} onPress={() => open(person)} />
              ))}
            </FadeIn>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Hero({ person, days, onOpen, onCompose, others }: { person: Person; days: number; onOpen: () => void; onCompose: () => void; others: number }) {
  const g = personGradient(person.name);
  const next = nextBirthday(person);
  const isToday = days === 0;
  return (
    <FadeIn>
      <Tap onPress={onOpen} scale={0.98}>
        <GradientCard colors={g} style={{ padding: 22 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Pill label={isToday ? 'C’est aujourd’hui !' : 'Prochain événement'} tone="glass" icon={isToday ? 'sparkles' : 'time'} />
              <Row gap={10} style={{ marginTop: 14 }}>
                <Avatar person={person} size={36} ring />
                <Text style={[s.heroTitle, { flex: 1 }]} numberOfLines={2}>{person.name}</Text>
              </Row>
              <Text style={s.heroSub}>{KINDS[person.kind].emoji} {occasionLabel(person)}</Text>
              <Text style={[s.heroSub, { opacity: 0.8 }]}>{capitalize(formatDate(next))}</Text>
            </View>
            <Ring size={112} stroke={9} progress={1 - days / 365} colors={['#FFFFFF', '#FFFFFFCC']}>
              {isToday ? <Text style={{ fontSize: 44 }}>🎉</Text> : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.ringNumber}>{days}</Text>
                  <Text style={s.ringLabel}>{days === 1 ? 'JOUR' : 'JOURS'}</Text>
                </View>
              )}
            </Ring>
          </Row>
          <Row gap={10} style={{ marginTop: 18 }}>
            <Tap onPress={onCompose} style={s.glassBtn}>
              <Ionicons name="chatbubble-ellipses" size={17} color="#fff" />
              <Text style={s.glassText}>{isToday ? 'Souhaiter' : 'Préparer un mot'}</Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/card/[id]', params: { id: person.id } })} style={s.glassBtn}>
              <Ionicons name="color-palette" size={17} color="#fff" />
              <Text style={s.glassText}>Carte</Text>
            </Tap>
          </Row>
          {others > 0 && <Text style={[s.heroSub, { marginTop: 12 }]}>+ {others} autre{others > 1 ? 's' : ''} aujourd’hui</Text>}
        </GradientCard>
      </Tap>
    </FadeIn>
  );
}

function MiniStat({ icon, value, label, onPress }: { icon: 'calendar' | 'gift' | 'flame'; value: string; label: string; onPress: () => void }) {
  const t = useTheme();
  const color = icon === 'flame' ? t.warn : icon === 'gift' ? t.accent : t.ok;
  return (
    <Tap onPress={onPress} style={{ flex: 1 }}>
      <View style={[s.mini, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: t.text, marginTop: 6 }}>{value}</Text>
        <Txt variant="caption" numberOfLines={1}>{label}</Txt>
      </View>
    </Tap>
  );
}

const s = StyleSheet.create({
  heroTitle: { color: '#fff', fontFamily: FONTS.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.8 },
  heroSub: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 14.5, marginTop: 4, opacity: 0.95 },
  ringNumber: { color: '#fff', fontFamily: FONTS.display, fontSize: 40, lineHeight: 42 },
  ringLabel: { color: '#fff', fontFamily: FONTS.bodyHeavy, fontSize: 10, letterSpacing: 1.5, opacity: 0.9 },
  glassBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  glassText: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  mini: { borderRadius: 20, borderWidth: 1, padding: 14 },
  weekCard: { width: 138, height: 170, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  weekName: { color: '#fff', fontFamily: FONTS.display, fontSize: 19, marginTop: 8 },
  weekSub: { color: '#fff', fontFamily: FONTS.bodySemi, fontSize: 12.5, opacity: 0.9 },
  weekDays: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  weekDaysText: { color: '#fff', fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  emojiBubble: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
