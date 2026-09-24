import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, useTheme } from '../theme';
import { haptic, Tap, type IconName } from './ui';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  agenda: ['calendar', 'calendar-outline'],
  gifts: ['gift', 'gift-outline'],
  me: ['person-circle', 'person-circle-outline'],
};

/** Barre d'onglets flottante avec bouton « + » central. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => ICONS[r.name]);
  const half = Math.ceil(routes.length / 2);

  const tab = (route: (typeof routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const [on, off] = ICONS[route.name];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options.title}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic('light');
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}
      >
        <Ionicons name={focused ? on : off} size={23} color={focused ? t.accent : t.muted} />
        <Text style={{ fontFamily: focused ? FONTS.bodyBold : FONTS.bodySemi, fontSize: 10.5, color: focused ? t.accent : t.muted, marginTop: 2 }}>
          {options.title}
        </Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: t.dark ? 'rgba(26,20,32,0.97)' : 'rgba(255,255,255,0.97)', borderColor: t.border, shadowColor: t.dark ? '#000' : '#5A1E36' }]}>
        {routes.slice(0, half).map(tab)}
        <View style={{ width: 70 }} />
        {routes.slice(half).map(tab)}
      </View>
      <Tap
        onPress={() => {
          haptic('medium');
          router.push('/edit');
        }}
        accessibilityRole="button"
        accessibilityLabel="Ajouter"
        scale={0.9}
        style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 10) + 22 }]}
      >
        <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fab, { shadowColor: t.accent, borderColor: t.bg }]}>
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 26, borderWidth: 1, height: 66, paddingHorizontal: 6,
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  fabWrap: { position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -33 },
  fab: {
    width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 4,
    shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 14,
  },
});
