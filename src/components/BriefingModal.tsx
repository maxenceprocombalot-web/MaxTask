// Modal Daily Briefing — généré par Claude chaque matin
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { Task } from '../types';
import { generateBriefing } from '../utils/claudeApi';
import { getTodayKey, getTodayFull } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  apiKey: string;
}

const BRIEFING_CACHE_KEY = 'maxtask_briefing_cache';

export default function BriefingModal({ visible, onClose, tasks, apiKey }: Props) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState('');

  useEffect(() => {
    if (visible) {
      loadOrGenerate();
    }
  }, [visible]);

  async function loadOrGenerate() {
    setLoading(true);
    try {
      const today = getTodayKey();
      const cached = await AsyncStorage.getItem(BRIEFING_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) {
          setBriefing(parsed.text);
          setGenerated(parsed.date);
          setLoading(false);
          return;
        }
      }
      // Générer un nouveau briefing
      const text = await generateBriefing(tasks, apiKey);
      setBriefing(text);
      setGenerated(today);
      await AsyncStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify({ date: today, text }));
    } catch {
      setBriefing('Impossible de générer le briefing. Vérifie ta connexion ou ta clé API.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    await AsyncStorage.removeItem(BRIEFING_CACHE_KEY);
    loadOrGenerate();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>☀️ Briefing du jour</Text>
          <TouchableOpacity onPress={handleRegenerate} disabled={loading}>
            <Text style={[styles.regenBtn, loading && styles.disabled]}>↻ Regénérer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>{getTodayFull()}</Text>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Claude prépare ton briefing...</Text>
            </View>
          ) : (
            <Text style={styles.briefingText}>{briefing}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  closeBtn: { color: Colors.textSecondary, fontSize: 16 },
  regenBtn: { color: Colors.accent, fontSize: 14 },
  disabled: { opacity: 0.4 },
  date: {
    color: Colors.textSecondary, fontSize: 14,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: 15 },
  briefingText: { color: Colors.textPrimary, fontSize: 16, lineHeight: 26 },
});
