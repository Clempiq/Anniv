// Programmation des notifications locales : envoyées par le système même app fermée.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Person } from './birthdays';
import { planNotifications, type NotificationKind, type Settings } from './planner';

export const CHANNEL_BIRTHDAYS = 'anniversaires';
export const CHANNEL_GIFTS = 'cadeaux';
export const CHANNEL_RECAP = 'recap';
export const CATEGORY_GIFT = 'gift';
export const CATEGORY_BIRTHDAY = 'birthday';
export const CATEGORY_INFO = 'info';
export const ACTION_BOUGHT = 'bought';
export const ACTION_SNOOZE = 'snooze';
export const ACTION_WISH = 'wish';
export const ACTION_WISHED = 'wished';

export type NotificationData = { personId: string; kind: NotificationKind | 'test' };

/** Android accepte jusqu'à 500 alarmes par app, iOS 64 notifications en attente. */
const MAX = Platform.OS === 'android' ? 150 : 60;

let configured: Promise<void> | null = null;

/** Canaux Android et boutons d'action. À appeler au démarrage (idempotent). */
export function configureNotifications(): Promise<void> {
  if (!configured) configured = doConfigure().catch((e) => {
    configured = null;
    throw e;
  });
  return configured;
}

async function doConfigure() {
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
      name: 'Anniversaires et fêtes',
      description: 'Rappels avant et le jour des anniversaires, fêtes et événements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#FF4D6D',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_GIFTS, {
      name: 'Cadeaux à acheter',
      description: 'Rappels pour acheter un cadeau à temps',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#FF8A5B',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_RECAP, {
      name: 'Récap de la semaine',
      description: 'Le dimanche soir, ce qui t’attend dans la semaine',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY_GIFT, [
    { identifier: ACTION_BOUGHT, buttonTitle: '✅ Cadeau acheté', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: '⏰ Rappeler demain', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_BIRTHDAY, [
    { identifier: ACTION_WISH, buttonTitle: '💌 Écrire un message', options: { opensAppToForeground: true } },
    { identifier: ACTION_WISHED, buttonTitle: '✅ C’est fait', options: { opensAppToForeground: true } },
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

function channelFor(kind: NotificationKind): string {
  if (kind === 'gift') return CHANNEL_GIFTS;
  if (kind === 'weekly') return CHANNEL_RECAP;
  return CHANNEL_BIRTHDAYS;
}

function categoryFor(kind: NotificationKind): string | undefined {
  if (kind === 'gift') return CATEGORY_GIFT;
  if (kind === 'birthday' || kind === 'nudge') return CATEGORY_BIRTHDAY;
  return undefined;
}

let syncing: Promise<number> | null = null;
let pending: { people: Person[]; settings: Settings } | null = null;

/**
 * Annule puis reprogramme toutes les notifications à partir des données.
 * Les appels rapprochés sont regroupés. Renvoie le nombre de notifications programmées.
 */
export function syncNotifications(people: Person[], settings: Settings): Promise<number> {
  if (Platform.OS === 'web') return Promise.resolve(0);
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
  const plan = planNotifications(people, settings, new Date(), MAX);
  for (const n of plan) {
    const data: NotificationData = { personId: n.personId, kind: n.kind };
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: n.title,
        body: n.body,
        data,
        categoryIdentifier: categoryFor(n.kind),
        color: n.kind === 'gift' ? '#FF8A5B' : '#FF4D6D',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: channelFor(n.kind) },
    });
  }
  return plan.length;
}

export async function sendTestNotification(kind: 'birthday' | 'gift'): Promise<void> {
  await configureNotifications();
  const data: NotificationData = { personId: '', kind: 'test' };
  await Notifications.scheduleNotificationAsync({
    content: kind === 'gift'
      ? { title: '🎁 Cadeau pour Lucas : c’est dans 14 jours', body: 'Idées : gourde isotherme, livre de rando · budget 40 €', data, categoryIdentifier: CATEGORY_GIFT }
      : { title: '🎂 C’est l’anniversaire de Lucas !', body: 'Lucas fête ses 30 ans aujourd’hui. Envoie-lui un petit mot 💌', data, categoryIdentifier: CATEGORY_BIRTHDAY },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: kind === 'gift' ? CHANNEL_GIFTS : CHANNEL_BIRTHDAYS },
  });
}

export async function scheduledCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
