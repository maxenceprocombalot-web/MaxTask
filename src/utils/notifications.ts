// Gestion des notifications push — daily briefing & weekly review
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyBriefing(timeStr: string): Promise<void> {
  const [hour, minute] = timeStr.split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync('daily-briefing').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-briefing',
    content: {
      title: '☀️ Ton briefing du jour est prêt',
      body: 'Ouvre MaxTask pour voir tes priorités du jour avec Claude.',
      data: { type: 'briefing' },
    },
    trigger: {
      hour: isNaN(hour) ? 8 : hour,
      minute: isNaN(minute) ? 0 : minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });
}

export async function scheduleWeeklyReview(timeStr: string, weekday: number): Promise<void> {
  const [hour, minute] = timeStr.split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync('weekly-review').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-review',
    content: {
      title: '📊 Ta weekly review est prête',
      body: 'Bilan de la semaine avec Claude — regarde comment tu t\'en es sorti !',
      data: { type: 'weekly-review' },
    },
    trigger: {
      weekday,
      hour: isNaN(hour) ? 17 : hour,
      minute: isNaN(minute) ? 0 : minute,
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    },
  });
}

export async function sendLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
