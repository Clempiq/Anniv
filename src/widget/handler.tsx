import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { AppData } from '../lib/storage';
import { loadData } from '../lib/storage';
import { UpcomingWidget } from './UpcomingWidget';

export const WIDGET_NAME = 'Upcoming';

/** Appelé par Android (ajout, mise à jour périodique, redimensionnement du widget). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED' || props.widgetAction === 'WIDGET_CLICK') return;
  const data = await loadData();
  props.renderWidget(<UpcomingWidget people={data.people} accent={data.settings.accent} width={props.widgetInfo.width} />);
}

/** Rafraîchit le widget quand les données changent dans l'app. */
export function refreshWidget(data: AppData) {
  if (Platform.OS !== 'android') return;
  requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => <UpcomingWidget people={data.people} accent={data.settings.accent} width={info.width} />,
    widgetNotFound: () => {},
  }).catch(() => {});
}
