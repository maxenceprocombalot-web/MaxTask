// Gestion des créneaux de travail de Maxence — alternance semaines A/B
import { Colors } from '../constants/colors';
import { Task } from '../types';

export type SlotKey = 'work' | 'evening-short' | 'evening-late' | 'weekend' | 'off-hours';

export interface SlotInfo {
  slot: SlotKey;
  weekType: 'A' | 'B';
  workEndHour: number;
  icon: string;
  label: string;
  color: string;
  description: string;
  timeRemaining: string; // ex: "1h30min"
  timeRemainingMinutes: number;
}

// Semaine A (paire) : boulot jusqu'à 18h → soir court 18h-20h
// Semaine B (impaire) : boulot jusqu'à 17h → soir court 17h-20h
export function getWeekType(): 'A' | 'B' {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const weekNumber = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNumber % 2 === 0 ? 'A' : 'B';
}

export function getCurrentSlot(weekType?: 'A' | 'B'): SlotKey {
  const wt = weekType ?? getWeekType();
  const now = new Date();
  const day = now.getDay(); // 0=dim, 6=sam
  const h = now.getHours();
  const m = now.getMinutes();
  const time = h + m / 60;

  if (day === 0 || day === 6) return 'weekend';

  const workEnd = wt === 'A' ? 18 : 17;

  if (time >= 8 && time < workEnd) return 'work';
  if (time >= workEnd && time < 20) return 'evening-short';
  if (time >= 22) return 'evening-late';
  if (time < 0.5) return 'evening-late'; // 00h-00h30
  return 'off-hours'; // 20h-22h : temps libre
}

function formatRemaining(minutes: number): string {
  if (minutes <= 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

function getTimeRemainingMinutes(slot: SlotKey, weekType: 'A' | 'B'): number {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  const endHours: Record<SlotKey, number | null> = {
    work: weekType === 'A' ? 18 : 17,
    'evening-short': 20,
    'evening-late': 24, // minuit
    weekend: null,
    'off-hours': null,
  };

  const end = endHours[slot];
  if (end === null) return 0;
  const remaining = (end - h) * 60 - m;
  return Math.max(remaining, 0);
}

const SLOT_META: Record<SlotKey, { icon: string; label: string; color: string; description: string }> = {
  work: {
    icon: '🏢',
    label: 'Au boulot',
    color: Colors.textSecondary,
    description: 'Tâches légères depuis le PC',
  },
  'evening-short': {
    icon: '⚡',
    label: 'Soir court',
    color: Colors.orange,
    description: '2-3h de travail moyen',
  },
  'evening-late': {
    icon: '🌙',
    label: 'Soir tard',
    color: Colors.accent,
    description: 'Sessions Claude Code intensives',
  },
  weekend: {
    icon: '🔥',
    label: 'Weekend',
    color: Colors.success,
    description: 'Tout est possible !',
  },
  'off-hours': {
    icon: '😴',
    label: 'Temps libre',
    color: Colors.textMuted,
    description: 'Soirée & récupération',
  },
};

export function getCurrentSlotInfo(): SlotInfo {
  const weekType = getWeekType();
  const slot = getCurrentSlot(weekType);
  const meta = SLOT_META[slot];
  const workEndHour = weekType === 'A' ? 18 : 17;
  const remainingMin = getTimeRemainingMinutes(slot, weekType);

  return {
    slot,
    weekType,
    workEndHour,
    ...meta,
    timeRemaining: formatRemaining(remainingMin),
    timeRemainingMinutes: remainingMin,
  };
}

// Filtre les tâches adaptées au créneau courant
export function filterTasksBySlot(tasks: Task[], slot: SlotKey): Task[] {
  if (slot === 'weekend') return tasks; // tout visible le weekend
  if (slot === 'off-hours') return tasks; // afficher quand même

  return tasks.filter(t => {
    if (!t.timeSlot) return true; // pas de créneau → visible partout
    return t.timeSlot === slot;
  });
}

// Description du contexte pour le prompt Claude
export function buildSlotContext(info: SlotInfo): string {
  const lines: string[] = [];
  lines.push(`Créneau actuel : ${info.icon} ${info.label} (Semaine ${info.weekType})`);
  lines.push(`Description : ${info.description}`);

  if (info.timeRemainingMinutes > 0) {
    lines.push(`Temps restant dans ce créneau : ${info.timeRemaining}`);
  }

  const now = new Date();
  const h = now.getHours();
  lines.push(`Heure actuelle : ${String(h).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`);

  if (info.slot === 'work') {
    lines.push('Contexte boulot : PC de bureau, pas de développement, tâches légères uniquement (emails, Notion, TikTok content, planning, recherches).');
  } else if (info.slot === 'evening-short') {
    lines.push(`Contexte soir court : ${info.timeRemaining} disponibles. Corrections légères, prompts Claude Code, design, planification apps.`);
  } else if (info.slot === 'evening-late') {
    lines.push('Contexte soir tard : sessions Claude Code intensives, EAS Build, développement profond.');
  } else if (info.slot === 'weekend') {
    lines.push('Contexte weekend : journée complète disponible, projets lourds, builds, design, sessions longues, enregistrement TikTok.');
  }

  return lines.join('\n');
}

export const SLOT_META_PUBLIC = SLOT_META;
