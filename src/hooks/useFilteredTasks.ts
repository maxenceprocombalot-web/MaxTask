// Hook dérivant les tâches filtrées pour le calendrier journalier
// Source de vérité unique = data.tasks en mémoire — aucun appel API
import { useMemo } from 'react';
import { useAppData } from './useAppData';
import { Task, Priority } from '../types';

// ─── Projets ciblés ──────────────────────────────────────────────────────────

export const FOCUS_PROJECT_IDS = ['streakly', 'fittrack', 'dealtylab'] as const;
type FocusProjectId = (typeof FOCUS_PROJECT_IDS)[number];

// Double garde-fou : allowlist + blocklist explicite
const EXCLUDED_PROJECT_IDS: ReadonlySet<string> = new Set(['ecole']);

// ─── Type section ─────────────────────────────────────────────────────────────

export interface TaskSection {
  key: SlotSectionKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  data: Task[];
}

export type SlotSectionKey = 'work' | 'evening-short' | 'evening-late' | 'other';

// ─── Définition des 3 sections + catch-all ───────────────────────────────────

const SECTION_META: Record<SlotSectionKey, {
  title: string; subtitle: string; icon: string; color: string; order: number;
}> = {
  work:            { title: 'Boulot',     subtitle: '8h – 17h',  icon: '🏢', color: '#6b7280', order: 0 },
  'evening-short': { title: 'Soir court', subtitle: '18h – 20h', icon: '⚡', color: '#f07830', order: 1 },
  'evening-late':  { title: 'Soir tard',  subtitle: '20h – 00h', icon: '🌙', color: '#7c6dfa', order: 2 },
  other:           { title: 'Journée',    subtitle: 'Sans heure', icon: '📋', color: '#565d7a', order: 3 },
};

// ─── Détermine la section d'une tâche ────────────────────────────────────────
// Priorité 1 : scheduledTime → plage horaire
// Priorité 2 : champ timeSlot
// Fallback : 'other'

function getSection(task: Task): SlotSectionKey {
  if (task.scheduledTime) {
    const hour = parseInt(task.scheduledTime.split(':')[0], 10);
    if (hour >= 8 && hour < 18)  return 'work';
    if (hour >= 18 && hour < 20) return 'evening-short';
    if (hour >= 20 || hour < 8)  return 'evening-late';
  }
  if (task.timeSlot === 'work')           return 'work';
  if (task.timeSlot === 'evening-short')  return 'evening-short';
  if (task.timeSlot === 'evening-late')   return 'evening-late';
  return 'other';
}

// ─── Tri : heure planifiée croissante → priorité ─────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ─── Filtre : seulement les 3 projets focus, jamais École/Peillet ────────────

function isFocusTask(task: Task): boolean {
  if (EXCLUDED_PROJECT_IDS.has(task.project)) return false;
  return FOCUS_PROJECT_IDS.includes(task.project as FocusProjectId);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useFilteredTasks(date: string): TaskSection[] {
  const { data } = useAppData();

  return useMemo(() => {
    // 1. Filtre : projets focus uniquement, tâches actives du jour sélectionné
    const dayTasks = data.tasks.filter(
      t => isFocusTask(t) && !t.completed && t.dueDate === date,
    );

    // 2. Trier globalement par heure
    const sorted = sortByTime(dayTasks);

    // 3. Répartir dans les sections
    const groupMap = new Map<SlotSectionKey, Task[]>();
    for (const task of sorted) {
      const key = getSection(task);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(task);
    }

    // 4. Retourner les sections non vides, dans l'ordre défini
    return (Object.entries(SECTION_META) as [SlotSectionKey, typeof SECTION_META[SlotSectionKey]][])
      .sort(([, a], [, b]) => a.order - b.order)
      .filter(([key]) => groupMap.has(key))
      .map(([key, meta]) => ({
        key,
        title: meta.title,
        subtitle: meta.subtitle,
        icon: meta.icon,
        color: meta.color,
        data: groupMap.get(key)!,
      }));
  }, [data.tasks, date]);
}

// ─── Util exposé pour les stats ───────────────────────────────────────────────

export function useFocusCompletedToday(): Task[] {
  const { data } = useAppData();
  const today = new Date().toISOString().split('T')[0];
  return useMemo(
    () => data.tasks.filter(t => isFocusTask(t) && t.completed && t.completedAt?.startsWith(today)),
    [data.tasks, today],
  );
}
