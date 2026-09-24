import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfettiProvider } from '../components/Confetti';
import { ToastProvider, useToast } from '../components/toast';
import { Button } from '../components/ui';
import { registerBackgroundResync } from '../lib/background';
import { firstName, occurrenceYear } from '../lib/birthdays';
import { autoBackup, syncPhoneCalendar, unlock } from '../lib/device';
import {
  ACTION_BOUGHT, ACTION_SNOOZE, ACTION_WISH, ACTION_WISHED, configureNotifications, getPermissionStatus, requestPermission,
  type NotificationData,
} from '../lib/notifications';
import { onDataChange, StoreProvider, useStore } from '../lib/store';
import { FONTS, useTheme } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    ...Ionicons.font,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <ConfettiProvider>
            <AppStack />
            <NotificationResponder />
            <BackgroundServices />
            <LockGate />
          </ConfettiProvider>
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const t = useTheme();
  const { loaded } = useStore();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: FONTS.displayBold, fontSize: 19 },
          contentStyle: { backgroundColor: t.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="person/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="edit" options={{ presentation: 'modal', title: 'Nouvel événement', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="card/[id]" options={{ title: 'Carte de vœux' }} />
        <Stack.Screen name="import-contacts" options={{ title: 'Importer des contacts' }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
        <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}

/** Sauvegardes automatiques, agenda du téléphone, tâche de fond. */
function BackgroundServices() {
  const store = useStore();
  const toast = useToast();
  const calTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPeople = store.people.length > 0;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    configureNotifications().catch(() => {});
    registerBackgroundResync();
  }, []);

  useEffect(() => onDataChange((d) => {
    autoBackup(d);
    if (d.settings.calendarSync) {
      if (calTimer.current) clearTimeout(calTimer.current);
      calTimer.current = setTimeout(() => syncPhoneCalendar(d.people).catch(() => {}), 4000);
    }
  }), []);

  // Dès qu'il y a au moins un anniversaire, on demande l'autorisation des notifications (une seule fois).
  useEffect(() => {
    if (!store.loaded || !hasPeople || Platform.OS === 'web' || !store.settings.onboarded) return;
    (async () => {
      if ((await getPermissionStatus()) !== 'undetermined') return;
      if (await requestPermission()) {
        await store.resync();
        toast('🔔 Rappels activés');
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loaded, hasPeople, store.settings.onboarded]);

  return null;
}

/** Gère les appuis sur les notifications et leurs boutons. */
function NotificationResponder() {
  const store = useStore();
  const toast = useToast();
  const handled = useRef(new Set<string>());
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!store.loaded || Platform.OS === 'web') return;
    const handle = (response: Notifications.NotificationResponse) => {
      const req = response.notification.request;
      const key = `${req.identifier}|${response.actionIdentifier}|${response.notification.date}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      Notifications.clearLastNotificationResponse();

      const data = req.content.data as Partial<NotificationData> | undefined;
      const s = storeRef.current;
      const person = data?.personId ? s.getPerson(data.personId) : undefined;
      if (data?.kind === 'weekly') return router.navigate('/agenda');
      if (data?.kind === 'self') return router.navigate('/');
      if (!person) return;
      const year = occurrenceYear(person, new Date(Date.now() - 12 * 3600 * 1000));

      if (response.actionIdentifier === ACTION_BOUGHT) {
        s.updatePerson(person.id, (p) => ({ ...p, giftBought: { ...p.giftBought, [occurrenceYear(p)]: new Date().toISOString() } }));
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        toast(`🎁 Cadeau pour ${firstName(person)} noté comme acheté`);
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        const at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        s.updateSettings({ snoozes: [...s.settings.snoozes.filter((x) => x.personId !== person.id), { personId: person.id, at }] });
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        toast('⏰ Je te le rappelle demain');
      } else if (response.actionIdentifier === ACTION_WISHED) {
        s.updatePerson(person.id, (p) => ({ ...p, celebrated: { ...p.celebrated, [year]: new Date().toISOString() } }));
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        toast(`Bravo, tu n’as pas oublié ${firstName(person)} ! 🎉`);
      } else if (response.actionIdentifier === ACTION_WISH) {
        router.push({ pathname: '/person/[id]', params: { id: person.id, compose: '1' } });
      } else {
        router.push({ pathname: '/person/[id]', params: { id: person.id } });
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) handle(last);
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [store.loaded, toast]);

  return null;
}

/** Écran de verrouillage (empreinte / visage / code du téléphone). */
function LockGate() {
  const t = useTheme();
  const { settings, loaded } = useStore();
  const [locked, setLocked] = useState(settings.lock);
  const lastBackground = useRef(0);
  const trying = useRef(false);

  const tryUnlock = async () => {
    if (trying.current) return;
    trying.current = true;
    try {
      if (await unlock()) setLocked(false);
    } finally {
      trying.current = false;
    }
  };

  useEffect(() => {
    if (loaded && settings.lock) {
      setLocked(true);
      tryUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') lastBackground.current = Date.now();
      if (s === 'active' && settings.lock && lastBackground.current && Date.now() - lastBackground.current > 60000) {
        setLocked(true);
        tryUnlock();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.lock]);

  if (!locked || !settings.lock) return null;
  return (
    <LinearGradient colors={t.gradient} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 }]}>
      <Text style={{ fontSize: 64 }}>🎂</Text>
      <Text style={{ color: '#fff', fontFamily: FONTS.display, fontSize: 32 }}>Anniv</Text>
      <Text style={{ color: '#fff', fontFamily: FONTS.body, fontSize: 15, opacity: 0.9, textAlign: 'center' }}>Tes anniversaires sont protégés.</Text>
      <Button title="Déverrouiller" icon="finger-print" onPress={tryUnlock} style={{ alignSelf: 'stretch' }} />
    </LinearGradient>
  );
}
