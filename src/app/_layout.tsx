import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider, useToast } from '../components/toast';
import { registerBackgroundResync } from '../lib/background';
import { firstName, occurrenceYear } from '../lib/birthdays';
import {
  ACTION_BOUGHT, ACTION_SNOOZE, configureNotifications, getPermissionStatus, requestPermission, type NotificationData,
} from '../lib/notifications';
import { StoreProvider, useStore } from '../lib/store';
import { useTheme } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <AppStack />
          <NotificationResponder />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="person/[id]" options={{ title: '' }} />
        <Stack.Screen name="edit" options={{ presentation: 'modal', title: 'Anniversaire' }} />
        <Stack.Screen name="import-contacts" options={{ title: 'Importer des contacts' }} />
      </Stack>
    </>
  );
}

/** Gère les appuis sur les notifications et leurs boutons (« Cadeau acheté », « Rappeler demain »). */
function NotificationResponder() {
  const store = useStore();
  const toast = useToast();
  const handled = useRef(new Set<string>());
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    configureNotifications().catch(() => {});
    registerBackgroundResync();
  }, []);

  // Dès qu'il y a au moins un anniversaire, on demande l'autorisation d'envoyer des notifications (une seule fois).
  const hasPeople = store.people.length > 0;
  useEffect(() => {
    if (!store.loaded || !hasPeople || Platform.OS === 'web') return;
    (async () => {
      if ((await getPermissionStatus()) !== 'undetermined') return;
      if (await requestPermission()) await storeRef.current.resync();
    })().catch(() => {});
  }, [store.loaded, hasPeople]);

  useEffect(() => {
    // Notifications locales : Android/iOS uniquement (l'aperçu web sert au développement).
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
      if (!person) return;

      if (response.actionIdentifier === ACTION_BOUGHT) {
        const year = occurrenceYear(person);
        s.updatePerson(person.id, (p) => ({ ...p, giftBought: { ...p.giftBought, [year]: new Date().toISOString() } }));
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        toast(`🎁 Cadeau pour ${firstName(person)} noté comme acheté`);
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        const at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        s.updateSettings({ snoozes: [...s.settings.snoozes.filter((x) => x.personId !== person.id), { personId: person.id, at }] });
        Notifications.dismissNotificationAsync(req.identifier).catch(() => {});
        toast(`⏰ Je te le rappelle demain`);
      } else {
        router.push(`/person/${person.id}`);
      }
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) handle(last);
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [store.loaded, toast]);

  return null;
}
