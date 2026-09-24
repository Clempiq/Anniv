// Services qui touchent au téléphone : photos, sauvegardes automatiques, agenda, verrou biométrique, partage.
import * as Calendar from 'expo-calendar';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Share } from 'react-native';

import { birthdayInYear, KINDS, uid, type Person } from './birthdays';
import type { AppData } from './storage';

// ---------------------------------------------------------------- photos

function photosDir(): Directory {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

/** Ouvre la galerie, recadre au carré et copie la photo dans le dossier de l'app. */
export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  if (res.canceled || !res.assets?.[0]) return null;
  if (Platform.OS === 'web') return res.assets[0].uri;
  const src = new File(res.assets[0].uri);
  const dest = new File(photosDir(), `${uid()}.jpg`);
  await src.copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string) {
  try {
    if (uri.startsWith('file:')) {
      const f = new File(uri);
      if (f.exists) f.delete();
    }
  } catch {
    // sans gravité
  }
}

// ---------------------------------------------------------------- sauvegardes

const BACKUP_KEEP = 8;

function backupsDir(): Directory {
  const d = new Directory(Paths.document, 'sauvegardes');
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

export type BackupInfo = { name: string; uri: string; date: Date; size: number };

export function listBackups(): BackupInfo[] {
  if (Platform.OS === 'web') return [];
  try {
    return backupsDir().list()
      .filter((f) => f.name.endsWith('.json'))
      .map((entry) => {
        const f = new File(entry.uri);
        const m = f.name.match(/(\d{4})-(\d{2})-(\d{2})/);
        let size = 0;
        try {
          size = f.size ?? 0;
        } catch {
          // taille inconnue
        }
        return { name: f.name, uri: f.uri, size, date: m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(0) };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}

export function serialize(data: AppData): string {
  return JSON.stringify({ app: 'anniv', version: 2, exportedAt: new Date().toISOString(), ...data, settings: { ...data.settings, snoozes: [] } }, null, 1);
}

/** Écrit une sauvegarde datée du jour (au plus une par jour) et garde les 8 dernières. */
export function writeBackup(data: AppData, force = false): BackupInfo | null {
  if (Platform.OS === 'web' || !data.people.length) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const file = new File(backupsDir(), `anniv-${today}.json`);
    if (file.exists && !force) return null;
    if (file.exists) file.delete();
    file.create();
    file.write(serialize(data));
    const all = listBackups();
    for (const old of all.slice(BACKUP_KEEP)) new File(old.uri).delete();
    return all[0] ?? null;
  } catch {
    return null;
  }
}

/** Sauvegarde automatique hebdomadaire. */
export function autoBackup(data: AppData) {
  if (!data.settings.autoBackup) return;
  const last = listBackups()[0];
  if (last && Date.now() - last.date.getTime() < 6 * 86400000) return;
  writeBackup(data);
}

export async function readBackup(uri: string): Promise<string> {
  return new File(uri).text();
}

export async function shareFile(name: string, content: string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

// ---------------------------------------------------------------- agenda du téléphone

const CAL_TITLE = 'Anniv';

async function findOrCreateCalendar(): Promise<Calendar.ExpoCalendar> {
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = cals.find((c) => c.title === CAL_TITLE);
  if (existing) await existing.delete();
  return Calendar.createCalendar({
    title: CAL_TITLE,
    name: 'anniv',
    color: '#FF4D6D',
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: 'Anniv', type: Calendar.SourceType.LOCAL } as never,
    ownerAccount: 'Anniv',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/** Recrée l'agenda « Anniv » du téléphone avec un événement annuel par fiche. */
export async function syncPhoneCalendar(people: Person[]): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const perm = await Calendar.requestCalendarPermissions();
  if (!perm.granted) throw new Error('Accès à l’agenda refusé.');
  const cal = await findOrCreateCalendar();
  const year = new Date().getFullYear();
  let n = 0;
  for (const p of people) {
    const start = birthdayInYear(p, year);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    await cal.createEvent({
      title: `${KINDS[p.kind].emoji} ${p.kind === 'other' && p.label ? p.label : p.name}`,
      startDate: start,
      endDate: end,
      allDay: true,
      notes: p.notes || undefined,
      recurrenceRule: { frequency: Calendar.Frequency.YEARLY },
      timeZone: 'UTC',
    });
    n++;
  }
  return n;
}

export async function removePhoneCalendar() {
  if (Platform.OS === 'web') return;
  const perm = await Calendar.getCalendarPermissions();
  if (!perm.granted) return;
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  for (const c of cals.filter((x) => x.title === CAL_TITLE)) await c.delete();
}

// ---------------------------------------------------------------- verrou

export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function unlock(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Anniv', cancelLabel: 'Annuler' });
  return r.success;
}

// ---------------------------------------------------------------- envoi de messages

export type Channel = 'sms' | 'whatsapp' | 'mail' | 'share' | 'call';

export async function sendMessage(channel: Channel, p: Person, message: string): Promise<boolean> {
  const phone = p.phone.replace(/[^\d+]/g, '');
  try {
    if (channel === 'share') {
      const r = await Share.share({ message });
      return r.action !== Share.dismissedAction;
    }
    if (channel === 'sms') await Linking.openURL(`sms:${phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`);
    if (channel === 'whatsapp') {
      const intl = phone.replace(/^\+/, '').replace(/^0/, '33');
      await Linking.openURL(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`);
    }
    if (channel === 'mail') await Linking.openURL(`mailto:${p.email}?subject=${encodeURIComponent('Joyeux anniversaire !')}&body=${encodeURIComponent(message)}`);
    if (channel === 'call') await Linking.openURL(`tel:${phone}`);
    return true;
  } catch {
    return false;
  }
}
