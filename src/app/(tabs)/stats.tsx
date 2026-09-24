import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Empty, H2, Muted } from '../../components/ui';
import { ageAtNext, formatCountdown, MONTHS, stats } from '../../lib/birthdays';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

export default function Stats() {
  const t = useTheme();
  const { people } = useStore();
  const s = stats(people);

  if (!s.total) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Empty emoji="📊" title="Ajoute des anniversaires pour voir des statistiques." />
      </View>
    );
  }

  const max = Math.max(...s.byMonth, 1);
  const busiest = s.byMonth.indexOf(Math.max(...s.byMonth));

  const HBars = ({ data }: { data: Record<string, number> }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const m = Math.max(...entries.map((e) => e[1]), 1);
    return (
      <View style={{ gap: 8 }}>
        {entries.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: t.text, width: 120, fontSize: 14 }} numberOfLines={1}>{k}</Text>
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: t.surface2 }}>
              <View style={{ width: `${(v / m) * 100}%`, height: 10, borderRadius: 5, backgroundColor: t.accent }} />
            </View>
            <Text style={{ color: t.text, width: 24, textAlign: 'right', fontWeight: '700' }}>{v}</Text>
          </View>
        ))}
      </View>
    );
  };

  const tiles: [string, string][] = [
    [String(s.total), 'anniversaires'],
    [String(s.thisMonth), 'ce mois-ci'],
    [s.avgAge != null ? String(Math.round(s.avgAge)) : '—', 'âge moyen'],
    [MONTHS[busiest], 'mois le plus chargé'],
    [String(s.giftsToBuy), 'cadeaux à acheter (30 j)'],
    [s.budgetNext30 ? `${s.budgetNext30} €` : '—', 'budget des 30 j'],
  ];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {tiles.map(([v, k]) => (
          <View key={k} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', textTransform: 'capitalize' }}>{v}</Text>
            <Muted>{k}</Muted>
          </View>
        ))}
      </View>

      <Card>
        <H2>Répartition par mois</H2>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 4 }}>
          {s.byMonth.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Text style={{ color: t.text, fontSize: 11, fontWeight: '700' }}>{v || ''}</Text>
              <View style={{ width: '80%', height: `${(v / max) * 80}%`, minHeight: 2, backgroundColor: i === new Date().getMonth() ? t.gold : t.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              <Text style={{ color: t.muted, fontSize: 10, marginTop: 4 }}>{MONTHS[i].slice(0, 3)}</Text>
            </View>
          ))}
        </View>
      </Card>

      {s.milestones.length > 0 && (
        <Card>
          <H2>⭐ Âges ronds à venir</H2>
          {s.milestones.map(({ person, days }) => (
            <Pressable key={person.id} onPress={() => router.push(`/person/${person.id}`)} style={{ paddingVertical: 4 }}>
              <Text style={{ color: t.text, fontSize: 15 }}>
                <Text style={{ fontWeight: '700' }}>{person.name}</Text> — {ageAtNext(person)} ans · {formatCountdown(days).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}

      {s.youngest && s.oldest && (
        <Card>
          <H2>👶 / 🧓</H2>
          <Text style={{ color: t.text, fontSize: 15 }}>Plus jeune : <Text style={{ fontWeight: '700' }}>{s.youngest.person.name}</Text> ({s.youngest.age} ans)</Text>
          <Text style={{ color: t.text, fontSize: 15, marginTop: 4 }}>Doyen·ne : <Text style={{ fontWeight: '700' }}>{s.oldest.person.name}</Text> ({s.oldest.age} ans)</Text>
        </Card>
      )}

      <Card><H2>Par groupe</H2><HBars data={s.byGroup} /></Card>
      <Card><H2>Signes astrologiques</H2><HBars data={s.bySign} /></Card>
    </ScrollView>
  );
}
