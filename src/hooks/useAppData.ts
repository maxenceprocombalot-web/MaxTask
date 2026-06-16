// Hook principal — état global de l'app via Context
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AppData, Task, Project, Message, AppSettings } from '../types';
import { loadData, saveData } from '../utils/storage';
import { getTodayKey } from '../utils/dateUtils';

interface AppDataContextType {
  data: AppData;
  loading: boolean;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  clearChat: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const AppDataContext = createContext<AppDataContextType | null>(null);

export function useAppData(): AppDataContextType {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData doit être utilisé dans AppDataProvider');
  return ctx;
}

export function useAppDataState(): AppDataContextType {
  const [data, setData] = useState<AppData>({
    tasks: [],
    projects: [],
    stats: [],
    settings: {
      briefingTime: '08:00',
      weeklyReviewTime: '17:00',
      weeklyReviewDay: 5,
      pomodoroDuration: 25,
      anthropicKey: '',
    },
    chatHistory: [],
  });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    const loaded = await loadData();
    setData(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const persist = useCallback(async (updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const addTask = useCallback(async (task: Task) => {
    await persist(d => ({
      ...d,
      tasks: [task, ...d.tasks],
    }));
  }, [persist]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await persist(d => ({
      ...d,
      tasks: d.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, [persist]);

  const deleteTask = useCallback(async (id: string) => {
    await persist(d => ({
      ...d,
      tasks: d.tasks.filter(t => t.id !== id),
    }));
  }, [persist]);

  const toggleTask = useCallback(async (id: string) => {
    await persist(d => {
      const today = getTodayKey();
      return {
        ...d,
        tasks: d.tasks.map(t => {
          if (t.id !== id) return t;
          const completed = !t.completed;
          return {
            ...t,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
          };
        }),
      };
    });
  }, [persist]);

  const addProject = useCallback(async (project: Project) => {
    await persist(d => ({
      ...d,
      projects: [...d.projects, project],
    }));
  }, [persist]);

  const deleteProject = useCallback(async (id: string) => {
    await persist(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
    }));
  }, [persist]);

  const addMessage = useCallback(async (message: Message) => {
    await persist(d => ({
      ...d,
      chatHistory: [...d.chatHistory, message],
    }));
  }, [persist]);

  const clearChat = useCallback(async () => {
    await persist(d => ({ ...d, chatHistory: [] }));
  }, [persist]);

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    await persist(d => ({
      ...d,
      settings: { ...d.settings, ...settings },
    }));
  }, [persist]);

  return {
    data,
    loading,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addProject,
    deleteProject,
    addMessage,
    clearChat,
    updateSettings,
    refreshData,
  };
}
