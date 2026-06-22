// Calendrier journalier — tâches du jour groupées par créneau horaire
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, SectionList, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { useFilteredTasks, FOCUS_PROJECT_IDS, TaskSection } from '../hooks/useFilteredTasks';
import { Task, Project } from '../types';
import { getTodayKey, formatDateShort } from '../utils/dateUtils';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';
import SyncIndicator from '../components/SyncIndicator';

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

// ─── SectionHeader sticky ─────────────────────────────────────────────────────

function SlotSectionHeader({ section }: { section: TaskSection }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <View>
          <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
          <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
        </View>
      </View>
      <View style={[styles.sectionBadge, { backgroundColor: `${section.color}18`, borderColor: `${section.color}35` }]}>
        <Text style={[styles.sectionBadgeText, { color: section.color }]}>{section.data.length}</Text>
      </View>
    </View>
  );
}

// ─── Ligne de tâche ───────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<string, string> = { high: '🔴', normal: '🟡', low: '🔵' };

function TaskRow({ task, project, hasError, onToggle, onEdit, onPomodoro }: {
  task: Task;
  project?: Project;
  hasError: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPomodoro: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handleCheck() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 70,  useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1,    useNativeDriver: true, friction: 4 }),
    ]).start();
    onToggle();
  }

  return (
    <TouchableOpacity
      style={[styles.taskRow, hasError && styles.taskRowError]}
      onLongPress={onEdit}
      activeOpacity={0.75}
    >
      {/* Checkbox avec animation bounce */}
      <TouchableOpacity
        onPress={handleCheck}
        style={styles.checkboxArea}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
      >
        <Animated.View style={[styles.checkbox, { transform: [{ scale: scaleAnim }] }]}>
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>
      </TouchableOpacity>

      {/* Heure */}
      {task.scheduledTime
        ? <Text style={styles.taskTime}>{task.scheduledTime}</Text>
        : <View style={styles.taskTimeSpacer} />
      }

      {/* Titre + projet */}
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.taskMetaRow}>
          {project && (
            <Text style={styles.taskProject}>{project.emoji} {project.name}</Text>
          )}
          {task.pomodoroCount > 0 && (
            <Text style={styles.taskPomo}>🍅 {task.pomodoroCount}</Text>
          )}
        </View>
      </View>

      {/* Badge priorité */}
      <Text style={styles.priorityBadge}>{PRIORITY_LABEL[task.priority]}</Text>

      {/* Pomodoro */}
      <TouchableOpacity
        onPress={onPomodoro}
        style={styles.pomodoroBtn}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Text style={styles.pomodoroBtnText}>⏱</Text>
      </TouchableOpacity>

      {hasError && <View style={styles.errorDot} />}
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ date }: { date: string }) {
  const isToday = date === getTodayKey();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>
        {isToday ? 'Rien de prévu aujourd\'hui' : `Rien le ${formatDateShort(date)}`}
      </Text>
      <Text style={styles.emptySubtitle}>
        Tu es libre — ou ajoute une tâche via le bouton +
      </Text>
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

  const weekDays     = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const sections     = useFilteredTasks(selectedDate);
  const focusProjects = data.projects.filter(p => FOCUS_PROJECT_IDS.includes(p.id as any));
  const isEmpty      = sections.length === 0;

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

  // ─── ListHeaderComponent mémoïsé ────────────────────────────────────────────

  const ListHeader = useCallback(() => (
    <DayPicker
      weekDays={weekDays}
      selectedDate={selectedDate}
      today={today}
      onSelectDate={setSelectedDate}
      onPrevWeek={handlePrevWeek}
      onNextWeek={handleNextWeek}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [weekDays, selectedDate, today]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SyncIndicator status={syncStatus} lastSyncAt={lastSyncAt} error={syncError} />

      {/* Barre de titre */}
      <View style={styles.titleBar}>
        <View>
          <Text style={styles.screenTitle}>📅 Calendrier</Text>
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

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
            title="Sync Notion..."
            titleColor={Colors.textSecondary}
          />
        }
        ListHeaderComponent={<ListHeader />}
        renderSectionHeader={({ section }) => (
          <SlotSectionHeader section={section as unknown as TaskSection} />
        )}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            project={data.projects.find(p => p.id === item.project)}
            hasError={toggleErrors.has(item.id)}
            onToggle={() => handleToggle(item)}
            onEdit={() => { setEditTask(item); setShowModal(true); }}
            onPomodoro={() => setPomodoroTask(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={isEmpty ? <EmptyState date={selectedDate} /> : null}
        contentContainerStyle={isEmpty ? styles.contentEmpty : styles.contentFull}
        showsVerticalScrollIndicator={false}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  contentFull:  { paddingBottom: 100 },
  contentEmpty: { flexGrow: 1 },

  // ── Titre ──────────────────────────────────────────────────────────────────
  titleBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14,
  },
  screenTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700' },
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

  // ── Section header (sticky) ────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon:       { fontSize: 18 },
  sectionTitle:      { fontSize: 14, fontWeight: '700' },
  sectionSubtitle:   { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  sectionBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },

  // ── Task row ───────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14, paddingVertical: 13, gap: 8,
  },
  taskRowError: { backgroundColor: `${Colors.danger}0d` },
  checkboxArea: { padding: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark:       { color: Colors.white, fontSize: 13, fontWeight: '700' },
  taskTime:        { color: Colors.textMuted, fontSize: 12, fontWeight: '500', width: 44, textAlign: 'right' },
  taskTimeSpacer:  { width: 44 },
  taskContent:     { flex: 1 },
  taskTitle:       { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  taskTitleDone:   { color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  taskProject:     { color: Colors.textMuted, fontSize: 11 },
  taskPomo:        { color: Colors.textMuted, fontSize: 10 },
  priorityBadge:   { fontSize: 14 },
  pomodoroBtn:     { padding: 6 },
  pomodoroBtnText: { fontSize: 14 },
  errorDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.danger,
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 58 },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 80,
  },
  emptyEmoji:    { fontSize: 56, marginBottom: 18 },
  emptyTitle:    { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
