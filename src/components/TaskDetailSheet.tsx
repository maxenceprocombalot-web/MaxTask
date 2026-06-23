// Fiche détaillée d'une tâche — s'ouvre au tap
import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Task, Project, SubTask } from '../types';
import { formatDateShort, isOverdue } from '../utils/dateUtils';

// ─── Configs d'affichage ──────────────────────────────────────────────────────

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Priorité haute',   color: Colors.danger,  bg: Colors.dangerLight },
  normal: { label: 'Priorité normale', color: Colors.orange,  bg: Colors.orangeLight },
  low:    { label: 'Priorité basse',   color: Colors.accent,  bg: Colors.accentLight },
};

const ENERGY: Record<string, { label: string; icon: string }> = {
  high:   { label: 'Énergie haute',   icon: '⚡' },
  medium: { label: 'Énergie moyenne', icon: '🔋' },
  low:    { label: 'Énergie basse',   icon: '😴' },
};

const SLOT: Record<string, { label: string; icon: string; color: string }> = {
  work:            { label: 'Boulot (8h–17h)',     icon: '🏢', color: Colors.textSecondary },
  'evening-short': { label: 'Soir court (18h–20h)', icon: '⚡', color: Colors.orange },
  'evening-late':  { label: 'Soir tard (20h–00h)',  icon: '🌙', color: Colors.accent },
  weekend:         { label: 'Weekend',              icon: '🔥', color: Colors.success },
};

const RECURRENCE: Record<string, string> = {
  none:    'Pas de récurrence',
  daily:   '🔁 Quotidienne',
  weekly:  '🔁 Hebdomadaire',
  monthly: '🔁 Mensuelle',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  task: Task | null;
  project?: Project;
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onPomodoro: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function TaskDetailSheet({
  visible, task, project,
  onClose, onComplete, onEdit, onPomodoro, onToggleSubtask,
}: Props) {
  if (!task) return null;

  const prio    = PRIORITY[task.priority];
  const energy  = ENERGY[task.energyLevel];
  const slot    = task.timeSlot ? SLOT[task.timeSlot] : null;
  const recur   = RECURRENCE[task.recurrence];
  const overdue = task.dueDate && isOverdue(task.dueDate) && !task.completed;

  const doneSubtasks  = task.subtasks?.filter(s => s.completed).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ─── En-tête ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            {/* Projet */}
            {project && (
              <View style={styles.projectChip}>
                <Text style={styles.projectEmoji}>{project.emoji}</Text>
                <Text style={styles.projectName}>{project.name}</Text>
              </View>
            )}

            {/* Titre */}
            <Text style={[styles.title, task.completed && styles.titleDone]}>
              {task.title}
            </Text>

            {/* MIT badge */}
            {task.isMIT && (
              <View style={styles.mitBadge}>
                <Text style={styles.mitBadgeText}>🎯 Most Important Task</Text>
              </View>
            )}
          </View>

          {/* ─── Chips info ──────────────────────────────────────────────── */}
          <View style={styles.chipsRow}>
            {/* Priorité */}
            <View style={[styles.chip, { backgroundColor: prio.bg, borderColor: `${prio.color}40` }]}>
              <Text style={[styles.chipText, { color: prio.color }]}>{prio.label}</Text>
            </View>

            {/* Créneau */}
            {slot && (
              <View style={[styles.chip, { backgroundColor: `${slot.color}15`, borderColor: `${slot.color}40` }]}>
                <Text style={[styles.chipText, { color: slot.color }]}>{slot.icon} {slot.label}</Text>
              </View>
            )}

            {/* Énergie */}
            <View style={styles.chip}>
              <Text style={styles.chipText}>{energy.icon} {energy.label}</Text>
            </View>
          </View>

          {/* ─── Détails temporels ───────────────────────────────────────── */}
          <View style={styles.section}>
            {task.scheduledTime && (
              <Row icon="🕐" label="Horaire planifié" value={task.scheduledTime} />
            )}
            {task.dueDate && (
              <Row
                icon="📅"
                label="Date d'échéance"
                value={formatDateShort(task.dueDate)}
                valueColor={overdue ? Colors.danger : undefined}
                suffix={overdue ? '  ⚠️ En retard' : undefined}
              />
            )}
            {task.recurrence !== 'none' && (
              <Row icon="🔁" label="Récurrence" value={recur.replace('🔁 ', '')} />
            )}
            {task.pomodoroCount > 0 && (
              <Row icon="🍅" label="Pomodoros" value={`${task.pomodoroCount} session${task.pomodoroCount > 1 ? 's' : ''}`} />
            )}
            {task.notionId && (
              <Row icon="📄" label="Notion" value="Synchronisé" valueColor={Colors.success} />
            )}
          </View>

          {/* ─── Tags ────────────────────────────────────────────────────── */}
          {task.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {task.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ─── Notes ───────────────────────────────────────────────────── */}
          {task.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{task.notes}</Text>
              </View>
            </View>
          ) : null}

          {/* ─── Sous-tâches ─────────────────────────────────────────────── */}
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Sous-tâches</Text>
                <Text style={styles.sectionCount}>
                  {doneSubtasks}/{totalSubtasks}
                </Text>
              </View>

              {/* Barre de progression */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0}%` },
                  ]}
                />
              </View>

              {task.subtasks.map((sub: SubTask) => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subtaskRow}
                  onPress={() => onToggleSubtask(task.id, sub.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.subtaskCheck, sub.completed && styles.subtaskCheckDone]}>
                    {sub.completed && <Text style={styles.subtaskCheckmark}>✓</Text>}
                  </View>
                  <Text style={[styles.subtaskTitle, sub.completed && styles.subtaskTitleDone]}>
                    {sub.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ─── Boutons d'action ────────────────────────────────────────────── */}
        <View style={styles.actions}>
          {/* Compléter / Rouvrir */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary, task.completed && styles.actionBtnSecondary]}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, task.completed && styles.actionBtnTextSecondary]}>
              {task.completed ? '↩ Rouvrir' : '✓ Marquer terminée'}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            {/* Pomodoro */}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSmall]} onPress={onPomodoro} activeOpacity={0.8}>
              <Text style={styles.actionBtnSmallText}>⏱ Pomodoro</Text>
            </TouchableOpacity>

            {/* Modifier */}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSmall]} onPress={onEdit} activeOpacity={0.8}>
              <Text style={styles.actionBtnSmallText}>✏️ Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Composant ligne info ─────────────────────────────────────────────────────

function Row({ icon, label, value, valueColor, suffix }: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>
        {value}{suffix ?? ''}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.textMuted },
  scroll:   { paddingHorizontal: 20, paddingTop: 8 },

  // En-tête
  header: { marginBottom: 16 },
  projectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  projectEmoji: { fontSize: 16 },
  projectName:  { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 30 },
  titleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  mitBadge: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: Colors.accentLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,109,250,0.3)',
  },
  mitBadgeText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },

  // Section
  section: { marginBottom: 20 },
  sectionLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionCount:   { color: Colors.accent, fontSize: 12, fontWeight: '700' },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  infoIcon:  { fontSize: 16, width: 24 },
  infoLabel: { color: Colors.textSecondary, fontSize: 14, flex: 1 },
  infoValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.accentLight, borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,109,250,0.25)',
  },
  tagText: { color: Colors.accent, fontSize: 12, fontWeight: '500' },

  // Notes
  notesBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    padding: 14,
  },
  notesText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 22 },

  // Sous-tâches
  progressTrack: {
    height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 2,
    marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  subtaskCheck: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  subtaskCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  subtaskCheckmark: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  subtaskTitle:     { color: Colors.textPrimary, fontSize: 14, flex: 1 },
  subtaskTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },

  // Actions
  actions: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.surface, gap: 10,
    paddingBottom: 32,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnPrimary:   { backgroundColor: Colors.accent },
  actionBtnSecondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder },
  actionBtnSmall: {
    flex: 1, paddingVertical: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 12,
  },
  actionBtnText:        { color: Colors.white, fontSize: 15, fontWeight: '700' },
  actionBtnTextSecondary: { color: Colors.textSecondary },
  actionBtnSmallText:   { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
});
