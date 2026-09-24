import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, View } from 'react-native';

import { Sheet } from '../components/Sheet';
import { useToast } from '../components/toast';
import { Button, Card, Chip, Divider, ListRow, SectionHeader, Tap, ToggleRow, Txt, Wrap } from '../components/ui';
import { exportCSV, formatLongDate, parseCSV, toICS } from '../lib/birthdays';
import { GIFT_REMINDER_CHOICES, REMINDER_CHOICES } from '../lib/choices';
import { demoPeople } from '../lib/demo';
import {
  biometricAvailable, listBackups, readBackup, removePhoneCalendar, serialize, shareFile, syncPhoneCalendar, unlock, writeBackup,
  type BackupInfo,
} from '../lib/device';
import { getPermissionStatus, requestPermission, scheduledCount, sendTestNotification } from '../lib/notifications';
import type { AccentName } from '../lib/planner';
import { normalizeData } from '../lib/storage';
import { useStore } from '../lib/store';
import { ACCENTS, useTheme } from '../theme';
import { WIDGET_NAME } from '../widget/handler';
import { requestPinWidget } from 'react-native-android-widget';

const HOURS = [7, 8, 9, 10, 12, 14, 18, 20];

export default function SettingsScreen() {
  const t = useTheme();
  const toast = useToast();
  const store = useStore();
  const { settings, updateSettings, people } = store;
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupSheet, setBackupSheet] = useState(false);

  const refresh = useCallback(() => {
    getPermissionStatus().then(setPerm).catch(() => setPerm(null));
    setTimeout(() => scheduledCount().then(setCount).catch(() => {}), 700);
    setBackups(listBackups());
  }, []);
  useFocusEffect(refresh);

  const toggle = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).sort((a, b) => a - b);

  const enable = async () => {
    if (await requestPermission()) {
      await store.resync();
      toast('Notifications activées 🔔');
    } else {
      Alert.alert('Notifications bloquées', 'Autorise les notifications pour Anniv dans les paramètres du téléphone.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]);
    }
    refresh();
  };

  const test = async (kind: 'birthday' | 'gift') => {
    if (!(await requestPermission())) return enable();
    await sendTestNotification(kind);
    toast('Notification dans 3 secondes… tu peux fermer l’app');
  };

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*', 'text/csv', 'text/comma-separated-values'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      await importText(await new File(res.assets[0].uri).text());
    } catch {
      toast('Fichier illisible 😕');
    }
  };

  const importText = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const raw = JSON.parse(trimmed);
      const data = normalizeData(Array.isArray(raw) ? { people: raw } : raw);
      Alert.alert('Restaurer', `${data.people.length} fiche(s) trouvée(s).`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ajouter aux miennes', onPress: () => { const r = store.importPeople(data.people); toast(`${r.added} ajoutée(s), ${r.skipped} doublon(s)`); } },
        { text: 'Tout remplacer', style: 'destructive', onPress: () => { store.replaceAll({ people: data.people, settings: { ...data.settings, onboarded: true }, meta: data.meta }); toast('Sauvegarde restaurée ✓'); } },
      ]);
    } else {
      const { people: incoming, errors } = parseCSV(text);
      const r = store.importPeople(incoming);
      toast(`${r.added} ajouté(s)${r.skipped ? `, ${r.skipped} doublon(s)` : ''}${errors.length ? `, ${errors.length} ligne(s) ignorée(s)` : ''}`);
    }
  };

  const setLock = async (v: boolean) => {
    if (v) {
      if (!(await biometricAvailable())) return toast('Aucune empreinte ni visage configuré sur ce téléphone');
      if (!(await unlock())) return;
    }
    updateSettings({ lock: v });
    toast(v ? '🔒 Anniv est verrouillée' : 'Verrou désactivé');
  };

  const setCalendar = async (v: boolean) => {
    try {
      if (v) {
        const n = await syncPhoneCalendar(people);
        toast(`📆 ${n} événement(s) ajoutés à l’agenda « Anniv »`);
      } else {
        await removePhoneCalendar();
        toast('Agenda « Anniv » retiré du téléphone');
      }
      updateSettings({ calendarSync: v });
    } catch (e) {
      toast((e as Error).message || 'Agenda indisponible');
    }
  };

  const snap = store.snapshot();

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
      {/* Notifications */}
      <SectionHeader title="🔔 Notifications" style={{ marginTop: 0 }} />
      <Card>
        {perm === 'granted' ? (
          <Txt variant="small" muted>✅ Activées{count != null ? ` · ${count} rappel${count > 1 ? 's' : ''} programmé${count > 1 ? 's' : ''}` : ''}. Elles arrivent même app fermée.</Txt>
        ) : (
          <>
            <Txt variant="small" muted>{perm === 'denied' ? '🚫 Notifications bloquées dans les réglages du téléphone.' : 'Les notifications ne sont pas encore activées.'}</Txt>
            <Button title="Activer les notifications" icon="notifications" variant="primary" onPress={enable} style={{ marginTop: 10 }} />
          </>
        )}
        <Wrap gap={8} style={{ marginTop: 12 }}>
          <Button small icon="flash" title="Tester : anniversaire" onPress={() => test('birthday')} />
          <Button small icon="gift" title="Tester : cadeau" onPress={() => test('gift')} />
        </Wrap>

        <Txt variant="label" style={{ marginTop: 18, marginBottom: 8 }}>Heure des rappels</Txt>
        <Wrap gap={6}>{HOURS.map((h) => <Chip key={h} label={`${h} h`} selected={settings.hour === h} onPress={() => updateSettings({ hour: h })} />)}</Wrap>
        <Wrap gap={6} style={{ marginTop: 6 }}>
          {[0, 15, 30, 45].map((m) => <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={settings.minute === m} onPress={() => updateSettings({ minute: m })} />)}
        </Wrap>

        <Txt variant="label" style={{ marginTop: 18, marginBottom: 8 }}>🎂 Rappels d’anniversaire</Txt>
        <Wrap gap={6}>
          {REMINDER_CHOICES.map(([v, l]) => <Chip key={v} label={l} selected={settings.reminders.includes(v)} onPress={() => updateSettings({ reminders: toggle(settings.reminders, v) })} />)}
        </Wrap>
        <Txt variant="label" style={{ marginTop: 18, marginBottom: 8 }}>🎁 Rappels pour acheter le cadeau</Txt>
        <Wrap gap={6}>
          {GIFT_REMINDER_CHOICES.map(([v, l]) => <Chip key={v} label={l} selected={settings.giftReminders.includes(v)} onPress={() => updateSettings({ giftReminders: toggle(settings.giftReminders, v) })} />)}
        </Wrap>
      </Card>
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <ToggleRow emoji="🌙" title="Relance du soir" subtitle="À 20 h le jour J si tu n’as pas encore souhaité" value={settings.eveningNudge} onValueChange={(v) => updateSettings({ eveningNudge: v })} />
        <ToggleRow emoji="🗓️" title="Récap du dimanche" subtitle="Le programme de la semaine, dimanche à 18 h" value={settings.weekly} onValueChange={(v) => updateSettings({ weekly: v })} />
        <ToggleRow emoji="🌷" title="Fêtes des prénoms" subtitle="« C’est la fête de Clément ! »" value={settings.nameDays} onValueChange={(v) => updateSettings({ nameDays: v })} />
        <ToggleRow emoji="💐" title="Fêtes des mères, pères, grands-parents" subtitle="Selon les liens renseignés (Maman, Papa…)" value={settings.holidays} onValueChange={(v) => updateSettings({ holidays: v })} />
        <ToggleRow emoji="✨" title="Jalons insolites" subtitle="10 000e jour, milliard de secondes…" value={settings.dayMilestones} onValueChange={(v) => updateSettings({ dayMilestones: v })} />
      </Card>

      {/* Apparence */}
      <SectionHeader title="🎨 Apparence" />
      <Card>
        <Wrap gap={6}>
          <Chip label="Automatique" selected={settings.theme === 'auto'} onPress={() => updateSettings({ theme: 'auto' })} />
          <Chip label="Clair" icon="☀️" selected={settings.theme === 'light'} onPress={() => updateSettings({ theme: 'light' })} />
          <Chip label="Sombre" icon="🌙" selected={settings.theme === 'dark'} onPress={() => updateSettings({ theme: 'dark' })} />
        </Wrap>
        <Txt variant="label" style={{ marginTop: 18, marginBottom: 10 }}>Couleur</Txt>
        <Wrap gap={12}>
          {(Object.keys(ACCENTS) as AccentName[]).map((k) => (
            <Tap key={k} onPress={() => updateSettings({ accent: k })} style={{ alignItems: 'center', gap: 6 }}>
              <LinearGradient colors={[ACCENTS[k].a, ACCENTS[k].b]} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: settings.accent === k ? 4 : 0, borderColor: t.text }} />
              <Txt variant="caption" color={settings.accent === k ? t.text : t.muted}>{ACCENTS[k].name}</Txt>
            </Tap>
          ))}
        </Wrap>
      </Card>

      {/* Confidentialité & agenda */}
      <SectionHeader title="🔒 Confidentialité & agenda" />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <ToggleRow icon="finger-print" title="Verrouiller l’app" subtitle="Empreinte, visage ou code du téléphone" value={settings.lock} onValueChange={setLock} />
        {Platform.OS !== 'web' && (
          <ToggleRow icon="calendar" color="#1E7BFF" title="Agenda du téléphone" subtitle="Un agenda « Anniv » tenu à jour automatiquement" value={settings.calendarSync} onValueChange={setCalendar} />
        )}
        {Platform.OS === 'android' && (
          <ListRow icon="apps" color="#FF8A5B" title="Ajouter le widget" subtitle="Les prochains anniversaires sur ton écran d’accueil" onPress={() => requestPinWidget({ widgetName: WIDGET_NAME }).then((ok) => { if (!ok) toast('Appui long sur l’écran d’accueil → Widgets → Anniv'); }).catch(() => toast('Appui long sur l’écran d’accueil → Widgets → Anniv'))} />
        )}
        <ListRow icon="calendar-number" color="#0FA37F" title="Exporter en .ics" subtitle="Pour Google Agenda, Outlook…" onPress={() => shareFile('anniv.ics', toICS(people), 'text/calendar').catch(() => toast('Export impossible'))} />
      </Card>

      {/* Sauvegardes */}
      <SectionHeader title="💾 Sauvegardes & données" />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <ToggleRow icon="cloud-done" color={t.ok} title="Sauvegarde automatique" subtitle={backups[0] ? `Dernière : ${formatLongDate(backups[0].date)}` : 'Chaque semaine, les 8 dernières sont gardées'} value={settings.autoBackup} onValueChange={(v) => updateSettings({ autoBackup: v })} />
        <ListRow icon="time" color="#7C5CFF" title="Restaurer une sauvegarde" subtitle={`${backups.length} sauvegarde(s) sur le téléphone`} onPress={() => { setBackups(listBackups()); setBackupSheet(true); }} />
        <ListRow icon="share-outline" color={t.accent} title="Exporter une sauvegarde" subtitle="Vers Drive, e-mail… (fichier JSON)" onPress={() => snap && shareFile(`anniv-${new Date().toISOString().slice(0, 10)}.json`, serialize(snap), 'application/json').catch(() => toast('Export impossible'))} />
        <ListRow icon="grid" color="#0FA37F" title="Exporter pour Excel" subtitle="Fichier CSV" onPress={() => shareFile('anniversaires.csv', exportCSV(people), 'text/csv').catch(() => toast('Export impossible'))} />
        <ListRow icon="download" color="#1E7BFF" title="Importer un fichier" subtitle="Sauvegarde JSON ou CSV (nom;JJ/MM/AAAA;groupe)" onPress={importFile} />
        <ListRow icon="people" color="#F2A20C" title="Importer mes contacts" onPress={() => router.push('/import-contacts')} />
        <Divider />
        <ListRow icon="sparkles" color={t.muted} title="Ajouter des exemples" onPress={() => { const r = store.importPeople(demoPeople()); toast(`${r.added} exemples ajoutés`); }} />
        <ListRow icon="trash" danger title="Tout effacer" onPress={() => {
          if (!people.length) return;
          Alert.alert('Tout effacer ?', 'Tous les anniversaires seront supprimés. Une sauvegarde est faite juste avant.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Tout effacer', style: 'destructive', onPress: () => { if (snap) writeBackup(snap, true); store.replaceAll({ people: [] }); toast('Tout a été effacé (sauvegarde conservée).'); } },
          ]);
        }} />
      </Card>

      <SectionHeader title="À propos" />
      <Card>
        <Txt variant="h3">Anniv {Constants.expoConfig?.version ?? ''}</Txt>
        <Txt variant="small" muted style={{ marginTop: 4 }}>
          Tes données restent sur ton téléphone : aucun compte, aucun serveur, aucune publicité. Fait avec ❤️ pour ne plus jamais oublier ceux qu’on aime.
        </Txt>
      </Card>

      <Sheet visible={backupSheet} onClose={() => setBackupSheet(false)} title="Sauvegardes" subtitle="Enregistrées automatiquement sur ce téléphone">
        {backups.length === 0 && <Txt muted>Aucune sauvegarde pour l’instant.</Txt>}
        {backups.map((b) => (
          <ListRow key={b.uri} icon="document-text" title={formatLongDate(b.date, true)} subtitle={`${Math.max(1, Math.round(b.size / 1024))} Ko`}
            onPress={async () => { setBackupSheet(false); try { await importText(await readBackup(b.uri)); } catch { toast('Sauvegarde illisible'); } }} />
        ))}
        <Button title="Sauvegarder maintenant" icon="save" variant="primary" style={{ marginTop: 12 }} onPress={() => { if (snap) writeBackup(snap, true); setBackups(listBackups()); toast('Sauvegarde créée ✓'); }} />
        <View style={{ height: 8 }} />
      </Sheet>
    </ScrollView>
  );
}
