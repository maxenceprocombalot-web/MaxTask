// Timer Pomodoro intégré
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Task } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  pomodoroDuration: number;
  onPomodoroComplete: (taskId: string) => void;
}

type Phase = 'work' | 'shortBreak' | 'longBreak';

const DURATIONS: Record<string, number> = {
  work25: 25,
  work45: 45,
  work60: 60,
  shortBreak: 5,
  longBreak: 15,
};

export default function PomodoroModal({ visible, onClose, task, pomodoroDuration, onPomodoroComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(pomodoroDuration * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [workDuration, setWorkDuration] = useState(pomodoroDuration);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSeconds = useRef(pomodoroDuration * 60);

  useEffect(() => {
    if (visible) {
      resetTimer('work', workDuration);
    } else {
      pause();
    }
  }, [visible]);

  useEffect(() => {
    totalSeconds.current = workDuration * 60;
    if (phase === 'work') {
      setSecondsLeft(workDuration * 60);
      progressAnim.setValue(0);
    }
  }, [workDuration]);

  function resetTimer(newPhase: Phase, duration?: number) {
    pause();
    const dur = newPhase === 'work'
      ? (duration ?? workDuration)
      : newPhase === 'shortBreak' ? 5 : 15;
    totalSeconds.current = dur * 60;
    setPhase(newPhase);
    setSecondsLeft(dur * 60);
    setRunning(false);
    progressAnim.setValue(0);
  }

  function pause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        handlePhaseEnd();
        return 0;
      }
      const next = prev - 1;
      const progress = 1 - next / totalSeconds.current;
      progressAnim.setValue(progress);
      return next;
    });
  }, [phase, sessionCount, task]);

  function handlePhaseEnd() {
    pause();
    setRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (phase === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (task) onPomodoroComplete(task.id);

      if (newCount % 4 === 0) {
        resetTimer('longBreak');
      } else {
        resetTimer('shortBreak');
      }
    } else {
      resetTimer('work');
    }
  }

  function toggleRunning() {
    if (running) {
      pause();
      setRunning(false);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      intervalRef.current = setInterval(tick, 1000);
      setRunning(true);
    }
  }

  useEffect(() => {
    if (running) {
      pause();
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick]);

  useEffect(() => {
    return () => pause();
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const phaseLabel = phase === 'work' ? '🍅 Focus' : phase === 'shortBreak' ? '☕ Pause courte' : '😴 Pause longue';
  const phaseColor = phase === 'work' ? Colors.accent : phase === 'shortBreak' ? Colors.success : Colors.orange;

  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pomodoro</Text>
          <View style={{ width: 60 }} />
        </View>

        {task && (
          <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
        )}

        {/* Phase selector */}
        <View style={styles.phaseRow}>
          {(['work', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.phaseChip, phase === p && { backgroundColor: `${phaseColor}20`, borderColor: phaseColor }]}
              onPress={() => resetTimer(p)}
            >
              <Text style={[styles.phaseChipText, phase === p && { color: phaseColor }]}>
                {p === 'work' ? '🍅 Focus' : p === 'shortBreak' ? '☕ Court' : '😴 Long'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer circulaire */}
        <View style={styles.timerContainer}>
          <View style={styles.timerCircle}>
            <View style={[styles.timerInner, { borderColor: `${phaseColor}30` }]}>
              <Text style={[styles.timerText, { color: phaseColor }]}>{timeStr}</Text>
              <Text style={styles.phaseLabel}>{phaseLabel}</Text>
              <Text style={styles.sessionCount}>Session {sessionCount + 1}</Text>
            </View>
          </View>
        </View>

        {/* Durée de travail */}
        {phase === 'work' && (
          <View style={styles.durationRow}>
            {[25, 45, 60].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, workDuration === d && styles.durationChipActive]}
                onPress={() => setWorkDuration(d)}
              >
                <Text style={[styles.durationText, workDuration === d && styles.durationTextActive]}>{d}min</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contrôles */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetBtn} onPress={() => resetTimer(phase)}>
            <Text style={styles.resetBtnText}>↺</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: phaseColor }]}
            onPress={toggleRunning}
          >
            <Text style={styles.startBtnText}>{running ? '⏸ Pause' : '▶ Démarrer'}</Text>
          </TouchableOpacity>

          <View style={{ width: 52 }} />
        </View>

        {/* Compteur pomodoros de la session */}
        <View style={styles.sessionRow}>
          {Array.from({ length: Math.max(sessionCount, 4) }).map((_, i) => (
            <View key={i} style={[styles.pomoDot, i < sessionCount && styles.pomoDotFilled]} />
          ))}
        </View>

        {task && (
          <Text style={styles.taskPomodoros}>
            🍅 {task.pomodoroCount + sessionCount} pomodoros au total sur cette tâche
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  header: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  closeBtn: { color: Colors.textSecondary, fontSize: 16, width: 60 },
  taskTitle: {
    color: Colors.textPrimary, fontSize: 18, fontWeight: '600',
    textAlign: 'center', paddingHorizontal: 32, marginTop: 20,
  },
  phaseRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  phaseChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceElevated,
  },
  phaseChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  timerContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  timerCircle: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: Colors.surfaceElevated,
  },
  timerInner: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 6, alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 56, fontWeight: '200', letterSpacing: -2 },
  phaseLabel: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  sessionCount: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  durationRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  durationChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceElevated,
  },
  durationChipActive: { backgroundColor: Colors.accentMedium, borderColor: Colors.accent },
  durationText: { color: Colors.textSecondary, fontSize: 14 },
  durationTextActive: { color: Colors.accent, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 40 },
  resetBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  resetBtnText: { color: Colors.textSecondary, fontSize: 22 },
  startBtn: {
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  startBtnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  sessionRow: { flexDirection: 'row', gap: 10, marginTop: 36 },
  pomoDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  pomoDotFilled: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  taskPomodoros: { color: Colors.textMuted, fontSize: 13, marginTop: 16 },
});
