// Planning journalier — timeline horaire des tâches du jour
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Fonts, Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { isFocusTask, FOCUS_PROJECT_IDS } from '../hooks/useFilteredTasks';
import { Task } from '../types';
import { getTodayKey } from '../utils/dateUtils';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';
import SyncIndicator from '../components/SyncIndicator';
import TaskDetailSheet from '../components/TaskDetailSheet';
import PlanningTimeline from '../components/PlanningTimeline';

// ─── Utilitaires date ─────────────────────────────────────────────────────────

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_SHORT = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

function getWeekDays(weekOffset: number): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function parseDayInfo(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return { short: DAY_SHORT[d.getDay()], num: d.getDate(), month: MONTH_SHORT[d.getMonth()], year: d.getFullYear() };
}

function weekRangeLabel(days: string[]): string {
  if (!days.length) return '';
  const s = parseDayInfo(days[0]);
  const e = parseDayInfo(days[6]);
  return s.month === e.month
    ? `${s.num} – ${e.num} ${e.month} ${e.year}`
    : `${s.num} ${s.month} – ${e.num} ${e.month} ${e.year}`;
}

// ─── DayPicker ────────────────────────────────────────────────────────────────

function DayPicker({ weekDays, selectedDate, today, onSelectDate, onPrevWeek, onNextWeek }: {
  weekDays: string[];
  selectedDate: string;
  today: string;
  onSelectDate: (d: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  return (
    <View style={styles.dayPickerWrap}>
      {/* Ligne navigation semaine */}
      <View style={styles.weekNavRow}>
        <TouchableOpacity
          style={styles.weekArrowBtn}
          onPress={onPrevWeek}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.weekArrowText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.weekRangeLabel}>{weekRangeLabel(weekDays)}</Text>

        <TouchableOpacity
          style={styles.weekArrowBtn}
          onPress={onNextWeek}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.weekArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Boutons des 7 jours */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScrollContent}
      >
        {weekDays.map(date => {
          const { short, num } = parseDayInfo(date);
          const isToday    = date === today;
          const isSelected = date === selectedDate;
          return (
            <TouchableOpacity
              key={date}
              style={[
                styles.dayBtn,
                isSelected && styles.dayBtnSelected,
                isToday && !isSelected && styles.dayBtnToday,
              ]}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayShort,
                isSelected && styles.dayShortSelected,
                isToday && !isSelected && { color: Colors.accent },
              ]}>
                {short}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                {num}
              </Text>
              {isToday && (
                <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function TasksScreen() {
  const {
    data, syncNotion, syncStatus, syncError, lastSyncAt,
    addTask, updateTask, toggleTaskOptimistic,
  } = useAppData();

  const today = getTodayKey();
  const [weekOffset,    setWeekOffset]    = useState(0);
  const [selectedDate,  setSelectedDate]  = useState(today);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [editTask,      setEditTask]      = useState<Task | null>(null);
  const [pomodoroTask,  setPomodoroTask]  = useState<Task | null>(null);
  const [toggleErrors,  setToggleErrors]  = useState<Set<string>>(new Set());
  // Fiche détail
  const [detailTask,    setDetailTask]    = useState<Task | null>(null);

  const weekDays     = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const focusProjects = data.projects.filter(p => FOCUS_PROJECT_IDS.includes(p.id as any));

  // Tâches du jour sélectionné (complétées incluses, affichées barrées)
  const dayTasks = useMemo(
    () => data.tasks.filter(t => isFocusTask(t) && t.dueDate === selectedDate),
    [data.tasks, selectedDate],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await syncNotion();
    setRefreshing(false);
  }

  function handlePrevWeek() {
    const next = weekOffset - 1;
    setWeekOffset(next);
    setSelectedDate(getWeekDays(next)[0]);
  }

  function handleNextWeek() {
    const next = weekOffset + 1;
    setWeekOffset(next);
    setSelectedDate(getWeekDays(next)[0]);
  }

  async function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleTaskOptimistic(task.id);
    } catch {
      setToggleErrors(prev => new Set([...prev, task.id]));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        setToggleErrors(prev => { const s = new Set(prev); s.delete(task.id); return s; });
      }, 3000);
    }
  }

  function handlePomodoroComplete(taskId: string) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) updateTask(taskId, { pomodoroCount: task.pomodoroCount + 1 });
  }

  function handleToggleSubtask(taskId: string, subtaskId: string) {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;
    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    );
    updateTask(taskId, { subtasks: updatedSubtasks });
    // Mettre à jour aussi la tâche affichée dans la fiche
    setDetailTask(prev => prev?.id === taskId ? { ...prev, subtasks: updatedSubtasks } : prev);
  }

  function handleOpenDetail(task: Task) {
    setDetailTask(task);
  }

  function handleDetailComplete() {
    if (!detailTask) return;
    handleToggle(detailTask);
    // Mettre à jour l'état local de la fiche
    setDetailTask(prev => prev ? { ...prev, completed: !prev.completed } : prev);
  }

  function handleDetailEdit() {
    if (!detailTask) return;
    setEditTask(detailTask);
    setDetailTask(null);
    setShowModal(true);
  }

  function handleDetailPomodoro() {
    if (!detailTask) return;
    setPomodoroTask(detailTask);
    setDetailTask(null);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SyncIndicator status={syncStatus} lastSyncAt={lastSyncAt} error={syncError} />

      {/* Barre de titre */}
      <View style={styles.titleBar}>
        <View>
          <Text style={styles.screenTitle}>🗓 Planning</Text>
          <Text style={styles.screenSub}>
            {focusProjects.map(p => p.emoji).join('  ')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditTask(null); setShowModal(true); }}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <DayPicker
        weekDays={weekDays}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={setSelectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />

      <PlanningTimeline
        date={selectedDate}
        tasks={dayTasks}
        projects={data.projects}
        toggleErrors={toggleErrors}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
            title="Sync Notion..."
            titleColor={Colors.textSecondary}
          />
        }
        onToggle={handleToggle}
        onPress={handleOpenDetail}
        onLongPress={task => { setEditTask(task); setShowModal(true); }}
      />

      <TaskModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        onSave={task => editTask ? updateTask(task.id, task) : addTask(task)}
        projects={focusProjects}
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

      <TaskDetailSheet
        visible={!!detailTask}
        task={detailTask}
        project={data.projects.find(p => p.id === detailTask?.project)}
        onClose={() => setDetailTask(null)}
        onComplete={handleDetailComplete}
        onEdit={handleDetailEdit}
        onPomodoro={handleDetailPomodoro}
        onToggleSubtask={handleToggleSubtask}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Titre ──────────────────────────────────────────────────────────────────
  titleBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14,
  },
  screenTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 1.3, textShadowColor: Colors.glow, textShadowRadius: 14 },
  screenSub:   { color: Colors.textMuted, fontSize: 16, marginTop: 3, letterSpacing: 4 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  addBtnText: { color: Colors.white, fontSize: 24, lineHeight: 28, fontWeight: '300' },

  // ── DayPicker ──────────────────────────────────────────────────────────────
  dayPickerWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
    paddingBottom: 10,
  },
  weekNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
  },
  weekArrowBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  weekArrowText:   { color: Colors.textSecondary, fontSize: 22, lineHeight: 26 },
  weekRangeLabel:  { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  dayScrollContent: { paddingHorizontal: 10, gap: 6 },
  dayBtn: {
    width: 46, height: 64, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: Colors.surfaceElevated,
  },
  dayBtnSelected: { backgroundColor: Colors.accent },
  dayBtnToday: {
    borderWidth: 1.5, borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  dayShort:         { color: Colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  dayShortSelected: { color: 'rgba(255,255,255,0.7)' },
  dayNum:           { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  dayNumSelected:   { color: Colors.white },
  todayDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: Colors.accent, marginTop: 1,
  },
  todayDotSelected: { backgroundColor: Colors.white },
});
