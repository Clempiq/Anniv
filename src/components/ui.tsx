import type { ReactNode } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps,
  type TextStyle, type ViewStyle,
} from 'react-native';

import {
  ageAtNext, daysUntil, formatDayMonth, isGiftBought, isMilestone, nextBirthday, WEEKDAYS, type Person,
} from '../lib/birthdays';
import { avatarColor, useTheme } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>
  );
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[styles.h2, { color: t.text }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.muted, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.text, fontSize: 16, lineHeight: 22 }, style]}>{children}</Text>;
}

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = 'default', small, style, ...rest }: ButtonProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'ghost' ? 'transparent' : t.surface;
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.text;
  const border = variant === 'primary' ? t.accent : variant === 'danger' ? t.danger : t.border;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.7 : rest.disabled ? 0.45 : 1 },
        style,
      ]}
      {...rest}
    >
      <Text style={{ color: fg, fontWeight: variant === 'primary' ? '700' : '500', fontSize: small ? 14 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.accent : t.surface }]}
    >
      <Text style={{ color: selected ? t.onAccent : t.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Field({ label, style, containerStyle, ...props }: TextInputProps & { label: string; containerStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      <Text style={{ color: t.muted, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <TextInput
        placeholderTextColor={t.muted}
        style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.border }, style]}
        {...props}
      />
    </View>
  );
}

export function Avatar({ person, size = 46 }: { person: Pick<Person, 'name' | 'emoji'>; size?: number }) {
  const t = useTheme();
  const initials = person.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: person.emoji ? t.surface2 : avatarColor(person.name),
      }}
    >
      <Text style={{ fontSize: person.emoji ? size * 0.52 : size * 0.36, color: '#fff', fontWeight: '700' }}>
        {person.emoji || initials}
      </Text>
    </View>
  );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'gold' | 'accent' }) {
  const t = useTheme();
  const bg = tone === 'gold' ? t.goldSoft : tone === 'accent' ? t.accentSoft : t.surface2;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 11, color: tone === 'default' ? t.muted : t.text, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function PersonRow({ person, onPress, today = new Date(), compact }: {
  person: Person; onPress: () => void; today?: Date; compact?: boolean;
}) {
  const t = useTheme();
  const days = daysUntil(person, today);
  const age = ageAtNext(person, today);
  const next = nextBirthday(person, today);
  const giftPending = person.giftReminder && days <= 30 && !isGiftBought(person, today);
  const sub = [
    `${WEEKDAYS[next.getDay()]} ${formatDayMonth(person)}`,
    age != null ? `${days === 0 ? 'fête ses' : 'aura'} ${age} ans` : null,
  ].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, ${sub}, dans ${days} jours`}
      style={({ pressed }) => [
        styles.person,
        compact && { paddingVertical: 8 },
        {
          backgroundColor: days === 0 ? t.accentSoft : t.surface,
          borderColor: days === 0 ? t.accent : t.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Avatar person={person} size={compact ? 38 : 46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>{person.name}</Text>
        <Muted style={{ fontSize: 13 }}>{sub}</Muted>
        {!compact && (
          <View style={[styles.row, { gap: 4, marginTop: 4 }]}>
            <Badge label={person.group} />
            {isMilestone(age) && <Badge label="⭐ âge rond" tone="gold" />}
            {giftPending && <Badge label="🎁 cadeau à acheter" tone="accent" />}
            {person.giftReminder && isGiftBought(person, today) && <Badge label="✅ cadeau prêt" />}
          </View>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
        <Text style={{ fontSize: days === 0 ? 24 : 20, fontWeight: '800', color: days > 0 && days <= 7 ? t.accent : t.text, fontVariant: ['tabular-nums'] }}>
          {days === 0 ? '🎂' : days}
        </Text>
        <Muted style={{ fontSize: 11 }}>{days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : 'jours'}</Muted>
      </View>
    </Pressable>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <Text style={{ fontSize: 52 }}>{emoji}</Text>
      <Muted style={{ textAlign: 'center', fontSize: 16 }}>{title}</Muted>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  btn: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  chip: { borderWidth: 1, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
});
