// Couche de persistance — tout en local avec AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Task, AppSettings } from '../types';
import { DEFAULT_PROJECTS } from '../constants/projects';

const STORAGE_KEY = 'maxtask_data';

const DEFAULT_SETTINGS: AppSettings = {
  briefingTime: '08:00',
  weeklyReviewTime: '17:00',
  weeklyReviewDay: 5,
  pomodoroDuration: 25,
  anthropicKey: '',
  notionToken: '',
};

// Tâches d'exemple pour la première ouverture — catégorisées par créneau
function buildSampleTasks(): Task[] {
  const now = new Date().toISOString();
  const make = (id: string, overrides: Partial<Task>): Task => ({
    id,
    title: '',
    project: 'perso',
    priority: 'normal',
    energyLevel: 'medium',
    tags: [],
    recurrence: 'none',
    completed: false,
    isMIT: false,
    pomodoroCount: 0,
    createdAt: now,
    ...overrides,
  });

  return [
    // --- 🏢 Boulot ---
    make('sample_w1', {
      title: 'Mettre à jour Notion — pages apps',
      project: 'maxtask', priority: 'normal', energyLevel: 'low',
      timeSlot: 'work', tags: ['#apps'],
    }),
    make('sample_w2', {
      title: 'Planifier contenu TikTok @Streakly semaine',
      project: 'streakly', priority: 'normal', energyLevel: 'low',
      timeSlot: 'work', tags: ['#apps'],
    }),
    make('sample_w3', {
      title: 'Répondre emails Peillet Location',
      project: 'ecole', priority: 'high', energyLevel: 'low',
      timeSlot: 'work', tags: ['#réunion'],
    }),

    // --- ⚡ Soir court ---
    make('sample_e1', {
      title: 'Corriger bug build EAS Streakly',
      project: 'streakly', priority: 'high', energyLevel: 'medium',
      timeSlot: 'evening-short', isMIT: true, tags: ['#apps', '#urgent'],
    }),
    make('sample_e2', {
      title: 'Prompt Claude Code FitTrack design',
      project: 'fittrack', priority: 'normal', energyLevel: 'medium',
      timeSlot: 'evening-short', tags: ['#apps'],
    }),

    // --- 🌙 Soir tard ---
    make('sample_l1', {
      title: 'Session Claude Code — améliorer FitTrack IA',
      project: 'fittrack', priority: 'high', energyLevel: 'high',
      timeSlot: 'evening-late', isMIT: true, tags: ['#apps'],
    }),
    make('sample_l2', {
      title: 'EAS Build Streakly iOS',
      project: 'streakly', priority: 'high', energyLevel: 'high',
      timeSlot: 'evening-late', isMIT: true, tags: ['#apps', '#urgent'],
    }),

    // --- 🔥 Weekend ---
    make('sample_we1', {
      title: 'Design FitTrack IA avec Claude Design',
      project: 'fittrack', priority: 'high', energyLevel: 'high',
      timeSlot: 'weekend', tags: ['#apps'],
    }),
    make('sample_we2', {
      title: 'Enregistrer vidéos TikTok @Streakly',
      project: 'streakly', priority: 'normal', energyLevel: 'medium',
      timeSlot: 'weekend', tags: ['#apps'],
    }),
    make('sample_we3', {
      title: 'Session longue Claude Code NutriChef IA',
      project: 'perso', priority: 'normal', energyLevel: 'high',
      timeSlot: 'weekend', tags: ['#apps', '#perso'],
    }),
  ];
}

const DEFAULT_DATA: AppData = {
  tasks: [],
  projects: DEFAULT_PROJECTS,
  stats: [],
  settings: DEFAULT_SETTINGS,
  chatHistory: [],
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Première ouverture — on précharge les tâches d'exemple
      const data: AppData = { ...DEFAULT_DATA, tasks: buildSampleTasks() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      projects: parsed.projects?.length ? parsed.projects : DEFAULT_PROJECTS,
    };
  } catch {
    return { ...DEFAULT_DATA, tasks: buildSampleTasks() };
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function exportData(): Promise<string> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ?? '{}';
}

export async function resetData(): Promise<void> {
  const data: AppData = { ...DEFAULT_DATA, tasks: buildSampleTasks() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
