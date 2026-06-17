// Hook principal — état global + synchronisation Notion
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AppData, Task, Project, Message, AppSettings, SyncStatus } from '../types';
import { loadData, saveData } from '../utils/storage';
import { getTodayKey } from '../utils/dateUtils';
import {
  DbSchema,
  fetchDbSchema,
  queryDatabase,
  createNotionPage,
  updateNotionPage,
  mergeWithNotion,
} from '../utils/notionApi';

const NOTION_TOKEN_ENV = process.env.EXPO_PUBLIC_NOTION_TOKEN ?? '';

interface AppDataContextType {
  data: AppData;
  loading: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  syncError: string | null;
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
  syncNotion: () => Promise<void>;
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
      notionToken: '',
    },
    chatHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [schema, setSchema] = useState<DbSchema | null>(null);

  // Ref pour accéder aux données courantes hors closures React
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const schemaRef = useRef(schema);
  useEffect(() => { schemaRef.current = schema; }, [schema]);

  // Token Notion — priorité au setting utilisateur, sinon la variable d'env
  function getNotionToken(): string {
    return dataRef.current.settings.notionToken || NOTION_TOKEN_ENV;
  }

  // ─── Chargement initial ────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    const loaded = await loadData();
    setData(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ─── Persistence locale ────────────────────────────────────────────────────

  function updateLocal(updater: (prev: AppData) => AppData): AppData {
    let next: AppData = data;
    setData(prev => {
      next = updater(prev);
      saveData(next);
      return next;
    });
    return next;
  }

  // ─── Sync Notion ───────────────────────────────────────────────────────────

  const syncNotion = useCallback(async () => {
    const token = getNotionToken();
    if (!token) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Récupérer le schéma (avec cache AsyncStorage)
      let dbSchema = schemaRef.current;
      if (!dbSchema) {
        dbSchema = await fetchDbSchema(token);
        setSchema(dbSchema);
      }

      // Charger toutes les tâches Notion
      const notionTasks = await queryDatabase(token, dbSchema);

      // Fusionner avec les tâches locales
      setData(prev => {
        const merged = mergeWithNotion(prev.tasks, notionTasks);
        const next = { ...prev, tasks: merged };
        saveData(next);
        return next;
      });

      // Pousser les tâches locales sans notionId vers Notion
      const localWithoutNotion = dataRef.current.tasks.filter(t => !t.notionId && !t.id.startsWith('notion_'));
      for (const task of localWithoutNotion) {
        try {
          const notionId = await createNotionPage(token, dbSchema, task);
          setData(prev => {
            const next = {
              ...prev,
              tasks: prev.tasks.map(t => t.id === task.id ? { ...t, notionId } : t),
            };
            saveData(next);
            return next;
          });
        } catch {
          // Best effort — on continue si une tâche échoue
        }
      }

      setSyncStatus('success');
      setLastSyncAt(new Date().toISOString());
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message ?? 'Erreur de synchronisation Notion');
      // Revenir à idle après 5 secondes pour ne pas bloquer l'UI
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, []);

  // ─── Actions sur les tâches ────────────────────────────────────────────────

  const addTask = useCallback(async (task: Task) => {
    // 1. Sauvegarder localement
    setData(prev => {
      const next = { ...prev, tasks: [task, ...prev.tasks] };
      saveData(next);
      return next;
    });

    // 2. Créer dans Notion (best effort)
    const token = getNotionToken();
    if (!token) return;
    try {
      let dbSchema = schemaRef.current;
      if (!dbSchema) {
        dbSchema = await fetchDbSchema(token);
        setSchema(dbSchema);
      }
      const notionId = await createNotionPage(token, dbSchema, task);
      setData(prev => {
        const next = {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? { ...t, notionId } : t),
        };
        saveData(next);
        return next;
      });
    } catch {
      // Pas grave — la tâche sera poussée au prochain syncNotion
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setData(prev => {
      const next = {
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
      };
      saveData(next);
      return next;
    });
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    // On supprime localement uniquement (Notion garde la trace)
    setData(prev => {
      const next = { ...prev, tasks: prev.tasks.filter(t => t.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    let toggledTask: Task | undefined;

    setData(prev => {
      const tasks = prev.tasks.map(t => {
        if (t.id !== id) return t;
        const completed = !t.completed;
        const updated: Task = {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
        toggledTask = updated;
        return updated;
      });
      const next = { ...prev, tasks };
      saveData(next);
      return next;
    });

    // Mettre à jour le statut dans Notion
    const token = getNotionToken();
    if (!token || !toggledTask?.notionId) return;
    try {
      let dbSchema = schemaRef.current;
      if (!dbSchema) {
        dbSchema = await fetchDbSchema(token);
        setSchema(dbSchema);
      }
      await updateNotionPage(token, dbSchema, toggledTask.notionId, {
        completed: toggledTask.completed,
      });
    } catch {
      // Best effort
    }
  }, []);

  // ─── Actions projets / chat / paramètres ──────────────────────────────────

  const addProject = useCallback(async (project: Project) => {
    setData(prev => {
      const next = { ...prev, projects: [...prev.projects, project] };
      saveData(next);
      return next;
    });
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setData(prev => {
      const next = { ...prev, projects: prev.projects.filter(p => p.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  const addMessage = useCallback(async (message: Message) => {
    setData(prev => {
      const next = { ...prev, chatHistory: [...prev.chatHistory, message] };
      saveData(next);
      return next;
    });
  }, []);

  const clearChat = useCallback(async () => {
    setData(prev => {
      const next = { ...prev, chatHistory: [] };
      saveData(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    setData(prev => {
      const next = { ...prev, settings: { ...prev.settings, ...settings } };
      saveData(next);
      return next;
    });
  }, []);

  return {
    data,
    loading,
    syncStatus,
    lastSyncAt,
    syncError,
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
    syncNotion,
  };
}
