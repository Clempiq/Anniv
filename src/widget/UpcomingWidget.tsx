// Widget d'écran d'accueil Android : prochain anniversaire en grand + les suivants.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { firstName, formatDayMonth, KINDS, occasionLabel, sortByUpcoming, type Person } from '../lib/birthdays';

type Hex = `#${string}`;

const GRADIENTS: [Hex, Hex][] = [
  ['#FF4D6D', '#FF8A5B'], ['#7C5CFF', '#C86BFA'], ['#1E7BFF', '#00C6D7'], ['#0FA37F', '#7ED957'], ['#FF7A00', '#FFC233'],
];
const ACCENT_INDEX: Record<string, number> = { corail: 0, lavande: 1, ocean: 2, foret: 3, soleil: 4 };

const DISPLAY = 'BricolageGrotesque_800ExtraBold';
const BODY = 'PlusJakartaSans_700Bold';

function countdown(days: number): string {
  if (days === 0) return 'Aujourd’hui 🎉';
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

export function UpcomingWidget({ people, accent = 'corail', width = 320 }: { people: Person[]; accent?: string; width?: number }) {
  const [from, to] = GRADIENTS[ACCENT_INDEX[accent] ?? 0];
  const upcoming = sortByUpcoming(people).slice(0, 4);
  const compact = width < 250;

  if (!upcoming.length) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundGradient: { from, to, orientation: 'TL_BR' }, borderRadius: 24, padding: 16, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text="🎂" style={{ fontSize: 30 }} />
        <TextWidget text="Ajoute des anniversaires dans Anniv" style={{ fontSize: 14, color: '#FFFFFF', fontFamily: BODY, textAlign: 'center' }} />
      </FlexWidget>
    );
  }

  const [hero, ...rest] = upcoming;
  const p = hero.person;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `anniv:///person/${p.id}` }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundGradient: { from, to, orientation: 'TL_BR' }, borderRadius: 24, padding: 14, flexDirection: 'column' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={`${KINDS[p.kind].emoji}  ${countdown(hero.days).toUpperCase()}`} style={{ fontSize: 11, color: '#FFFFFF', fontFamily: BODY, letterSpacing: 0.08 }} />
          <TextWidget text={p.name} maxLines={1} truncate="END" style={{ fontSize: compact ? 20 : 24, color: '#FFFFFF', fontFamily: DISPLAY }} />
          <TextWidget text={`${occasionLabel(p)} · ${formatDayMonth(p)}`} maxLines={1} truncate="END" style={{ fontSize: 12, color: '#FFFFFF', fontFamily: BODY }} />
        </FlexWidget>
        <FlexWidget style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255, 255, 255, 0.25)', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <TextWidget text={hero.days === 0 ? '🎉' : String(hero.days)} style={{ fontSize: hero.days === 0 ? 26 : 24, color: '#FFFFFF', fontFamily: DISPLAY }} />
          {hero.days > 0 ? <TextWidget text={hero.days === 1 ? 'JOUR' : 'JOURS'} style={{ fontSize: 8, color: '#FFFFFF', fontFamily: BODY }} /> : null}
        </FlexWidget>
      </FlexWidget>
      {!compact && rest.length > 0 ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 }}>
          {rest.map(({ person, days }) => (
            <FlexWidget
              key={person.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `anniv:///person/${person.id}` }}
              style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingVertical: 3 }}
            >
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget text={`${person.emoji || KINDS[person.kind].emoji} ${firstName(person)}`} maxLines={1} truncate="END" style={{ fontSize: 13, color: '#FFFFFF', fontFamily: BODY }} />
              </FlexWidget>
              <TextWidget text={days === 0 ? 'auj.' : days === 1 ? 'demain' : `J-${days}`} style={{ fontSize: 13, color: '#FFFFFF', fontFamily: DISPLAY }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
