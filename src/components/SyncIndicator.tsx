// Indicateur de synchronisation Notion — barre discrète en haut de l'écran
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { SyncStatus } from '../types';

interface Props {
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
}

export default function SyncIndicator({ status, lastSyncAt, error }: Props) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Afficher/masquer selon le statut
  useEffect(() => {
    if (status === 'idle') {
      Animated.timing(opacityAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    if (status === 'success') {
      // Auto-hide après 2.5s
      const timer = setTimeout(() => {
        Animated.timing(opacityAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Animation de la barre de progression (syncing)
  useEffect(() => {
    if (status === 'syncing') {
      progressAnim.setValue(0);
      progressLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
        ])
      );
      progressLoop.current.start();
    } else {
      progressLoop.current?.stop();
      progressAnim.setValue(status === 'success' ? 1 : 0);
    }
  }, [status]);

  const barColor = status === 'success'
    ? Colors.success
    : status === 'error'
    ? Colors.danger
    : Colors.accent;

  const label = status === 'syncing'
    ? 'Synchronisation Notion...'
    : status === 'success'
    ? `Notion ✓ synchronisé`
    : status === 'error'
    ? `Notion — ${(error ?? 'erreur').slice(0, 40)}`
    : '';

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (status === 'idle') return null;

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      {/* Barre de progression */}
      <View style={styles.track}>
        {status === 'syncing' ? (
          <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: barColor }]} />
        ) : (
          <View style={[styles.bar, { width: '100%', backgroundColor: barColor }]} />
        )}
      </View>
      {/* Label */}
      <Text style={[styles.label, { color: barColor }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.surface,
    paddingTop: 52, // sous la status bar iOS
    paddingBottom: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  track: {
    height: 2,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
