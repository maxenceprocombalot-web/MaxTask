// Point d'entrée de MaxTask — app de productivité personnelle de Maxence
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AppDataContext, useAppDataState } from './src/hooks/useAppData';
import TabNavigator from './src/navigation/TabNavigator';
import { Colors } from './src/constants/colors';
import {
  requestPermissions,
  scheduleDailyBriefing,
  scheduleWeeklyReview,
} from './src/utils/notifications';

export default function App() {
  const appDataState = useAppDataState();

  useEffect(() => {
    if (!appDataState.loading) {
      initApp();
    }
  }, [appDataState.loading]);

  async function initApp() {
    // Notifications push
    const granted = await requestPermissions();
    if (granted) {
      const { settings } = appDataState.data;
      await scheduleDailyBriefing(settings.briefingTime);
      await scheduleWeeklyReview(settings.weeklyReviewTime, settings.weeklyReviewDay);
    }
    // Synchronisation Notion au démarrage (en arrière-plan)
    appDataState.syncNotion().catch(() => {
      // Best effort — l'UI affiche l'erreur via SyncIndicator
    });
  }

  if (appDataState.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <AppDataContext.Provider value={appDataState}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: Colors.accent,
              background: Colors.background,
              card: Colors.surface,
              text: Colors.textPrimary,
              border: Colors.cardBorder,
              notification: Colors.accent,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <TabNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </AppDataContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
