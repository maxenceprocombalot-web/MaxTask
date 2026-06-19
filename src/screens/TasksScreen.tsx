// Onglet Tâches — vue par jour/créneau, 3 projets focus, sticky sections
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, PriorityColors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { useFilteredTasks, FilterMode, FOCUS_PROJECT_IDS } from '../hooks/useFilteredTasks';
import { Task, Project } from '../types';
import { getTodayKey, formatDateShort } from '../utils/dateUtils';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';
import SyncIndicator from '../components/SyncIndicator';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const MONTH_SHORT = [
  'jan', 'fév', 'mar', 'avr', 'mai', 'jun',
  'jul', 'aoû', 'sep', 'oct', 'nov', 'déc',
];

// ─── Utils date ───────────────────────────────────────────────────────────────

function getWeekDays(weekOffset: number): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  // Lundi = début de semaine (ISO)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function parseDayInfo(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00');
  return {
    short: DAY_SHORT[d.getDay()],
    num: d.getDate(),
    month: MONTH_SHORT[d.getMonth()],
    year: d.getFullYear(),
  };
}

function weekRangeLabel(weekDays: string[]): string {
  if (!weekDays.length) return '';
  const start = parseDayInfo(weekDays[0]);
  const end = parseDayInfo(weekDays[6]);
  if (start.month === end.month) {
    return `${start.num} – ${end.num} ${end.month} ${end.year}`;
  }
  return `${start.num} ${start.month} – ${end.num} ${end.month} ${end.year}`;
}

// ─── Composants visuels ───────────────────────────────────────────────────────

function DayPicker({
  weekDays, selectedDate, today, weekOffset,
  onSelectDate, onPrevWeek, onNextWeek,
}: {
  weekDays: string[];
  selectedDate: string;
  today: string;
  weekOffset: number;
  onSelectDate: (d: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const rangeLabel = weekRangeLabel(weekDays);

  return (
    <View style={styles.dayPickerWrap}>
      <View style={styles.weekNavRow}>
        <TouchableOpacity style={styles.weekArrowBtn} onPress={onPrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.weekArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{rangeLabel}</Text>
        <TouchableOpacity style={styles.weekArrowBtn} onPress={onNextWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.weekArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScrollContent}
      >
        {weekDays.map(date => {
          const { short, num } = parseDayInfo(date);
          const isToday = date === today;
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
              <Text style={[styles.dayShort, isSelected && styles.dayShortSelected, isToday && !isSelected && { color: Colors.accent }]}>
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

function FilterTabs({ mode, onChange }: { mode: FilterMode; onChange: (m: FilterMode) => void }) {
  return (
    <View style={styles.filterTabsRow}>
      {([['day', '📅 Par jour'], ['work', '🏢 Au boulot']] as [FilterMode, string][]).map(([m, label]) => (
        <TouchableOpacity
          key={m}
          style={[styles.filterTab, mode === m && styles.filterTabActive]}
          onPress={() => onChange(m)}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterTabText, mode === m && styles.filterTabTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionHeader({ icon, title, color, count }: { icon: string; title: string; color: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      <View style={[styles.sectionBadge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
        <Text style={[styles.sectionBadgeText, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function TaskRow({
  task, project, completed, hasError,
  onToggle, onEdit, onPomodoro,
}: {
  task: Task;
  project?: Project;
  completed: boolean;
  hasError: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPomodoro: () => void;
}) {
  const checkAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  function handleCheck() {
    Animated.sequence([
      Animated.timing(checkAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
      Animated.timing(checkAnim, { toValue: completed ? 0 : 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle();
  }

  const PRIORITY_COLOR: Record<string, string> = {
    high: Colors.danger,
    normal: Colors.orange,
    low: Colors.accent,
  };
  const PRIORITY_LABEL: Record<string, string> = { high: '🔴', normal: '🟡', low: '🔵' };

  return (
    <TouchableOpacity
      style={[styles.taskRow, hasError && styles.taskRowError]}
      onLongPress={onEdit}
      activeOpacity={0.8}
    >
      {/* Checkbox animée */}
      <TouchableOpacity onPress={handleCheck} style={styles.checkboxArea} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}>
        <Animated.View
          style={[
            styles.checkbox,
            completed && styles.checkboxDone,
            { transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }] },
          ]}
        >
          {completed && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>
      </TouchableOpacity>

      {/* Heure planifiée */}
      {task.scheduledTime ? (
        <Text style={styles.taskTime}>{task.scheduledTime}</Text>
      ) : (
        <View style={styles.taskTimeEmpty} />
      )}

      {/* Titre + projet */}
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, completed && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {project && (
          <Text style={styles.taskProject}>{project.emoji} {project.name}</Text>
        )}
        {task.pomodoroCount > 0 && (
          <Text style={styles.taskMeta}>🍅 {task.pomodoroCount}</Text>
        )}
      </View>

      {/* Badge priorité */}
      <Text style={styles.priorityBadge}>{PRIORITY_LABEL[task.priority]}</Text>

      {/* Pomodoro */}
      <TouchableOpacity onPress={onPomodoro} style={styles.pomodoroBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Text style={styles.pomodoroBtnText}>⏱</Text>
      </TouchableOpacity>

      {/* Indicateur d'erreur de sync */}
      {hasError && <View style={styles.errorDot} />}
    </TouchableOpacity>
  );
}

function EmptyState({ mode, date }: { mode: FilterMode; date: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{mode === 'work' ? '☕' : '🎉'}</Text>
      <Text style={styles.emptyTitle}>
        {mode === 'work'
          ? 'Aucune tâche boulot'
          : `Rien le ${formatDateShort(date)}`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {mode === 'work'
          ? 'Ajoute des tâches avec le créneau 🏢 Boulot'
          : 'Tu es libre ce jour-là — ou ajoute une tâche !'}
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  // taskId → true si erreur Notion en cours (pour rollback visuel)
  const [toggleErrors, setToggleErrors] = useState<Set<string>>(new Set());

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const sections = useFilteredTasks(selectedDate, filterMode);
  const focusProjects = data.projects.filter(p => FOCUS_PROJECT_IDS.includes(p.id as any));

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await syncNotion();
    setRefreshing(false);
  }

  function handlePrevWeek() {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    setSelectedDate(getWeekDays(newOffset)[0]);
  }

  function handleNextWeek() {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    setSelectedDate(getWeekDays(newOffset)[0]);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    if (filterMode === 'work') setFilterMode('day');
  }

  async function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleTaskOptimistic(task.id);
    } catch {
      // Rollback déjà fait dans toggleTaskOptimistic — on affiche juste l'erreur
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

  // ─── ListHeader composant mémoïsé ────────────────────────────────────────

  const ListHeader = useCallback(() => (
    <View>
      <DayPicker
        weekDays={weekDays}
        selectedDate={selectedDate}
        today={today}
        weekOffset={weekOffset}
        onSelectDate={handleSelectDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />
      <FilterTabs mode={filterMode} onChange={setFilterMode} />
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [weekDays, selectedDate, today, filterMode]);

  const isEmpty = sections.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SyncIndicator status={syncStatus} lastSyncAt={lastSyncAt} error={syncError} />

      {/* Titre avec badge projets */}
      <View style={styles.titleBar}>
        <Text style={styles.screenTitle}>📋 Tâches</Text>
        <View style={styles.projectBadges}>
          {focusProjects.map(p => (
            <Text key={p.id} style={styles.projectEmoji}>{p.emoji}</Text>
          ))}
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
          <SectionHeader
            icon={(section as any).icon}
            title={(section as any).title}
            color={(section as any).color}
            count={section.data.length}
          />
        )}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            project={data.projects.find(p => p.id === item.project)}
            completed={item.completed}
            hasError={toggleErrors.has(item.id)}
            onToggle={() => handleToggle(item)}
            onEdit={() => { setEditTask(item); setShowModal(true); }}
            onPomodoro={() => setPomodoroTask(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          isEmpty ? (
            <EmptyState mode={filterMode} date={selectedDate} />
          ) : null
        }
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
        defaultSlot={filterMode === 'work' ? 'work' : undefined}
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
  container: { flex: 1, backgroundColor: Colors.background },
  contentFull: { paddingBottom: 100 },
  contentEmpty: { flexGrow: 1, paddingBottom: 40 },

  // Title bar
  titleBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
    gap: 10,
  },
  screenTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700', flex: 1 },
  projectBadges: { flexDirection: 'row', gap: 6 },
  projectEmoji: { fontSize: 20 },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  addBtnText: { color: Colors.white, fontSize: 22, lineHeight: 26, fontWeight: '300' },

  // Day picker
  dayPickerWrap: {
    backgroundColor: Colors.surface, borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  weekNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  weekArrowBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, backgroundColor: Colors.surfaceElevated,
  },
  weekArrowText: { color: Colors.textSecondary, fontSize: 20, lineHeight: 24 },
  weekLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  dayScrollContent: { paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  dayBtn: {
    width: 44, height: 60, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: Colors.surfaceElevated,
  },
  dayBtnSelected: { backgroundColor: Colors.accent },
  dayBtnToday: {
    borderWidth: 1, borderColor: Colors.accent, backgroundColor: Colors.accentLight,
  },
  dayShort: { color: Colors.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  dayShortSelected: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dayNumSelected: { color: Colors.white },
  todayDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent, marginTop: 2,
  },
  todayDotSelected: { backgroundColor: Colors.white },

  // Filter tabs
  filterTabsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  filterTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.accentMedium, borderColor: Colors.accent,
  },
  filterTabText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  filterTabTextActive: { color: Colors.accent, fontWeight: '600' },

  // Section header (sticky)
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  sectionBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    borderWidth: 1,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },

  // Task row
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12, paddingVertical: 12, gap: 6,
  },
  taskRowError: { backgroundColor: `${Colors.danger}10` },
  checkboxArea: { padding: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkmark: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  taskTime: {
    color: Colors.textMuted, fontSize: 12, fontWeight: '500',
    width: 42, textAlign: 'right',
  },
  taskTimeEmpty: { width: 42 },
  taskContent: { flex: 1 },
  taskTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  taskTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskProject: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  taskMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  priorityBadge: { fontSize: 13 },
  pomodoroBtn: { padding: 6 },
  pomodoroBtnText: { fontSize: 14 },
  errorDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.danger, marginLeft: 4,
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 56 },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
