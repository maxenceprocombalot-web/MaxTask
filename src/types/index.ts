// Types principaux de l'application MaxTask

export type Priority = 'high' | 'normal' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
// Créneau de travail de Maxence (alternance semaine A/B)
export type TimeSlot = 'work' | 'evening-short' | 'evening-late' | 'weekend';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  dueDate?: string;
  scheduledTime?: string;
  energyLevel: EnergyLevel;
  tags: string[];
  recurrence: Recurrence;
  notes?: string;
  completed: boolean;
  isMIT: boolean;
  pomodoroCount: number;
  createdAt: string;
  completedAt?: string;
  subtasks?: SubTask[];
  // Créneau de travail où cette tâche est réalisable
  timeSlot?: TimeSlot;
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
}

export interface DailyStats {
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  mitCompleted: number;
  mitTotal: number;
  pomodoroSessions: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AppSettings {
  briefingTime: string;
  weeklyReviewTime: string;
  weeklyReviewDay: number;
  pomodoroDuration: number;
  anthropicKey: string;
}

export interface AppData {
  tasks: Task[];
  projects: Project[];
  stats: DailyStats[];
  settings: AppSettings;
  lastBriefingDate?: string;
  lastWeeklyReviewDate?: string;
  chatHistory: Message[];
}
