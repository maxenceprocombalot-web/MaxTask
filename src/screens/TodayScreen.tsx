// Onglet Aujourd'hui — vue focus du jour avec MIT
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { getTodayKey, getTodayFull, formatDateShort } from '../utils/dateUtils';
import { Task } from '../types';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';

export default function TodayScreen() {
  const { data, toggleTask, addTask, updateTask } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = getTodayKey();
  const todayTasks = data.tasks.filter(t =>
    !t.completed &&
    (
      t.dueDate === today ||
      t.scheduledTime !== undefined ||
      t.isMIT
    )
  );
  const mitTasks = data.tasks.filter(t => t.isMIT && !t.completed);
  const completedToday = data.tasks.filter(t => t.completed && t.completedAt?.startsWith(today));
  const allMitCompleted = mitTasks.length > 0 && mitTasks.every(t => t.completed);
  const totalToday = [...todayTasks, ...completedToday.filter(t => t.isMIT || t.dueDate === today)];

  const scoreText = `${completedToday.length}/${Math.max(totalToday.length + completedToday.length, completedToday.length)} complétées`;

  async function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleTask(task.id);
  }

  function handlePomodoroComplete(taskId: string) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      updateTask(taskId, { pomodoroCount: task.pomodoroCount + 1 });
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour Maxence 👋</Text>
            <Text style={styles.date}>{getTodayFull()}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Aujourd'hui</Text>
            <Text style={styles.scoreText}>{completedToday.length}<Text style={styles.scoreDivider}>/{Math.max(todayTasks.length + completedToday.filter(t => t.dueDate === today || t.isMIT).length, completedToday.length)}</Text></Text>
            {allMitCompleted && <Text style={styles.streak}>🔥 Streak!</Text>}
          </View>
        </View>

        {/* Section MIT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Focus du jour</Text>
            <Text style={styles.sectionSubtitle}>{mitTasks.slice(0, 3).length}/3 MIT</Text>
          </View>

          {mitTasks.slice(0, 3).length === 0 ? (
            <View style={styles.emptyMIT}>
              <Text style={styles.emptyMITText}>Aucune MIT définie</Text>
              <Text style={styles.emptyMITSub}>Ajoute tes 3 tâches les plus importantes</Text>
            </View>
          ) : (
            mitTasks.slice(0, 3).map(task => (
              <MITCard
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onEdit={() => { setEditTask(task); setShowModal(true); }}
                onPomodoro={() => setPomodoroTask(task)}
                project={data.projects.find(p => p.id === task.project)}
              />
            ))
          )}
        </View>

        {/* Tâches du jour */}
        {todayTasks.filter(t => !t.isMIT).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Toutes les tâches du jour</Text>
            {todayTasks.filter(t => !t.isMIT).map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onEdit={() => { setEditTask(task); setShowModal(true); }}
                onPomodoro={() => setPomodoroTask(task)}
                project={data.projects.find(p => p.id === task.project)}
              />
            ))}
          </View>
        )}

        {/* Complétées aujourd'hui */}
        {completedToday.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>✅ Complétées ({completedToday.length})</Text>
            {completedToday.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onEdit={() => { setEditTask(task); setShowModal(true); }}
                onPomodoro={() => setPomodoroTask(task)}
                project={data.projects.find(p => p.id === task.project)}
                dimmed
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditTask(null); setShowModal(true); }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TaskModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        onSave={task => editTask ? updateTask(task.id, task) : addTask(task)}
        projects={data.projects}
        editTask={editTask}
        apiKey={data.settings.anthropicKey}
      />

      <PomodoroModal
        visible={!!pomodoroTask}
        onClose={() => setPomodoroTask(null)}
        task={pomodoroTask}
        pomodoroDuration={data.settings.pomodoroDuration}
        onPomodoroComplete={handlePomodoroComplete}
      />
    </View>
  );
}

// --- Carte MIT grande ---
function MITCard({ task, onToggle, onEdit, onPomodoro, project }: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onPomodoro: () => void;
  project?: { emoji: string; name: string };
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(onToggle);
  }

  return (
    <Animated.View style={[styles.mitCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={styles.mitCheckArea} onPress={handlePress} activeOpacity={0.8}>
        <View style={[styles.mitCheck, task.completed && styles.mitCheckDone]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.mitContent}>
          <Text style={[styles.mitTitle, task.completed && styles.doneText]}>{task.title}</Text>
          <View style={styles.mitMeta}>
            {project && <Text style={styles.metaChip}>{project.emoji} {project.name}</Text>}
            {task.pomodoroCount > 0 && <Text style={styles.metaChip}>🍅 {task.pomodoroCount}</Text>}
            {task.dueDate && <Text style={styles.metaChip}>📅 {formatDateShort(task.dueDate)}</Text>}
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.mitActions}>
        <TouchableOpacity onPress={onPomodoro} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>⏱</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// --- Ligne tâche normale ---
function TaskRow({ task, onToggle, onEdit, onPomodoro, project, dimmed }: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onPomodoro: () => void;
  project?: { emoji: string; name: string };
  dimmed?: boolean;
}) {
  const PRIORITY_DOT: Record<string, string> = { high: Colors.danger, normal: Colors.orange, low: Colors.accent };

  return (
    <TouchableOpacity
      style={[styles.taskRow, dimmed && styles.taskRowDimmed]}
      onPress={onToggle}
      onLongPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={[styles.checkCircle, task.completed && styles.checkCircleDone]}>
        {task.completed && <Text style={styles.checkmarkSmall}>✓</Text>}
      </View>
      <View style={styles.taskRowContent}>
        <Text style={[styles.taskRowTitle, task.completed && styles.doneText]}>{task.title}</Text>
        <View style={styles.mitMeta}>
          {project && <Text style={styles.metaSmall}>{project.emoji} {project.name}</Text>}
          {task.dueDate && <Text style={styles.metaSmall}>📅 {formatDateShort(task.dueDate)}</Text>}
          {task.pomodoroCount > 0 && <Text style={styles.metaSmall}>🍅 {task.pomodoroCount}</Text>}
        </View>
      </View>
      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_DOT[task.priority] }]} />
      <TouchableOpacity onPress={onPomodoro} style={styles.timerBtn}>
        <Text style={styles.timerBtnText}>⏱</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24,
  },
  greeting: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700' },
  date: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  scoreContainer: { alignItems: 'flex-end' },
  scoreLabel: { color: Colors.textSecondary, fontSize: 12 },
  scoreText: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700' },
  scoreDivider: { color: Colors.textSecondary, fontSize: 18, fontWeight: '400' },
  streak: { color: Colors.orange, fontSize: 13, marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: 13 },
  emptyMIT: {
    padding: 24, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.cardBorder, borderStyle: 'dashed',
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  emptyMITText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  emptyMITSub: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  mitCard: {
    backgroundColor: Colors.accentLight, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(124,109,250,0.25)',
    marginBottom: 10, overflow: 'hidden',
  },
  mitCheckArea: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  mitCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2,
  },
  mitCheckDone: { backgroundColor: Colors.accent },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  mitContent: { flex: 1 },
  mitTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  mitMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaChip: {
    color: Colors.textSecondary, fontSize: 12,
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, overflow: 'hidden',
  },
  mitActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: 'rgba(124,109,250,0.15)',
    paddingHorizontal: 12, paddingVertical: 8, gap: 4,
  },
  actionBtn: { padding: 8 },
  actionBtnText: { fontSize: 16 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    padding: 14, marginBottom: 8,
  },
  taskRowDimmed: { opacity: 0.5 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkCircleDone: { borderColor: Colors.success, backgroundColor: Colors.success },
  checkmarkSmall: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  taskRowContent: { flex: 1 },
  taskRowTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  doneText: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  metaSmall: { color: Colors.textMuted, fontSize: 11 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 8 },
  timerBtn: { padding: 6 },
  timerBtnText: { fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: Colors.white, fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
