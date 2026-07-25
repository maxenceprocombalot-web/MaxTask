// Planning journalier — timeline verticale avec heures, blocs de tâches
// positionnés à leur horaire et zones des créneaux d'alternance (semaine A/B)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
  RefreshControlProps,
} from 'react-native';
import { Fonts, Colors, PriorityColors } from '../constants/colors';
import { Task, Project } from '../types';
import { getTodayKey } from '../utils/dateUtils';

// ─── Constantes de grille ─────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;          // hauteur d'une heure en px
const GUTTER_WIDTH = 54;         // colonne des labels d'heure
const DEFAULT_DURATION_MIN = 60; // durée par défaut d'une tâche sans durée
const GRID_END_HOUR = 24;

// ─── Semaine A/B pour une date donnée (même logique que timeSlot.ts) ─────────

function getWeekTypeFor(dateIso: string): 'A' | 'B' {
  const d = new Date(dateIso + 'T12:00:00');
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.floor((d.getTime() - startOfYear.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
  return weekNumber % 2 === 0 ? 'A' : 'B';
}

// ─── Zones de créneaux affichées en fond de grille ────────────────────────────

interface Zone { startHour: number; endHour: number; label: string; color: string; }

function getZonesFor(dateIso: string): Zone[] {
  const day = new Date(dateIso + 'T12:00:00').getDay();
  if (day === 0 || day === 6) {
    return [{ startHour: 9, endHour: 23, label: '🔥 Weekend', color: Colors.success }];
  }
  const workEnd = getWeekTypeFor(dateIso) === 'A' ? 18 : 17;
  return [
    { startHour: 8,       endHour: workEnd, label: '🏢 Boulot',     color: Colors.cyan },
    { startHour: workEnd, endHour: 20,      label: '⚡ Soir court', color: Colors.orange },
    { startHour: 22,      endHour: 24,      label: '🌙 Soir tard',  color: Colors.accent },
  ];
}

// Couleur d'un bloc selon son horaire (cohérente avec les zones)
function blockColor(startMin: number, zones: Zone[]): string {
  const h = startMin / 60;
  for (const z of zones) {
    if (h >= z.startHour && h < z.endHour) return z.color;
  }
  return '#a5b4fc';
}

// ─── Placement des blocs (gestion des chevauchements) ────────────────────────

interface Positioned {
  task: Task;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

function parseTimeMin(time?: string): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return null;
  const min = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return Number.isFinite(min) ? Math.min(min, 24 * 60 - 1) : null;
}

function layoutTasks(tasks: Task[]): Positioned[] {
  const items = tasks
    .map(task => {
      const startMin = parseTimeMin(task.scheduledTime);
      if (startMin === null) return null;
      return {
        task,
        startMin,
        endMin: Math.min(startMin + DEFAULT_DURATION_MIN, 24 * 60),
        col: 0,
        cols: 1,
      };
    })
    .filter((p): p is Positioned => p !== null)
    .sort((a, b) => a.startMin - b.startMin || a.task.title.localeCompare(b.task.title));

  // Clusters de blocs qui se chevauchent → colonnes côte à côte
  let cluster: Positioned[] = [];
  let clusterEnd = -1;
  const closeCluster = () => {
    const nCols = Math.max(...cluster.map(p => p.col), 0) + 1;
    cluster.forEach(p => { p.cols = nCols; });
    cluster = [];
  };
  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) closeCluster();
    // première colonne libre du cluster
    const taken = new Set(
      cluster.filter(p => p.endMin > item.startMin).map(p => p.col),
    );
    let col = 0;
    while (taken.has(col)) col++;
    item.col = col;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) closeCluster();
  return items;
}

// ─── Bloc de tâche ────────────────────────────────────────────────────────────

function TaskBlock({ pos, project, color, gridStartMin, hasError, onToggle, onPress, onLongPress }: {
  pos: Positioned;
  project?: Project;
  color: string;
  gridStartMin: number;
  hasError: boolean;
  onToggle: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { task } = pos;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handleCheck() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onToggle();
  }

  const top    = ((pos.startMin - gridStartMin) / 60) * HOUR_HEIGHT;
  const height = Math.max(((pos.endMin - pos.startMin) / 60) * HOUR_HEIGHT - 3, 40);
  const widthPct = 100 / pos.cols;

  return (
    <TouchableOpacity
      style={[
        styles.block,
        {
          top,
          height,
          left: `${pos.col * widthPct}%`,
          width: `${widthPct}%`,
          borderLeftColor: color,
          backgroundColor: task.completed ? Colors.surface : Colors.surfaceElevated,
        },
        hasError && styles.blockError,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <TouchableOpacity
        onPress={handleCheck}
        style={styles.blockCheckArea}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View style={[
          styles.blockCheckbox,
          { borderColor: color, transform: [{ scale: scaleAnim }] },
          task.completed && { backgroundColor: color },
        ]}>
          {task.completed && <Text style={styles.blockCheckmark}>✓</Text>}
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.blockContent}>
        <Text
          style={[styles.blockTitle, task.completed && styles.blockTitleDone]}
          numberOfLines={height > 52 ? 2 : 1}
        >
          {task.title}
        </Text>
        <Text style={styles.blockMeta} numberOfLines={1}>
          {task.scheduledTime}{project ? `  ${project.emoji}` : ''}
        </Text>
      </View>

      <View style={[styles.blockPriorityDot, { backgroundColor: PriorityColors[task.priority] }]} />
    </TouchableOpacity>
  );
}

// ─── Tâches sans horaire ──────────────────────────────────────────────────────

function UnscheduledRow({ task, project, hasError, onToggle, onPress, onLongPress }: {
  task: Task;
  project?: Project;
  hasError: boolean;
  onToggle: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.unschedRow, hasError && styles.blockError]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <TouchableOpacity
        onPress={onToggle}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      >
        <View style={[styles.blockCheckbox, task.completed && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}>
          {task.completed && <Text style={styles.blockCheckmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <Text
        style={[styles.unschedTitle, task.completed && styles.blockTitleDone]}
        numberOfLines={1}
      >
        {task.title}
      </Text>
      {project && <Text style={styles.unschedProject}>{project.emoji}</Text>}
      <View style={[styles.blockPriorityDot, { backgroundColor: PriorityColors[task.priority] }]} />
    </TouchableOpacity>
  );
}

// ─── Timeline principale ──────────────────────────────────────────────────────

export default function PlanningTimeline({
  date, tasks, projects, toggleErrors, refreshControl,
  onToggle, onPress, onLongPress,
}: {
  date: string;
  tasks: Task[];
  projects: Project[];
  toggleErrors: Set<string>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onToggle: (task: Task) => void;
  onPress: (task: Task) => void;
  onLongPress: (task: Task) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  // Ligne « maintenant » rafraîchie chaque minute
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const zones      = useMemo(() => getZonesFor(date), [date]);
  const positioned = useMemo(() => layoutTasks(tasks), [tasks]);
  const unscheduled = useMemo(
    () => tasks.filter(t => parseTimeMin(t.scheduledTime) === null),
    [tasks],
  );

  // Début de grille : 7h, étendu si une tâche commence plus tôt
  const gridStartHour = useMemo(() => {
    const earliest = positioned.length
      ? Math.floor(Math.min(...positioned.map(p => p.startMin)) / 60)
      : 7;
    return Math.min(7, earliest);
  }, [positioned]);

  const gridStartMin = gridStartHour * 60;
  const hours = useMemo(
    () => Array.from({ length: GRID_END_HOUR - gridStartHour }, (_, i) => gridStartHour + i),
    [gridStartHour],
  );
  const gridHeight = hours.length * HOUR_HEIGHT;

  const isToday = date === getTodayKey();
  const nowTop  = ((nowMin - gridStartMin) / 60) * HOUR_HEIGHT;
  const showNowLine = isToday && nowMin >= gridStartMin && nowMin < 24 * 60;

  // Scroll initial : maintenant (aujourd'hui) ou première tâche, sinon 8h
  useEffect(() => {
    const targetMin = isToday
      ? nowMin
      : positioned.length ? positioned[0].startMin : 8 * 60;
    const y = Math.max(((targetMin - gridStartMin) / 60) * HOUR_HEIGHT - 90, 0);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const findProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ScrollView
      ref={scrollRef}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Tâches sans horaire */}
      {unscheduled.length > 0 && (
        <View style={styles.unschedWrap}>
          <Text style={styles.unschedHeader}>📋 Sans horaire · {unscheduled.length}</Text>
          {unscheduled.map(task => (
            <UnscheduledRow
              key={task.id}
              task={task}
              project={findProject(task.project)}
              hasError={toggleErrors.has(task.id)}
              onToggle={() => onToggle(task)}
              onPress={() => onPress(task)}
              onLongPress={() => onLongPress(task)}
            />
          ))}
        </View>
      )}

      {/* Grille horaire */}
      <View style={[styles.grid, { height: gridHeight }]}>
        {/* Lignes d'heures + labels */}
        {hours.map((h, i) => (
          <View key={h} style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}>
            <Text style={styles.hourLabel}>{String(h).padStart(2, '0')}:00</Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {/* Zones de créneaux */}
        {zones.map(z => {
          const top    = ((z.startHour * 60 - gridStartMin) / 60) * HOUR_HEIGHT;
          const height = (z.endHour - z.startHour) * HOUR_HEIGHT;
          return (
            <View
              key={z.label}
              style={[styles.zone, { top, height, backgroundColor: `${z.color}0d`, borderLeftColor: `${z.color}66` }]}
              pointerEvents="none"
            >
              <Text style={[styles.zoneLabel, { color: z.color }]}>{z.label}</Text>
            </View>
          );
        })}

        {/* Blocs de tâches */}
        <View style={styles.blocksArea}>
          {positioned.map(pos => (
            <TaskBlock
              key={pos.task.id}
              pos={pos}
              project={findProject(pos.task.project)}
              color={blockColor(pos.startMin, zones)}
              gridStartMin={gridStartMin}
              hasError={toggleErrors.has(pos.task.id)}
              onToggle={() => onToggle(pos.task)}
              onPress={() => onPress(pos.task)}
              onLongPress={() => onLongPress(pos.task)}
            />
          ))}
        </View>

        {/* Ligne « maintenant » */}
        {showNowLine && (
          <View style={[styles.nowLine, { top: nowTop }]} pointerEvents="none">
            <View style={styles.nowDot} />
            <View style={styles.nowBar} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 110 },

  // ── Sans horaire ───────────────────────────────────────────────────────────
  unschedWrap: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  unschedHeader: {
    color: Colors.textMuted, fontSize: 10, fontWeight: '700',
    fontFamily: Fonts.mono, textTransform: 'uppercase', letterSpacing: 1.1,
    marginBottom: 8,
  },
  unschedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 6,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  unschedTitle:   { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '500' },
  unschedProject: { fontSize: 13 },

  // ── Grille ─────────────────────────────────────────────────────────────────
  grid: { marginTop: 4 },
  hourRow: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
  },
  hourLabel: {
    width: GUTTER_WIDTH, paddingRight: 8,
    color: Colors.textMuted, fontSize: 10, fontWeight: '600',
    fontFamily: Fonts.mono, textAlign: 'right',
  },
  hourLine: { flex: 1, height: 1, backgroundColor: Colors.separator },

  // ── Zones de créneaux ──────────────────────────────────────────────────────
  zone: {
    position: 'absolute', left: GUTTER_WIDTH, right: 6,
    borderLeftWidth: 2, borderRadius: 4,
  },
  zoneLabel: {
    fontSize: 9, fontWeight: '700', fontFamily: Fonts.mono,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingLeft: 6, paddingTop: 4, opacity: 0.85,
  },

  // ── Blocs ──────────────────────────────────────────────────────────────────
  blocksArea: {
    position: 'absolute', top: 0, bottom: 0,
    left: GUTTER_WIDTH + 10, right: 10,
  },
  block: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 10, borderLeftWidth: 3,
    borderWidth: 1, borderColor: Colors.cardBorder,
    paddingHorizontal: 8, paddingVertical: 6, gap: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 5,
  },
  blockError: { borderColor: Colors.danger },
  blockCheckArea: { paddingTop: 1 },
  blockCheckbox: {
    width: 17, height: 17, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  blockCheckmark: { color: Colors.white, fontSize: 10, fontWeight: '700', lineHeight: 12 },
  blockContent:   { flex: 1 },
  blockTitle:     { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  blockTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  blockMeta:      { color: Colors.textMuted, fontSize: 10, fontFamily: Fonts.mono, marginTop: 2 },
  blockPriorityDot: {
    width: 7, height: 7, borderRadius: 3.5, marginTop: 3,
  },

  // ── Ligne maintenant ───────────────────────────────────────────────────────
  nowLine: {
    position: 'absolute', left: GUTTER_WIDTH - 4, right: 0,
    flexDirection: 'row', alignItems: 'center', zIndex: 10,
  },
  nowDot: {
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger, shadowOpacity: 0.8, shadowRadius: 5,
  },
  nowBar: { flex: 1, height: 1.5, backgroundColor: Colors.danger, opacity: 0.85 },
});
