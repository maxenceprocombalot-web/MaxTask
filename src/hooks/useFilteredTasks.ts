// Hook dérivant les tâches filtrées — source de vérité unique = data.tasks en mémoire
// Aucun appel API ici. Tout est du filtrage client-side mémoïsé.
import { useMemo } from 'react';
import { useAppData } from './useAppData';
import { Task, Priority } from '../types';
import { SlotKey } from '../utils/timeSlot';

// ─── Projets ciblés pour la vue Tâches ───────────────────────────────────────

export const FOCUS_PROJECT_IDS = ['streakly', 'fittrack', 'dealtylab'] as const;
type FocusProjectId = (typeof FOCUS_PROJECT_IDS)[number];

// Exclusion explicite et permanente — double garde-fou en plus du filtre FOCUS
const EXCLUDED_PROJECT_IDS: ReadonlySet<string> = new Set(['ecole']);

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterMode = 'day' | 'work';

export interface TaskSection {
  title: string;
  icon: string;
  slot: SlotKey | 'none';
  color: string;
  data: Task[];
}

// ─── Métadonnées des sections créneau ────────────────────────────────────────

const SLOT_META: Record<string, { title: string; icon: string; color: string; order: number }> = {
  work:            { title: 'Boulot',      icon: '🏢', color: '#565d7a', order: 0 },
  'evening-short': { title: 'Soir court',  icon: '⚡', color: '#f07830', order: 1 },
  'evening-late':  { title: 'Soir tard',   icon: '🌙', color: '#7c6dfa', order: 2 },
  weekend:         { title: 'Weekend',     icon: '🔥', color: '#22c97a', order: 3 },
  none:            { title: 'Sans créneau',icon: '📋', color: '#565d7a', order: 4 },
};

// ─── Tri par heure planifiée → priorité ──────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ─── Filtre défensif : rejette toute tâche hors des 3 projets ciblés ─────────

function isFocusTask(task: Task): boolean {
  if (EXCLUDED_PROJECT_IDS.has(task.project)) return false;
  return FOCUS_PROJECT_IDS.includes(task.project as FocusProjectId);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useFilteredTasks(date: string, mode: FilterMode): TaskSection[] {
  const { data } = useAppData();

  return useMemo(() => {
    // Filtre de base : uniquement les 3 projets, uniquement actives
    const base = data.tasks.filter(t => isFocusTask(t) && !t.completed);

    // Filtre selon le mode
    const filtered = mode === 'work'
      ? base.filter(t => t.timeSlot === 'work')
      : base.filter(t => t.dueDate === date);

    // Trier
    const sorted = sortByTime(filtered);

    // Grouper par créneau
    const groupMap = new Map<string, Task[]>();
    for (const task of sorted) {
      const key = task.timeSlot ?? 'none';
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(task);
    }

    // Construire les sections dans l'ordre défini
    return Object.entries(SLOT_META)
      .sort(([, a], [, b]) => a.order - b.order)
      .filter(([slot]) => groupMap.has(slot))
      .map(([slot, meta]) => ({
        title: meta.title,
        icon: meta.icon,
        color: meta.color,
        slot: slot as SlotKey | 'none',
        data: groupMap.get(slot)!,
      }));
  }, [data.tasks, date, mode]);
}

// ─── Util : tâches complétées pour les 3 projets (pour stats) ────────────────

export function useFocusCompletedToday(): Task[] {
  const { data } = useAppData();
  const today = new Date().toISOString().split('T')[0];
  return useMemo(
    () => data.tasks.filter(t => isFocusTask(t) && t.completed && t.completedAt?.startsWith(today)),
    [data.tasks, today],
  );
}
