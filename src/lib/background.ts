// Tâche de fond : reprogramme régulièrement les notifications, pour que les rappels
// continuent d'arriver même si l'app n'est pas ouverte pendant des mois.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { autoBackup } from './device';
import { syncNotifications } from './notifications';
import { pruneSnoozes } from './planner';
import { loadData, saveData } from './storage';

export const RESYNC_TASK = 'anniv-resync-notifications';

// Doit être défini au chargement du module (hors composant React).
TaskManager.defineTask(RESYNC_TASK, async () => {
  try {
    const data = await loadData();
    const settings = pruneSnoozes(data.settings);
    if (settings.snoozes.length !== data.settings.snoozes.length) await saveData({ ...data, settings });
    await syncNotifications(data.people, settings);
    autoBackup({ ...data, settings });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundResync(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(RESYNC_TASK)) return;
    await BackgroundTask.registerTaskAsync(RESYNC_TASK, { minimumInterval: 12 * 60 });
  } catch {
    // Non bloquant : les notifications restent programmées à chaque ouverture de l'app.
  }
}
