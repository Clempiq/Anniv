import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';

import { useToast } from '../../components/toast';
import { Button, Card, Chip, H2, Muted } from '../../components/ui';
import { exportCSV, parseCSV } from '../../lib/birthdays';
import { GIFT_REMINDER_CHOICES, REMINDER_CHOICES } from '../../lib/choices';
import { demoPeople } from '../../lib/demo';
import { getPermissionStatus, requestPermission, scheduledCount, sendTestNotification } from '../../lib/notifications';
import { normalizeData } from '../../lib/storage';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

const HOURS = [7, 8, 9, 10, 12, 14, 18, 20];

export default function SettingsScreen() {
  const t = useTheme();
  const toast = useToast();
  const store = useStore();
  const { settings, updateSettings, people } = store;
  const [perm, setPerm] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getPermissionStatus().then(setPerm).catch(() => setPerm(null));
    // Laisse le temps à la reprogrammation en cours de se terminer
    setTimeout(() => scheduledCount().then(setCount).catch(() => {}), 600);
  }, []);
  useFocusEffect(refresh);

  const toggle = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).sort((a, b) => a - b);

  const enable = async () => {
    const ok = await requestPermission();
    if (ok) {
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
    toast('Notification de test dans 3 secondes… (tu peux fermer l’app)');
  };

  const shareFile = async (name: string, content: string, mimeType: string) => {
    try {
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
    } catch (e) {
      toast(`Export impossible : ${(e as Error).message}`);
    }
  };

  const exportJSON = () => shareFile(
    `anniv-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ app: 'anniv', version: 1, people, settings: { ...settings, snoozes: [] } }, null, 2),
    'application/json',
  );

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*', 'text/csv', 'text/comma-separated-values'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await new File(res.assets[0].uri).text();
      const trimmed = text.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const raw = JSON.parse(trimmed);
        const data = normalizeData(Array.isArray(raw) ? { people: raw } : raw);
        Alert.alert('Importer la sauvegarde', `${data.people.length} anniversaire(s) trouvé(s).`, [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter aux miens', onPress: () => { const r = store.importPeople(data.people); toast(`${r.added} ajouté(s), ${r.skipped} doublon(s)`); } },
          { text: 'Tout remplacer', style: 'destructive', onPress: () => { store.replaceAll({ people: data.people, settings: { ...data.settings, snoozes: [] } }); toast('Sauvegarde restaurée ✔️'); } },
        ]);
      } else {
        const { people: incoming, errors } = parseCSV(text);
        const r = store.importPeople(incoming);
        toast(`${r.added} ajouté(s)${r.skipped ? `, ${r.skipped} doublon(s)` : ''}${errors.length ? `, ${errors.length} ligne(s) ignorée(s)` : ''}`);
      }
    } catch {
      toast('Fichier illisible 😕');
    }
  };

  const wipe = () => {
    if (!people.length) return;
    Alert.alert('Tout effacer ?', 'Tous les anniversaires et rappels seront supprimés. Pense à faire une sauvegarde avant.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Tout effacer', style: 'destructive', onPress: () => { store.replaceAll({ people: [], settings }); toast('Tout a été effacé.'); } },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Card>
        <H2>🔔 Notifications</H2>
        {perm === 'granted' ? (
          <Muted>✅ Activées{count != null ? ` · ${count} rappel${count > 1 ? 's' : ''} programmé${count > 1 ? 's' : ''}` : ''}. Elles arrivent même quand l’app est fermée.</Muted>
        ) : (
          <>
            <Muted>{perm === 'denied' ? '🚫 Notifications bloquées.' : 'Les notifications ne sont pas encore activées.'}</Muted>
            <Button title="Activer les notifications" variant="primary" onPress={enable} style={{ marginTop: 10 }} />
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button small title="Tester : anniversaire" onPress={() => test('birthday')} />
          <Button small title="Tester : cadeau" onPress={() => test('gift')} />
        </View>

        <Text style={{ color: t.text, fontWeight: '600', marginTop: 18, marginBottom: 6 }}>Heure des rappels</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {HOURS.map((h) => <Chip key={h} label={`${h}h`} selected={settings.hour === h} onPress={() => updateSettings({ hour: h })} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {[0, 15, 30, 45].map((m) => <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={settings.minute === m} onPress={() => updateSettings({ minute: m })} />)}
        </View>

        <Text style={{ color: t.text, fontWeight: '600', marginTop: 18, marginBottom: 6 }}>🎂 Rappels d’anniversaire</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {REMINDER_CHOICES.map(([v, l]) => (
            <Chip key={v} label={l} selected={settings.reminders.includes(v)} onPress={() => updateSettings({ reminders: toggle(settings.reminders, v) })} />
          ))}
        </View>

        <Text style={{ color: t.text, fontWeight: '600', marginTop: 18, marginBottom: 6 }}>🎁 Rappels pour acheter le cadeau</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {GIFT_REMINDER_CHOICES.map(([v, l]) => (
            <Chip key={v} label={l} selected={settings.giftReminders.includes(v)} onPress={() => updateSettings({ giftReminders: toggle(settings.giftReminders, v) })} />
          ))}
        </View>
        <Muted style={{ marginTop: 8 }}>
          Envoyés tant que le cadeau n’est pas marqué comme acheté, avec tes idées et ton budget. Désactivables personne par personne.
        </Muted>
      </Card>

      <Card>
        <H2>🎨 Apparence</H2>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="Automatique" selected={settings.theme === 'auto'} onPress={() => updateSettings({ theme: 'auto' })} />
          <Chip label="☀️ Clair" selected={settings.theme === 'light'} onPress={() => updateSettings({ theme: 'light' })} />
          <Chip label="🌙 Sombre" selected={settings.theme === 'dark'} onPress={() => updateSettings({ theme: 'dark' })} />
        </View>
      </Card>

      <Card>
        <H2>💾 Données</H2>
        <Muted>Tes données restent sur ce téléphone. Fais une sauvegarde de temps en temps (Drive, e-mail…).</Muted>
        <View style={{ gap: 8, marginTop: 12 }}>
          <Button title="📇 Importer depuis mes contacts" onPress={() => router.push('/import-contacts')} />
          <Button title="📤 Sauvegarder (JSON)" onPress={exportJSON} />
          <Button title="📊 Exporter pour Excel (CSV)" onPress={() => shareFile('anniversaires.csv', exportCSV(people), 'text/csv')} />
          <Button title="📥 Restaurer / importer un fichier" onPress={importFile} />
          <Button title="✨ Ajouter des exemples" variant="ghost" onPress={() => { const r = store.importPeople(demoPeople()); toast(`${r.added} exemples ajoutés`); }} />
          <Button title="Tout effacer" variant="danger" onPress={wipe} />
        </View>
      </Card>

      <Muted style={{ textAlign: 'center' }}>Anniv v{Constants.expoConfig?.version ?? '1.0.0'} · fait avec ❤️</Muted>
    </ScrollView>
  );
}
