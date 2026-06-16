// Navigation par onglets — design sombre minimaliste
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/colors';
import TodayScreen from '../screens/TodayScreen';
import TasksScreen from '../screens/TasksScreen';
import ClaudeScreen from '../screens/ClaudeScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabBar({ state, descriptors, navigation }: any) {
  const tabs = [
    { name: 'Aujourd\'hui', icon: '⚡', activeIcon: '⚡' },
    { name: 'Tâches', icon: '📋', activeIcon: '📋' },
    { name: 'Claude', icon: '🤖', activeIcon: '🤖' },
    { name: 'Stats', icon: '📊', activeIcon: '📊' },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.filter((r: any) => r.name !== 'Paramètres').map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = tabs[index];

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
              {tab?.icon ?? '●'}
            </Text>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab?.name ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Aujourd'hui" component={TodayScreen} />
      <Tab.Screen name="Tâches" component={TasksScreen} />
      <Tab.Screen name="Claude" component={ClaudeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingBottom: 28,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20, marginBottom: 3, opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    color: Colors.textMuted, fontSize: 10, fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.accent,
  },
});
