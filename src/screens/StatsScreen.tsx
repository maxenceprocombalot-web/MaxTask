// Onglet Stats — productivité hebdomadaire
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useAppData } from '../hooks/useAppData';
import { getLast7Days, getDayLabel, getTodayKey } from '../utils/dateUtils';
import { Task } from '../types';
import { generateWeeklyReview } from '../utils/claudeApi';

export default function StatsScreen() {
  const { data, addMessage } = useAppData();
  const [reviewText, setReviewText] = useState('');
  const [loadingReview, setLoadingReview] = useState(false);

  const last7 = getLast7Days();
  const today = getTodayKey();

  // Tâches complétées par jour (7 derniers jours)
  function getCompletedByDay(dateKey: string): number {
    return data.tasks.filter(t => t.completedAt?.startsWith(dateKey)).length;
  }

  const barData = last7.map(d => ({
    date: d,
    label: getDayLabel(d),
    count: getCompletedByDay(d),
    isToday: d === today,
  }));
  const maxBar = Math.max(...barData.map(b => b.count), 1);

  // Score de productivité hebdomadaire (0-100)
  const weekStart = last7[0];
  const mitTotal = data.tasks.filter(t => t.isMIT && t.createdAt >= weekStart).length;
  const mitDone = data.tasks.filter(t => t.isMIT && t.completedAt && t.completedAt >= weekStart).length;
  const normalDone = data.tasks.filter(t => !t.isMIT && t.completedAt && t.completedAt >= weekStart).length;
  const normalTotal = data.tasks.filter(t => !t.isMIT && t.createdAt >= weekStart).length;

  const mitScore = mitTotal > 0 ? (mitDone / mitTotal) * 60 : 0;
  const normalScore = normalTotal > 0 ? Math.min((normalDone / normalTotal) * 40, 40) : 0;
  const productivityScore = Math.round(mitScore + normalScore);

  // Streak — jours consécutifs avec au moins 1 MIT complétée
  let streak = 0;
  for (let i = last7.length - 1; i >= 0; i--) {
    const d = last7[i];
    const mitCompletedThatDay = data.tasks.some(t => t.isMIT && t.completedAt?.startsWith(d));
    if (mitCompletedThatDay) streak++;
    else break;
  }

  // Stats par projet
  const projectStats = data.projects.map(p => ({
    project: p,
    completed: data.tasks.filter(t => t.project === p.id && t.completed).length,
    total: data.tasks.filter(t => t.project === p.id).length,
  })).filter(s => s.total > 0).sort((a, b) => b.completed - a.completed);

  // Tâche la plus récurrente
  const recurrentTasks = data.tasks.filter(t => t.recurrence !== 'none');
  const mostRecurrent = recurrentTasks.length > 0 ? recurrentTasks[0] : null;

  // Meilleur jour (le plus de tâches cette semaine)
  const bestDay = barData.reduce((best, cur) => cur.count > best.count ? cur : best, barData[0]);

  async function handleWeeklyReview() {
    setLoadingReview(true);
    try {
      const text = await generateWeeklyReview(data.tasks, data.settings.anthropicKey);
      setReviewText(text);
    } catch {
      setReviewText('Impossible de générer la weekly review.');
    } finally {
      setLoadingReview(false);
    }
  }

  const scoreColor = productivityScore >= 80 ? Colors.success : productivityScore >= 50 ? Colors.orange : Colors.danger;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>📊 Stats</Text>

      {/* Score de productivité */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreLabel}>Score de la semaine</Text>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{productivityScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.scoreRight}>
          <StatLine label="🎯 MIT" value={`${mitDone}/${mitTotal}`} color={Colors.accent} />
          <StatLine label="✅ Tâches" value={`${normalDone}/${normalTotal}`} color={Colors.success} />
          <StatLine label="🔥 Streak" value={`${streak} jour${streak > 1 ? 's' : ''}`} color={Colors.orange} />
        </View>
      </View>

      {/* Graphique 7 jours */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tâches complétées — 7 derniers jours</Text>
        <View style={styles.barChart}>
          {barData.map((b) => (
            <View key={b.date} style={styles.barItem}>
              <Text style={styles.barValue}>{b.count > 0 ? b.count : ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(b.count / maxBar) * 100}%`,
                      backgroundColor: b.isToday ? Colors.accent : Colors.textMuted,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, b.isToday && { color: Colors.accent }]}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats par projet */}
      {projectStats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Par projet</Text>
          {projectStats.map(({ project, completed, total }) => (
            <View key={project.id} style={styles.projectStatRow}>
              <Text style={styles.projectStatName}>{project.emoji} {project.name}</Text>
              <View style={styles.projectStatBar}>
                <View
                  style={[
                    styles.projectStatFill,
                    { width: `${(completed / Math.max(total, 1)) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.projectStatCount}>{completed}/{total}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Insights</Text>
        {mostRecurrent && (
          <InsightRow icon="🔄" label="Tâche récurrente" value={mostRecurrent.title} />
        )}
        {bestDay.count > 0 && (
          <InsightRow icon="⭐" label="Meilleur jour" value={`${bestDay.label} (${bestDay.count} tâches)`} />
        )}
        <InsightRow icon="🍅" label="Pomodoros total" value={`${data.tasks.reduce((s, t) => s + t.pomodoroCount, 0)}`} />
        <InsightRow icon="📝" label="Tâches créées" value={`${data.tasks.length}`} />
      </View>

      {/* Weekly review Claude */}
      <TouchableOpacity
        style={[styles.reviewBtn, loadingReview && styles.reviewBtnLoading]}
        onPress={handleWeeklyReview}
        disabled={loadingReview}
      >
        {loadingReview ? (
          <ActivityIndicator color={Colors.accent} />
        ) : (
          <Text style={styles.reviewBtnText}>📊 Demander une analyse à Claude</Text>
        )}
      </TouchableOpacity>

      {reviewText !== '' && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Analyse de Claude</Text>
          <Text style={styles.reviewText}>{reviewText}</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function StatLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLineLabel}>{label}</Text>
      <Text style={[styles.statLineValue, { color }]}>{value}</Text>
    </View>
  );
}

function InsightRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightIcon}>{icon}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  screenTitle: {
    color: Colors.textPrimary, fontSize: 28, fontWeight: '700',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  scoreCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 20,
    backgroundColor: Colors.accentLight, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(124,109,250,0.25)',
    flexDirection: 'row', alignItems: 'center',
  },
  scoreLeft: { alignItems: 'center', marginRight: 24 },
  scoreLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  scoreValue: { fontSize: 56, fontWeight: '700', lineHeight: 60 },
  scoreMax: { color: Colors.textMuted, fontSize: 16 },
  scoreRight: { flex: 1, gap: 8 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLineLabel: { color: Colors.textSecondary, fontSize: 13 },
  statLineValue: { fontSize: 14, fontWeight: '600' },
  card: {
    marginHorizontal: 16, marginBottom: 12, padding: 18,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barItem: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { color: Colors.textSecondary, fontSize: 10, marginBottom: 4 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 6 },
  projectStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  projectStatName: { color: Colors.textSecondary, fontSize: 13, width: 130 },
  projectStatBar: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: Colors.surfaceElevated, overflow: 'hidden',
  },
  projectStatFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  projectStatCount: { color: Colors.textMuted, fontSize: 12, width: 36, textAlign: 'right' },
  insightRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.separator, gap: 10,
  },
  insightIcon: { fontSize: 16, width: 24 },
  insightLabel: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  insightValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500', maxWidth: 140, textAlign: 'right' },
  reviewBtn: {
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: Colors.accentLight, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.accent, alignItems: 'center',
  },
  reviewBtnLoading: { opacity: 0.7 },
  reviewBtnText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  reviewCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 18,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  reviewTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  reviewText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
});
