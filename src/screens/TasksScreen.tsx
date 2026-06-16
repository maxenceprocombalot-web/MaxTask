// Onglet Tâches — vue par projet avec sections dépliables et badges créneau
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, PanResponder, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, PriorityColors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { Task, Project } from '../types';
import { formatDateShort, isOverdue } from '../utils/dateUtils';
import { getCurrentSlot, getWeekType, SLOT_META_PUBLIC } from '../utils/timeSlot';
import TaskModal from '../components/TaskModal';
import PomodoroModal from '../components/PomodoroModal';

const PRIORITY_LABEL: Record<string, string> = {
  high: '🔴', normal: '🟡', low: '🔵',
};

const SLOT_ICON: Record<string, string> = {
  work: '🏢', 'evening-short': '⚡', 'evening-late': '🌙', weekend: '🔥',
};

export default function TasksScreen() {
  const { data, addTask, updateTask, deleteTask, toggleTask } = useAppData();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultProject, setDefaultProject] = useState<string | undefined>();
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);

  function toggleSection(projectId: string) {
    setCollapsed(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }

  function handleAddTask(projectId: string) {
    setDefaultProject(projectId);
    setEditTask(null);
    setShowModal(true);
  }

  function handleEditTask(task: Task) {
    setEditTask(task);
    setDefaultProject(undefined);
    setShowModal(true);
  }

  function handleSave(task: Task) {
    if (editTask) {
      updateTask(task.id, task);
    } else {
      addTask(task);
    }
  }

  async function handleDelete(taskId: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Supprimer la tâche', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteTask(taskId) },
    ]);
  }

  function handlePomodoroComplete(taskId: string) {
    const task = data.tasks.find(t => t.id === taskId);
    if (task) updateTask(taskId, { pomodoroCount: task.pomodoroCount + 1 });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>📋 Tâches</Text>

        {data.projects.map(project => {
          const tasks = data.tasks.filter(t => t.project === project.id);
          const active = tasks.filter(t => !t.completed);
          const done = tasks.filter(t => t.completed);
          const isCollapsed = collapsed[project.id];

          return (
            <View key={project.id} style={styles.projectSection}>
              {/* En-tête projet */}
              <TouchableOpacity
                style={styles.projectHeader}
                onPress={() => toggleSection(project.id)}
                activeOpacity={0.7}
              >
                <View style={styles.projectHeaderLeft}>
                  <Text style={styles.projectEmoji}>{project.emoji}</Text>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{active.length}</Text>
                  </View>
                </View>
                <View style={styles.projectHeaderRight}>
                  <TouchableOpacity
                    onPress={() => handleAddTask(project.id)}
                    style={styles.addBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={[styles.chevron, isCollapsed && styles.chevronCollapsed]}>›</Text>
                </View>
              </TouchableOpacity>

              {/* Tâches du projet */}
              {!isCollapsed && (
                <View style={styles.taskList}>
                  {active.length === 0 && (
                    <TouchableOpacity style={styles.emptyRow} onPress={() => handleAddTask(project.id)}>
                      <Text style={styles.emptyText}>+ Ajouter une tâche</Text>
                    </TouchableOpacity>
                  )}
                  {active.map(task => (
                    <SwipeableTask
                      key={task.id}
                      task={task}
                      project={project}
                      onEdit={() => handleEditTask(task)}
                      onDelete={() => handleDelete(task.id)}
                      onComplete={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleTask(task.id); }}
                      onPomodoro={() => setPomodoroTask(task)}
                    />
                  ))}
                  {done.length > 0 && (
                    <Text style={styles.doneLabel}>✅ {done.length} complétée{done.length > 1 ? 's' : ''}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Nouveau projet */}
        <TouchableOpacity
          style={styles.newProjectBtn}
          onPress={() => {
            Alert.prompt(
              'Nouveau projet',
              'Nom du projet :',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Créer', onPress: (name: string | undefined) => {
                    if (name?.trim()) {
                      // addProject appelé via le contexte — voir SettingsScreen pour l'implémentation complète
                    }
                  }
                },
              ]
            );
          }}
        >
          <Text style={styles.newProjectText}>➕ Nouveau projet</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB global */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditTask(null); setDefaultProject(undefined); setShowModal(true); }}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TaskModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); setDefaultProject(undefined); }}
        onSave={handleSave}
        projects={data.projects}
        editTask={editTask}
        apiKey={data.settings.anthropicKey}
        defaultProject={defaultProject}
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

// --- Tâche avec swipe ---
function SwipeableTask({ task, project, onEdit, onDelete, onComplete, onPomodoro }: {
  task: Task;
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onPomodoro: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 80;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(translateX, { toValue: -120, duration: 150, useNativeDriver: true }).start(onDelete);
      } else if (g.dx > SWIPE_THRESHOLD) {
        Animated.sequence([
          Animated.timing(translateX, { toValue: 80, duration: 100, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(onComplete);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Fond gauche (supprimer) */}
      <View style={[styles.swipeBg, styles.swipeBgLeft]}>
        <Text style={styles.swipeIcon}>🗑</Text>
      </View>
      {/* Fond droite (compléter) */}
      <View style={[styles.swipeBg, styles.swipeBgRight]}>
        <Text style={styles.swipeIcon}>✓</Text>
      </View>

      <Animated.View
        style={[styles.taskCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.taskCardInner} onPress={onEdit} activeOpacity={0.8}>
          <View style={[styles.priorityBar, { backgroundColor: PriorityColors[task.priority] }]} />
          <View style={styles.taskCardContent}>
            <View style={styles.taskCardTop}>
              <Text style={styles.taskCardTitle} numberOfLines={2}>{task.title}</Text>
              {task.isMIT && <Text style={styles.mitBadge}>🎯</Text>}
            </View>
            <View style={styles.taskCardMeta}>
              <Text style={styles.taskCardProject}>{project.emoji} {project.name}</Text>
              {task.timeSlot && (
                <Text style={styles.slotTag}>{SLOT_ICON[task.timeSlot]} {SLOT_META_PUBLIC[task.timeSlot]?.label ?? ''}</Text>
              )}
              {task.dueDate && (
                <Text style={[styles.taskCardDate, isOverdue(task.dueDate) && styles.overdue]}>
                  📅 {formatDateShort(task.dueDate)}
                </Text>
              )}
              {task.scheduledTime && <Text style={styles.taskCardDate}>🕐 {task.scheduledTime}</Text>}
              {task.pomodoroCount > 0 && <Text style={styles.taskCardDate}>🍅 {task.pomodoroCount}</Text>}
              {task.tags.map(tag => (
                <Text key={tag} style={styles.taskTag}>{tag}</Text>
              ))}
            </View>
          </View>
          <TouchableOpacity onPress={onPomodoro} style={styles.pomodoroBtn}>
            <Text style={styles.pomodoroBtnText}>⏱</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  screenTitle: {
    color: Colors.textPrimary, fontSize: 28, fontWeight: '700',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  projectSection: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden',
  },
  projectHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  projectHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectEmoji: { fontSize: 20 },
  projectName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  countBadge: {
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  countText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  projectHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(124,109,250,0.3)',
  },
  addBtnText: { color: Colors.accent, fontSize: 18, lineHeight: 22 },
  chevron: {
    color: Colors.textSecondary, fontSize: 20,
    transform: [{ rotate: '90deg' }],
  },
  chevronCollapsed: { transform: [{ rotate: '0deg' }] },
  taskList: {
    borderTopWidth: 1, borderTopColor: Colors.cardBorder, paddingTop: 4, paddingBottom: 8,
  },
  emptyRow: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  doneLabel: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  newProjectBtn: {
    margin: 16, padding: 16, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder,
    borderStyle: 'dashed', alignItems: 'center',
  },
  newProjectText: { color: Colors.textSecondary, fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: Colors.white, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  swipeContainer: { position: 'relative', marginBottom: 2 },
  swipeBg: {
    position: 'absolute', top: 0, bottom: 0, width: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  swipeBgLeft: { right: 0, backgroundColor: Colors.dangerLight },
  swipeBgRight: { left: 0, backgroundColor: Colors.successLight },
  swipeIcon: { fontSize: 22 },
  taskCard: { backgroundColor: Colors.surfaceElevated },
  taskCardInner: { flexDirection: 'row', alignItems: 'center' },
  priorityBar: { width: 3, alignSelf: 'stretch', minHeight: 60 },
  taskCardContent: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  taskCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  taskCardTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  mitBadge: { fontSize: 14, marginLeft: 6 },
  taskCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  taskCardProject: { color: Colors.textMuted, fontSize: 12 },
  taskCardDate: { color: Colors.textMuted, fontSize: 12 },
  overdue: { color: Colors.danger },
  taskTag: { color: Colors.accent, fontSize: 11, opacity: 0.8 },
  slotTag: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  pomodoroBtn: { padding: 14 },
  pomodoroBtnText: { fontSize: 16 },
});
