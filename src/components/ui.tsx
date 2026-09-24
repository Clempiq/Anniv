import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  Animated, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import {
  ageAtNext, daysBetween, daysUntil, formatDayMonth, isGiftBought, isMilestone, KINDS, nextBirthday, occasionPhrase, WEEKDAYS,
  type Person,
} from '../lib/birthdays';
import { FONTS, personGradient, RADIUS, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------- texte

type Variant = 'hero' | 'title' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySemi' | 'small' | 'caption' | 'label' | 'number';

const VARIANTS: Record<Variant, TextStyle> = {
  hero: { fontFamily: FONTS.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  title: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  h1: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  h2: { fontFamily: FONTS.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  h3: { fontFamily: FONTS.bodyBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  bodySemi: { fontFamily: FONTS.bodySemi, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: FONTS.bodySemi, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  number: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
};

export function Txt({ variant = 'body', color, muted, style, children, numberOfLines, selectable, center }: {
  variant?: Variant; color?: string; muted?: boolean; style?: StyleProp<TextStyle>; children: ReactNode;
  numberOfLines?: number; selectable?: boolean; center?: boolean;
}) {
  const t = useTheme();
  const c = color ?? (muted || variant === 'caption' || variant === 'label' ? t.muted : t.text);
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[VARIANTS[variant], { color: c }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- interactions

export function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable avec rebond (échelle) et retour haptique léger. */
export function Tap({ children, style, onPress, scale = 0.96, hapticFeedback = true, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number; hapticFeedback?: boolean;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(v, { toValue: value, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }).start();
  return (
    <AnimatedPressable
      onPressIn={() => to(scale)}
      onPressOut={() => to(1)}
      onPress={(e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
        if (hapticFeedback) haptic('light');
        onPress?.(e);
      }}
      {...rest}
      style={[style, { transform: [{ scale: v }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Apparition douce (fondu + glissement) au montage. */
export function FadeIn({ children, delay = 0, style, from = 14 }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- boutons

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, icon, variant = 'secondary', small, style, disabled, ...rest }: ButtonProps) {
  const t = useTheme();
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : variant === 'soft' ? t.accent : t.text;
  const inner = (
    <View style={[styles.btnInner, small && styles.btnSmall]}>
      {!!icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg} />}
      <Text style={{ color: fg, fontFamily: FONTS.bodyBold, fontSize: small ? 13.5 : 15.5 }} numberOfLines={1}>{title}</Text>
    </View>
  );
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
      {...rest}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, styles.btnShadow, { shadowColor: t.accent }]}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            variant === 'secondary' && { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
            variant === 'soft' && { backgroundColor: t.accentSoft },
            variant === 'danger' && { backgroundColor: t.surface, borderWidth: 1, borderColor: t.danger + '55' },
          ]}
        >
          {inner}
        </View>
      )}
    </Tap>
  );
}

export function IconButton({ icon, onPress, label, tone = 'surface', size = 42 }: {
  icon: IconName; onPress: () => void; label: string; tone?: 'surface' | 'accent' | 'glass'; size?: number;
}) {
  const t = useTheme();
  const bg = tone === 'accent' ? t.accent : tone === 'glass' ? 'rgba(255,255,255,0.22)' : t.surface;
  const fg = tone === 'surface' ? t.text : '#fff';
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'surface' ? 1 : 0, borderColor: t.border }}
    >
      <Ionicons name={icon} size={size * 0.48} color={fg} />
    </Tap>
  );
}

// ---------------------------------------------------------------- surfaces

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border, shadowColor: t.shadow }, padded && { padding: 18 }, style]}>
      {children}
    </View>
  );
}

export function GradientCard({ colors, children, style }: { colors: [string, string]; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientCard, style]}>
      {/* Bulles décoratives */}
      <View pointerEvents="none" style={[styles.bubble, { width: 180, height: 180, top: -60, right: -50 }]} />
      <View pointerEvents="none" style={[styles.bubble, { width: 110, height: 110, bottom: -40, left: -30, opacity: 0.12 }]} />
      {children}
    </LinearGradient>
  );
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }, style]}>
      <Txt variant="h2">{title}</Txt>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={{ color: t.accent, fontFamily: FONTS.bodyBold, fontSize: 13.5 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- petits éléments

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: string }) {
  const t = useTheme();
  const content = (
    <Text style={{ color: selected ? t.onAccent : t.text, fontFamily: selected ? FONTS.bodyBold : FONTS.bodySemi, fontSize: 13.5 }}>
      {icon ? `${icon} ` : ''}{label}
    </Text>
  );
  return (
    <Tap onPress={onPress} scale={0.94} accessibilityRole="button" accessibilityState={{ selected: !!selected }}>
      {selected ? (
        <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chip}>{content}</LinearGradient>
      ) : (
        <View style={[styles.chip, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]}>{content}</View>
      )}
    </Tap>
  );
}

export function Pill({ label, tone = 'default', icon }: { label: string; tone?: 'default' | 'accent' | 'ok' | 'warn' | 'glass'; icon?: IconName }) {
  const t = useTheme();
  const map = {
    default: [t.surface2, t.muted],
    accent: [t.accentSoft, t.accent],
    ok: [t.okSoft, t.ok],
    warn: [t.warnSoft, t.warn],
    glass: ['rgba(255,255,255,0.22)', '#fff'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {!!icon && <Ionicons name={icon} size={11} color={fg} />}
      <Text style={{ color: fg, fontFamily: FONTS.bodyBold, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Wrap({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}>{children}</View>;
}

export function Field({ label, style, containerStyle, icon, ...props }: TextInputProps & {
  label?: string; containerStyle?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {!!label && <Txt variant="caption" style={{ marginBottom: 6, marginLeft: 4 }}>{label}</Txt>}
      <View style={[styles.input, { backgroundColor: t.surface, borderColor: t.border }]}>
        {!!icon && <Ionicons name={icon} size={18} color={t.muted} style={{ marginRight: 8 }} />}
        <TextInput
          placeholderTextColor={t.faint}
          style={[{ flex: 1, color: t.text, fontFamily: FONTS.body, fontSize: 16, paddingVertical: 12 }, style]}
          {...props}
        />
      </View>
    </View>
  );
}

export function IconBubble({ icon, emoji, color, size = 38 }: { icon?: IconName; emoji?: string; color?: string; size?: number }) {
  const t = useTheme();
  const c = color ?? t.accent;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center' }}>
      {emoji ? <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text> : icon && <Ionicons name={icon} size={size * 0.5} color={c} />}
    </View>
  );
}

export function ListRow({ icon, emoji, color, title, subtitle, right, onPress, danger }: {
  icon?: IconName; emoji?: string; color?: string; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; danger?: boolean;
}) {
  const t = useTheme();
  const content = (
    <View style={styles.listRow}>
      {!!(icon || emoji) && <IconBubble icon={icon} emoji={emoji} color={danger ? t.danger : color} />}
      <View style={{ flex: 1 }}>
        <Txt variant="bodySemi" color={danger ? t.danger : undefined}>{title}</Txt>
        {!!subtitle && <Txt variant="small" muted>{subtitle}</Txt>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={t.faint} />)}
    </View>
  );
  return onPress ? <Tap onPress={onPress} scale={0.98}>{content}</Tap> : content;
}

export function ToggleRow({ icon, emoji, color, title, subtitle, value, onValueChange }: {
  icon?: IconName; emoji?: string; color?: string; title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <ListRow
      icon={icon}
      emoji={emoji}
      color={color}
      title={title}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          onValueChange={(v) => {
            haptic('light');
            onValueChange(v);
          }}
          trackColor={{ true: t.accent, false: t.surface3 }}
          thumbColor="#fff"
        />
      }
    />
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />;
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.surface3, overflow: 'hidden' }}>
      <LinearGradient
        colors={color ? [color, color] : t.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height }}
      />
    </View>
  );
}

export function Empty({ emoji, title, subtitle, children }: { emoji: string; title: string; subtitle?: string; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 12 }}>
      <LinearGradient colors={[t.accentSoft, t.surface2]} style={{ width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 52 }}>{emoji}</Text>
      </LinearGradient>
      <Txt variant="h2" center>{title}</Txt>
      {!!subtitle && <Txt muted center>{subtitle}</Txt>}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- avatar & anneau

export function Avatar({ person, size = 48, ring }: { person: Pick<Person, 'name' | 'emoji' | 'photo'>; size?: number; ring?: boolean }) {
  const t = useTheme();
  const g = personGradient(person.name);
  const initials = person.name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const inner = person.photo ? (
    <Image source={{ uri: person.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />
  ) : (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: person.emoji ? size * 0.5 : size * 0.36, color: '#fff', fontFamily: FONTS.display }}>{person.emoji || initials}</Text>
    </LinearGradient>
  );
  if (!ring) return inner;
  return (
    <View style={{ alignSelf: 'flex-start', padding: 3, borderRadius: size, backgroundColor: t.surface, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 }}>
      {inner}
    </View>
  );
}

/** Anneau de progression (compte à rebours). */
export function Ring({ size = 120, stroke = 10, progress, colors, track = 'rgba(255,255,255,0.25)', children }: {
  size?: number; stroke?: number; progress: number; colors: [string, string]; track?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0.02, Math.min(1, progress));
  const id = `g${colors.join('').replace(/#/g, '')}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- ligne « personne »

export function PersonRow({ person, onPress, onLongPress, today = new Date(), compact, occurrence }: {
  person: Person; onPress: () => void; onLongPress?: () => void; today?: Date; compact?: boolean;
  /** Occurrence affichée (vue mois) : si elle est passée, on montre « il y a N j » / « souhaité ». */
  occurrence?: Date;
}) {
  const t = useTheme();
  const days = daysUntil(person, today);
  const age = ageAtNext(person, today);
  const next = nextBirthday(person, today);
  const phrase = occasionPhrase(person, today);
  const giftPending = person.giftReminder && days <= 30 && !isGiftBought(person, today);
  const isToday = days === 0;
  const g = personGradient(person.name);
  const ago = occurrence ? daysBetween(occurrence, today) : 0;
  const pastWished = ago > 0 && !!person.celebrated[String(occurrence?.getFullYear())];
  return (
    <Tap onPress={onPress} onLongPress={onLongPress} scale={0.98} accessibilityRole="button" accessibilityLabel={`${person.name}, dans ${days} jours`}>
      <View style={[styles.person, { backgroundColor: t.surface, borderColor: isToday ? t.accent : t.border, shadowColor: t.shadow }, compact && { paddingVertical: 10 }]}>
        <Avatar person={person} size={compact ? 42 : 50} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row gap={6}>
            <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{person.name}</Txt>
            {person.favorite && <Ionicons name="star" size={13} color={t.warn} />}
            {person.kind !== 'birthday' && <Text style={{ fontSize: 13 }}>{KINDS[person.kind].emoji}</Text>}
          </Row>
          <Txt variant="small" muted numberOfLines={1}>
            {WEEKDAYS[next.getDay()]} {formatDayMonth(person)}{phrase ? ` · ${phrase}` : ''}
          </Txt>
          {!compact && (giftPending || isMilestone(age) || (person.giftReminder && isGiftBought(person, today))) && (
            <Row gap={6} style={{ marginTop: 6 }}>
              {person.kind === 'birthday' && isMilestone(age) && <Pill label="Âge rond" tone="warn" icon="star" />}
              {giftPending && <Pill label="Cadeau à trouver" tone="accent" icon="gift" />}
              {person.giftReminder && isGiftBought(person, today) && <Pill label="Cadeau prêt" tone="ok" icon="checkmark" />}
            </Row>
          )}
        </View>
        {ago > 0 ? (
          <View style={[styles.daysBadge, { backgroundColor: pastWished ? t.okSoft : t.surface2 }]}>
            {pastWished ? <Ionicons name="checkmark" size={24} color={t.ok} /> : (
              <>
                <Text style={{ fontFamily: FONTS.display, fontSize: 18, color: t.muted, lineHeight: 22 }}>-{ago}</Text>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: t.muted, letterSpacing: 0.5 }}>PASSÉ</Text>
              </>
            )}
          </View>
        ) : isToday ? (
          <LinearGradient colors={g} style={styles.daysBadge}>
            <Text style={{ fontSize: 22 }}>🎉</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.daysBadge, { backgroundColor: days <= 7 ? t.accentSoft : t.surface2 }]}>
            <Text style={{ fontFamily: FONTS.display, fontSize: days > 99 ? 17 : 21, color: days <= 7 ? t.accent : t.text, lineHeight: 24 }}>{days}</Text>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: days <= 7 ? t.accent : t.muted, letterSpacing: 0.5 }}>{days === 1 ? 'JOUR' : 'JOURS'}</Text>
          </View>
        )}
      </View>
    </Tap>
  );
}

export const styles = StyleSheet.create({
  btn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18 },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 13, gap: 6 },
  btnShadow: { shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, marginBottom: 14, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  gradientCard: { borderRadius: RADIUS.xl, padding: 20, overflow: 'hidden', marginBottom: 14 },
  bubble: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.16 },
  chip: { borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  input: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  person: {
    flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: RADIUS.lg, padding: 13, marginBottom: 10,
    shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  daysBadge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
