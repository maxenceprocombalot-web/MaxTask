// Onglet Aujourd'hui — focus du jour avec badge créneau et filtrage intelligent
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { getTodayKey, getTodayFull, formatDateShort } from '../utils/dateUtils';
import { getCurrentSlotInfo, filterTasksBySlot, SlotInfo, SlotKey } from '../utils/timeSlot';
import { Task } from '../types';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';
import BriefingModal from '../components/BriefingModal';

export default function TodayScreen() {
  const { data, toggleTask, addTask, updateTask } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [slotInfo, setSlotInfo] = useState<SlotInfo>(getCurrentSlotInfo());
  const [showAllTasks, setShowAllTasks] = useState(false);

  // Rafraîchir le créneau toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setSlotInfo(getCurrentSlotInfo());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = getTodayKey();
  const activeTasks = data.tasks.filter(t => !t.completed);
  const completedToday = data.tasks.filter(t => t.completed && t.completedAt?.startsWith(today));

  // MIT filtrées pour ce créneau (ou toutes si weekend)
  const allMIT = activeTasks.filter(t => t.isMIT);
  const slotMIT = slotInfo.slot === 'weekend'
    ? allMIT
    : allMIT.filter(t => !t.timeSlot || t.timeSlot === slotInfo.slot);

  // Tâches non-MIT adaptées au créneau
  const slotTasks = filterTasksBySlot(activeTasks.filter(t => !t.isMIT), slotInfo.slot);

  const allMITCompleted = allMIT.length > 0 && allMIT.every(t => t.completed);
  const totalVisible = slotMIT.length + slotTasks.length;
  const score = `${completedToday.length}/${completedToday.length + totalVisible}`;

  async function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleTask(task.id);
  }

  function handlePomodoroComplete(taskId: string) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) updateTask(taskId, { pomodoroCount: task.pomodoroCount + 1 });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour Maxence 👋</Text>
            <Text style={styles.date}>{getTodayFull()}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.scoreLabel}>Complétées</Text>
            <Text style={styles.scoreText}>
              {completedToday.length}
              <Text style={styles.scoreDivider}>/{completedToday.length + totalVisible}</Text>
            </Text>
            {allMITCompleted && allMIT.length > 0 && (
              <Text style={styles.streak}>🔥 Streak!</Text>
            )}
          </View>
        </View>

        {/* Badge créneau actuel */}
        <SlotBadge info={slotInfo} onBriefing={() => setShowBriefing(true)} />

        {/* Section MIT — filtrées pour le créneau */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Focus du jour</Text>
            <Text style={styles.sectionSubtitle}>{slotMIT.slice(0, 3).length}/3 MIT</Text>
          </View>

          {slotMIT.slice(0, 3).length === 0 ? (
            <View style={styles.emptyMIT}>
              <Text style={styles.emptyMITText}>
                {allMIT.length > 0
                  ? `${allMIT.length} MIT définies — pas pour ce créneau`
                  : 'Aucune MIT définie'}
              </Text>
              <Text style={styles.emptyMITSub}>
                {allMIT.length > 0
                  ? 'Elles apparaîtront dans leur créneau dédié'
                  : 'Ajoute tes 3 tâches les plus importantes'}
              </Text>
            </View>
          ) : (
            slotMIT.slice(0, 3).map(task => (
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

        {/* Tâches du créneau */}
        {slotTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {slotInfo.icon} Tâches {slotInfo.label}
            </Text>
            {slotTasks.map(task => (
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

        {/* Toutes les tâches (toggle) */}
        {activeTasks.length > slotTasks.length + slotMIT.length && (
          <TouchableOpacity
            style={styles.showAllBtn}
            onPress={() => setShowAllTasks(!showAllTasks)}
          >
            <Text style={styles.showAllText}>
              {showAllTasks ? '▲ Masquer' : `▼ Voir toutes les tâches (${activeTasks.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {showAllTasks && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>
              Toutes les tâches actives
            </Text>
            {activeTasks.filter(t => !slotTasks.includes(t) && !slotMIT.includes(t)).map(task => (
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

        {/* Complétées aujourd'hui */}
        {completedToday.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>
              ✅ Complétées ({completedToday.length})
            </Text>
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditTask(null); setShowModal(true); }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TaskModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        onSave={task => editTask ? updateTask(task.id, task) : addTask(task)}
        projects={data.projects}
        editTask={editTask}
        apiKey={data.settings.anthropicKey}
        defaultSlot={slotInfo.slot as any}
      />

      <PomodoroModal
        visible={!!pomodoroTask}
        onClose={() => setPomodoroTask(null)}
        task={pomodoroTask}
        pomodoroDuration={data.settings.pomodoroDuration}
        onPomodoroComplete={handlePomodoroComplete}
      />

      <BriefingModal
        visible={showBriefing}
        onClose={() => setShowBriefing(false)}
        tasks={data.tasks}
        apiKey={data.settings.anthropicKey}
      />
    </View>
  );
}

// --- Badge créneau actuel ---
function SlotBadge({ info, onBriefing }: { info: SlotInfo; onBriefing: () => void }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (info.slot === 'evening-late' || info.slot === 'weekend') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [info.slot]);

  return (
    <View style={styles.slotSection}>
      <Animated.View
        style={[
          styles.slotBadge,
          { borderColor: `${info.color}40`, backgroundColor: `${info.color}12` },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.slotLeft}>
          <Text style={styles.slotIcon}>{info.icon}</Text>
          <View>
            <Text style={[styles.slotLabel, { color: info.color }]}>{info.label}</Text>
            <Text style={styles.slotDescription}>{info.description}</Text>
          </View>
        </View>
        <View style={styles.slotRight}>
          {info.timeRemainingMinutes > 0 && (
            <Text style={[styles.slotRemaining, { color: info.color }]}>
              {info.timeRemaining}
            </Text>
          )}
          <Text style={styles.weekBadge}>Sem. {info.weekType}</Text>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.briefingBtn} onPress={onBriefing}>
        <Text style={styles.briefingBtnText}>☀️ Briefing</Text>
      </TouchableOpacity>
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
  const PRIORITY_DOT: Record<string, string> = {
    high: Colors.danger, normal: Colors.orange, low: Colors.accent,
  };

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
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  greeting: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700' },
  date: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  scoreLabel: { color: Colors.textSecondary, fontSize: 12 },
  scoreText: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700' },
  scoreDivider: { color: Colors.textSecondary, fontSize: 18, fontWeight: '400' },
  streak: { color: Colors.orange, fontSize: 12, marginTop: 2 },

  // Badge créneau
  slotSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, marginBottom: 20,
  },
  slotBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotIcon: { fontSize: 26 },
  slotLabel: { fontSize: 15, fontWeight: '700' },
  slotDescription: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  slotRight: { alignItems: 'flex-end', gap: 4 },
  slotRemaining: { fontSize: 18, fontWeight: '700' },
  weekBadge: {
    color: Colors.textMuted, fontSize: 11,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
  },
  briefingBtn: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  briefingBtnText: { color: Colors.textSecondary, fontSize: 13 },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: 13 },
  emptyMIT: {
    padding: 24, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.cardBorder, borderStyle: 'dashed',
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  emptyMITText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  emptyMITSub: { color: Colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },

  showAllBtn: {
    marginHorizontal: 20, marginBottom: 16, padding: 12,
    alignItems: 'center', borderRadius: 10,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  showAllText: { color: Colors.textSecondary, fontSize: 13 },

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
  taskRowDimmed: { opacity: 0.45 },
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
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: Colors.white, fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
