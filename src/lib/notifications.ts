// Programmation des notifications locales : elles sont envoyées par Android même app fermée.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planNotifications, type Settings } from './planner';
import type { Person } from './birthdays';

export const CHANNEL_BIRTHDAYS = 'anniversaires';
export const CHANNEL_GIFTS = 'cadeaux';
export const CATEGORY_GIFT = 'gift';
export const CATEGORY_BIRTHDAY = 'birthday';
export const ACTION_BOUGHT = 'bought';
export const ACTION_SNOOZE = 'snooze';
export const ACTION_WISH = 'wish';

export type NotificationData = { personId: string; kind: 'birthday' | 'gift' | 'test' };

let configured = false;

/** Canaux Android et boutons d'action. À appeler au démarrage (idempotent). */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_BIRTHDAYS, {
      name: 'Anniversaires',
      description: 'Rappels avant et le jour des anniversaires',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#E8505B',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_GIFTS, {
      name: 'Cadeaux à acheter',
      description: 'Rappels pour acheter un cadeau à temps',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#F2A93B',
    });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY_GIFT, [
    { identifier: ACTION_BOUGHT, buttonTitle: '✅ Cadeau acheté', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: '⏰ Rappeler demain', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_BIRTHDAY, [
    { identifier: ACTION_WISH, buttonTitle: '💌 Écrire un message', options: { opensAppToForeground: true } },
  ]);
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function requestPermission(): Promise<boolean> {
  await configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

let syncing: Promise<number> | null = null;
let pending: { people: Person[]; settings: Settings } | null = null;

/**
 * Annule puis reprogramme toutes les notifications à partir des données.
 * Les appels rapprochés sont regroupés pour éviter les courses.
 * Renvoie le nombre de notifications programmées.
 */
export function syncNotifications(people: Person[], settings: Settings): Promise<number> {
  pending = { people, settings };
  if (!syncing) {
    syncing = (async () => {
      let count = 0;
      try {
        while (pending) {
          const job = pending;
          pending = null;
          count = await doSync(job.people, job.settings);
        }
      } finally {
        syncing = null;
      }
      return count;
    })();
  }
  return syncing;
}

async function doSync(people: Person[], settings: Settings): Promise<number> {
  await configureNotifications();
  const { granted } = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return 0;
  const plan = planNotifications(people, settings);
  for (const n of plan) {
    const data: NotificationData = { personId: n.personId, kind: n.kind };
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: n.title,
        body: n.body,
        data,
        categoryIdentifier: n.kind === 'gift' ? CATEGORY_GIFT : CATEGORY_BIRTHDAY,
        color: n.kind === 'gift' ? '#F2A93B' : '#E8505B',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.date,
        channelId: n.kind === 'gift' ? CHANNEL_GIFTS : CHANNEL_BIRTHDAYS,
      },
    });
  }
  return plan.length;
}

export async function sendTestNotification(kind: 'birthday' | 'gift'): Promise<void> {
  await configureNotifications();
  const data: NotificationData = { personId: '', kind: 'test' };
  await Notifications.scheduleNotificationAsync({
    content: kind === 'gift'
      ? { title: '🎁 Cadeau pour Lucas : anniversaire dans 14 jours', body: 'Idées : gourde isotherme, livre de rando · budget 40 €', data, categoryIdentifier: CATEGORY_GIFT }
      : { title: '🎂 C’est l’anniversaire de Lucas !', body: 'Lucas fête ses 30 ans aujourd’hui. Envoie-lui un petit mot 💌', data, categoryIdentifier: CATEGORY_BIRTHDAY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: kind === 'gift' ? CHANNEL_GIFTS : CHANNEL_BIRTHDAYS,
    },
  });
}

export async function scheduledCount(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
