import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useStore } from '../../lib/store';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const t = useTheme();
  const { settings } = useStore();
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="gifts" options={{ title: 'Cadeaux' }} />
      <Tabs.Screen name="me" options={{ title: 'Moi' }} />
    </Tabs>
  );
}
