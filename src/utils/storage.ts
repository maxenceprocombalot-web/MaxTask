// Couche de persistance — tout en local avec AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Task, Project, DailyStats, Message, AppSettings } from '../types';
import { DEFAULT_PROJECTS } from '../constants/projects';

const STORAGE_KEY = 'maxtask_data';

const DEFAULT_SETTINGS: AppSettings = {
  briefingTime: '08:00',
  weeklyReviewTime: '17:00',
  weeklyReviewDay: 5, // vendredi
  pomodoroDuration: 25,
  anthropicKey: '',
};

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
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      projects: parsed.projects?.length ? parsed.projects : DEFAULT_PROJECTS,
    };
  } catch {
    return DEFAULT_DATA;
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
}
