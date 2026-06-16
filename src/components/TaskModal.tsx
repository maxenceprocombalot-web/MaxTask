// Modal de création/édition de tâche
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Colors, PriorityColors } from '../constants/colors';
import { DEFAULT_TAGS } from '../constants/projects';
import { Task, Priority, EnergyLevel, Recurrence, SubTask } from '../types';
import { decomposeTask } from '../utils/claudeApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  projects: Array<{ id: string; name: string; emoji: string }>;
  editTask?: Task | null;
  apiKey: string;
  defaultProject?: string;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '🔴 Haute', color: Colors.danger },
  { value: 'normal', label: '🟡 Normale', color: Colors.orange },
  { value: 'low', label: '🔵 Basse', color: Colors.accent },
];

const ENERGIES: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: '⚡ Haute' },
  { value: 'medium', label: '🔋 Moyenne' },
  { value: 'low', label: '😴 Basse' },
];

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Aucune' },
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
];

export default function TaskModal({ visible, onClose, onSave, projects, editTask, apiKey, defaultProject }: Props) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaultProject ?? projects[0]?.id ?? '');
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [notes, setNotes] = useState('');
  const [isMIT, setIsMIT] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [decomposing, setDecomposing] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setProjectId(editTask.project);
      setPriority(editTask.priority);
      setDueDate(editTask.dueDate ?? '');
      setScheduledTime(editTask.scheduledTime ?? '');
      setEnergyLevel(editTask.energyLevel);
      setTags(editTask.tags);
      setRecurrence(editTask.recurrence);
      setNotes(editTask.notes ?? '');
      setIsMIT(editTask.isMIT);
      setSubtasks(editTask.subtasks ?? []);
    } else {
      resetForm();
      if (defaultProject) setProjectId(defaultProject);
    }
  }, [editTask, visible, defaultProject]);

  function resetForm() {
    setTitle('');
    setProjectId(defaultProject ?? projects[0]?.id ?? '');
    setPriority('normal');
    setDueDate('');
    setScheduledTime('');
    setEnergyLevel('medium');
    setTags([]);
    setRecurrence('none');
    setNotes('');
    setIsMIT(false);
    setSubtasks([]);
    setDecomposing(false);
  }

  function handleSave() {
    if (!title.trim()) return;
    const task: Task = {
      id: editTask?.id ?? `task_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: title.trim(),
      project: projectId,
      priority,
      dueDate: dueDate || undefined,
      scheduledTime: scheduledTime || undefined,
      energyLevel,
      tags,
      recurrence,
      notes: notes || undefined,
      completed: editTask?.completed ?? false,
      isMIT,
      pomodoroCount: editTask?.pomodoroCount ?? 0,
      createdAt: editTask?.createdAt ?? new Date().toISOString(),
      completedAt: editTask?.completedAt,
      subtasks: subtasks.length ? subtasks : undefined,
    };
    onSave(task);
    resetForm();
    onClose();
  }

  async function handleDecompose() {
    if (!title.trim()) return;
    setDecomposing(true);
    try {
      const items = await decomposeTask(title.trim(), apiKey);
      setSubtasks(items.map((t, i) => ({
        id: `sub_${Date.now()}_${i}`,
        title: t,
        completed: false,
      })));
    } catch {
      // silencieux si erreur
    } finally {
      setDecomposing(false);
    }
  }

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
            <Text style={styles.cancel}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editTask ? 'Modifier' : 'Nouvelle tâche'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={!title.trim()}>
            <Text style={[styles.save, !title.trim() && styles.saveDisabled]}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Titre */}
          <View style={styles.section}>
            <TextInput
              style={styles.titleInput}
              placeholder="Titre de la tâche..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              multiline
            />
          </View>

          {/* MIT toggle */}
          <TouchableOpacity style={styles.mitRow} onPress={() => setIsMIT(!isMIT)}>
            <Text style={styles.label}>🎯 Most Important Task (MIT)</Text>
            <View style={[styles.toggle, isMIT && styles.toggleActive]}>
              <View style={[styles.toggleKnob, isMIT && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

          {/* Projet */}
          <View style={styles.section}>
            <Text style={styles.label}>Projet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {projects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, projectId === p.id && styles.chipActive]}
                  onPress={() => setProjectId(p.id)}
                >
                  <Text style={[styles.chipText, projectId === p.id && styles.chipTextActive]}>
                    {p.emoji} {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Priorité */}
          <View style={styles.section}>
            <Text style={styles.label}>Priorité</Text>
            <View style={styles.row}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.priorityChip, priority === p.value && { borderColor: p.color, backgroundColor: `${p.color}20` }]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={[styles.chipText, priority === p.value && { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date d'échéance</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
            <View style={[styles.section, { flex: 1 }]}>
              <Text style={styles.label}>Heure planifiée</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                placeholderTextColor={Colors.textMuted}
                value={scheduledTime}
                onChangeText={setScheduledTime}
              />
            </View>
          </View>

          {/* Niveau d'énergie */}
          <View style={styles.section}>
            <Text style={styles.label}>Niveau d'énergie requis</Text>
            <View style={styles.row}>
              {ENERGIES.map(e => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.chip, energyLevel === e.value && styles.chipActive]}
                  onPress={() => setEnergyLevel(e.value)}
                >
                  <Text style={[styles.chipText, energyLevel === e.value && styles.chipTextActive]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagsWrap}>
              {DEFAULT_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, tags.includes(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, tags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Récurrence */}
          <View style={styles.section}>
            <Text style={styles.label}>Récurrence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {RECURRENCES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.chip, recurrence === r.value && styles.chipActive]}
                  onPress={() => setRecurrence(r.value)}
                >
                  <Text style={[styles.chipText, recurrence === r.value && styles.chipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Ajoute des notes..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Décomposer avec Claude */}
          <TouchableOpacity
            style={[styles.claudeButton, (!title.trim() || decomposing) && styles.claudeButtonDisabled]}
            onPress={handleDecompose}
            disabled={!title.trim() || decomposing}
          >
            <Text style={styles.claudeButtonText}>
              {decomposing ? '⏳ Décomposition...' : '🤖 Décomposer avec Claude'}
            </Text>
          </TouchableOpacity>

          {/* Sous-tâches générées */}
          {subtasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Sous-tâches ({subtasks.length})</Text>
              {subtasks.map((st, i) => (
                <View key={st.id} style={styles.subtaskRow}>
                  <Text style={styles.subtaskBullet}>•</Text>
                  <TextInput
                    style={styles.subtaskInput}
                    value={st.title}
                    onChangeText={text =>
                      setSubtasks(prev => prev.map((s, idx) => idx === i ? { ...s, title: text } : s))
                    }
                  />
                  <TouchableOpacity onPress={() => setSubtasks(prev => prev.filter((_, idx) => idx !== i))}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  cancel: { color: Colors.textSecondary, fontSize: 16 },
  save: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
  saveDisabled: { opacity: 0.4 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 20 },
  titleInput: {
    color: Colors.textPrimary, fontSize: 22, fontWeight: '600',
    marginTop: 20, paddingVertical: 4,
  },
  mitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: Colors.accentLight, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.textMuted, justifyContent: 'center', padding: 2,
  },
  toggleActive: { backgroundColor: Colors.accent },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white, alignSelf: 'flex-start',
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  chips: { flexDirection: 'row' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
    marginRight: 8, marginBottom: 4,
  },
  chipActive: { backgroundColor: Colors.accentMedium, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 14 },
  chipTextActive: { color: Colors.accent, fontWeight: '600' },
  priorityChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceElevated,
    marginRight: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
    color: Colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  notesInput: { height: 100, textAlignVertical: 'top' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  tagActive: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  tagText: { color: Colors.textSecondary, fontSize: 13 },
  tagTextActive: { color: Colors.accent, fontWeight: '500' },
  claudeButton: {
    marginTop: 24, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.accentMedium, borderWidth: 1, borderColor: Colors.accent,
    alignItems: 'center',
  },
  claudeButtonDisabled: { opacity: 0.5 },
  claudeButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  subtaskBullet: { color: Colors.accent, fontSize: 16, marginRight: 8 },
  subtaskInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  removeBtn: { color: Colors.danger, fontSize: 14, paddingHorizontal: 8 },
});
