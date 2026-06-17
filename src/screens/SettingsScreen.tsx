// Écran Paramètres — clé API, notifications, export, réinitialisation
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Share,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { exportData, resetData } from '../utils/storage';
import { Project } from '../types';

export default function SettingsScreen() {
  const { data, updateSettings, addProject, deleteProject, refreshData, syncNotion, syncStatus } = useAppData();
  const [apiKey, setApiKey] = useState(data.settings.anthropicKey);
  const [notionToken, setNotionToken] = useState(data.settings.notionToken);
  const [briefingTime, setBriefingTime] = useState(data.settings.briefingTime);
  const [reviewTime, setReviewTime] = useState(data.settings.weeklyReviewTime);
  const [newProject, setNewProject] = useState('');
  const [newProjectEmoji, setNewProjectEmoji] = useState('📁');

  async function handleSaveSettings() {
    await updateSettings({
      anthropicKey: apiKey.trim(),
      notionToken: notionToken.trim(),
      briefingTime,
      weeklyReviewTime: reviewTime,
    });
    Alert.alert('Sauvegardé', 'Paramètres mis à jour.');
  }

  async function handleSyncNow() {
    await handleSaveSettings();
    await syncNotion();
  }

  async function handlePomodoroDuration(duration: number) {
    await updateSettings({ pomodoroDuration: duration });
  }

  async function handleExport() {
    const json = await exportData();
    await Share.share({ message: json, title: 'MaxTask — Export données' });
  }

  async function handleReset() {
    Alert.alert(
      'Réinitialiser MaxTask',
      'Toutes tes tâches, projets et stats seront supprimés. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser', style: 'destructive',
          onPress: async () => {
            await resetData();
            await refreshData();
            Alert.alert('Réinitialisé', 'L\'app a été remise à zéro.');
          },
        },
      ]
    );
  }

  async function handleAddProject() {
    if (!newProject.trim()) return;
    const project: Project = {
      id: `proj_${Date.now()}`,
      name: newProject.trim(),
      emoji: newProjectEmoji,
    };
    await addProject(project);
    setNewProject('');
    setNewProjectEmoji('📁');
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>⚙️ Paramètres</Text>

      {/* Notion */}
      <Section title="📄 Notion">
        <Text style={styles.inputLabel}>Token Notion</Text>
        <TextInput
          style={styles.input}
          value={notionToken}
          onChangeText={setNotionToken}
          placeholder="secret_..."
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>Paramètres → Mes intégrations sur notion.so</Text>
        <TouchableOpacity
          style={[styles.syncBtn, syncStatus === 'syncing' && styles.syncBtnDisabled]}
          onPress={handleSyncNow}
          disabled={syncStatus === 'syncing'}
        >
          <Text style={styles.syncBtnText}>
            {syncStatus === 'syncing' ? '⏳ Sync en cours...' : '🔄 Synchroniser maintenant'}
          </Text>
        </TouchableOpacity>
      </Section>

      {/* Clé API Claude */}
      <Section title="🤖 Claude IA">
        <Text style={styles.inputLabel}>Clé API Anthropic</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-ant-..."
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>Obtiens ta clé sur console.anthropic.com</Text>
      </Section>

      {/* Notifications */}
      <Section title="🔔 Notifications">
        <Text style={styles.inputLabel}>Heure du daily briefing</Text>
        <TextInput
          style={styles.input}
          value={briefingTime}
          onChangeText={setBriefingTime}
          placeholder="08:00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Heure de la weekly review (vendredi)</Text>
        <TextInput
          style={styles.input}
          value={reviewTime}
          onChangeText={setReviewTime}
          placeholder="17:00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numbers-and-punctuation"
        />
      </Section>

      {/* Pomodoro */}
      <Section title="🍅 Pomodoro">
        <Text style={styles.inputLabel}>Durée de travail par défaut</Text>
        <View style={styles.chipRow}>
          {[25, 45, 60].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, data.settings.pomodoroDuration === d && styles.chipActive]}
              onPress={() => handlePomodoroDuration(d)}
            >
              <Text style={[styles.chipText, data.settings.pomodoroDuration === d && styles.chipTextActive]}>
                {d} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Projets */}
      <Section title="📁 Projets personnalisés">
        {data.projects.map(p => (
          <View key={p.id} style={styles.projectRow}>
            <Text style={styles.projectEmoji}>{p.emoji}</Text>
            <Text style={styles.projectName}>{p.name}</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Supprimer', `Supprimer "${p.name}" ?`, [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => deleteProject(p.id) },
                ]);
              }}
            >
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addProjectRow}>
          <TextInput
            style={styles.emojiInput}
            value={newProjectEmoji}
            onChangeText={setNewProjectEmoji}
            maxLength={2}
            placeholder="📁"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newProject}
            onChangeText={setNewProject}
            placeholder="Nom du projet"
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={handleAddProject}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddProject}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Sauvegarde */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
        <Text style={styles.saveBtnText}>💾 Sauvegarder les paramètres</Text>
      </TouchableOpacity>

      {/* Données */}
      <Section title="🗂 Données">
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>📤 Exporter les données (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleReset}>
          <Text style={[styles.actionBtnText, styles.dangerText]}>⚠️ Réinitialiser MaxTask</Text>
        </TouchableOpacity>
      </Section>

      {/* Version */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>MaxTask v1.0 · Usage personnel de Maxence</Text>
        <Text style={styles.footerText}>Données stockées localement sur cet iPhone</Text>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  screenTitle: {
    color: Colors.textPrimary, fontSize: 28, fontWeight: '700',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  section: { marginBottom: 8 },
  sectionTitle: {
    color: Colors.textSecondary, fontSize: 12, fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  sectionContent: {
    backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, padding: 16, marginBottom: 16,
  },
  syncBtn: {
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(34,201,122,0.12)', borderWidth: 1, borderColor: Colors.success,
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: Colors.success, fontSize: 14, fontWeight: '600' },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
    color: Colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  hint: { color: Colors.textMuted, fontSize: 12, marginTop: 6 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  chipActive: { backgroundColor: Colors.accentMedium, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 14 },
  chipTextActive: { color: Colors.accent, fontWeight: '600' },
  projectRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.separator, gap: 10,
  },
  projectEmoji: { fontSize: 20, width: 28 },
  projectName: { color: Colors.textPrimary, fontSize: 15, flex: 1 },
  deleteBtn: { color: Colors.danger, fontSize: 16, padding: 4 },
  addProjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  emojiInput: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder,
    textAlign: 'center', fontSize: 20, color: Colors.textPrimary,
  },
  addBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.accentMedium, borderWidth: 1, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Colors.accent, fontSize: 22, lineHeight: 26 },
  saveBtn: {
    marginHorizontal: 16, marginBottom: 8, padding: 16,
    backgroundColor: Colors.accentMedium, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.accent, alignItems: 'center',
  },
  saveBtnText: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
  actionBtn: {
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', marginBottom: 8,
  },
  dangerBtn: { borderColor: Colors.dangerLight, backgroundColor: Colors.dangerLight },
  actionBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  dangerText: { color: Colors.danger },
  footer: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  footerText: { color: Colors.textMuted, fontSize: 12 },
});
