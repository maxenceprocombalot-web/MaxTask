// Client API Notion — synchronisation bidirectionnelle avec la base de tâches
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Priority } from '../types';

export const NOTION_DB_ID = '4b6b99f8-6fbf-4cad-9ecf-d72f298429ac';
const NOTION_API = 'https://api.notion.com/v1';
const SCHEMA_CACHE_KEY = 'maxtask_notion_schema';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DbSchema {
  titleProp: string;
  statusProp?: {
    name: string;
    type: 'status' | 'checkbox' | 'select';
    doneValue: string;      // ex: "Done", "Terminée", "Complété"
    todoValue?: string;     // ex: "To do", "À faire"
  };
  dateProp?: string;
  priorityProp?: string;
  projectProp?: string;
  tagsProp?: string;
  notesProp?: string;
}

export interface NotionTask {
  notionId: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: Priority;
  project?: string;
  tags?: string[];
  notes?: string;
}

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────

function makeHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

async function notionFetch(path: string, token: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: { ...makeHeaders(token), ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Extraction dynamique des propriétés ─────────────────────────────────────

function extractTitle(props: Record<string, any>, titleProp: string): string {
  const p = props[titleProp];
  if (!p) return 'Sans titre';
  const rich = p.title ?? p.rich_text ?? [];
  return rich.map((t: any) => t.plain_text ?? '').join('') || 'Sans titre';
}

function extractCompleted(props: Record<string, any>, schema: DbSchema): boolean {
  if (!schema.statusProp) return false;
  const p = props[schema.statusProp.name];
  if (!p) return false;
  if (schema.statusProp.type === 'checkbox') return p.checkbox ?? false;
  if (schema.statusProp.type === 'status') {
    const name = (p.status?.name ?? '').toLowerCase();
    const doneVal = schema.statusProp.doneValue.toLowerCase();
    return name === doneVal || name.includes('done') || name.includes('terminé') || name.includes('complet') || name.includes('fini');
  }
  if (schema.statusProp.type === 'select') {
    const name = (p.select?.name ?? '').toLowerCase();
    return name.includes('done') || name.includes('terminé') || name.includes('complet');
  }
  return false;
}

function extractDate(props: Record<string, any>, schema: DbSchema): string | undefined {
  if (!schema.dateProp) return undefined;
  return props[schema.dateProp]?.date?.start ?? undefined;
}

function extractPriority(props: Record<string, any>, schema: DbSchema): Priority {
  if (!schema.priorityProp) return 'normal';
  const p = props[schema.priorityProp];
  if (!p) return 'normal';
  const name = (p.select?.name ?? p.multi_select?.[0]?.name ?? '').toLowerCase();
  if (name.includes('haute') || name.includes('high') || name.includes('urgent') || name.includes('élevée')) return 'high';
  if (name.includes('basse') || name.includes('low') || name.includes('faible')) return 'low';
  return 'normal';
}

function extractProject(props: Record<string, any>, schema: DbSchema): string | undefined {
  if (!schema.projectProp) return undefined;
  const p = props[schema.projectProp];
  if (!p) return undefined;
  return p.select?.name ?? p.multi_select?.[0]?.name ?? undefined;
}

function extractTags(props: Record<string, any>, schema: DbSchema): string[] {
  if (!schema.tagsProp) return [];
  const p = props[schema.tagsProp];
  if (!p?.multi_select) return [];
  return p.multi_select.map((t: any) => `#${t.name}`);
}

function extractNotes(props: Record<string, any>, schema: DbSchema): string | undefined {
  if (!schema.notesProp) return undefined;
  const p = props[schema.notesProp];
  const rich = p?.rich_text ?? [];
  const text = rich.map((t: any) => t.plain_text ?? '').join('');
  return text || undefined;
}

// ─── Détecter le schéma de la base ──────────────────────────────────────────

export async function fetchDbSchema(token: string): Promise<DbSchema> {
  // Essayer le cache d'abord
  try {
    const cached = await AsyncStorage.getItem(SCHEMA_CACHE_KEY);
    if (cached) return JSON.parse(cached) as DbSchema;
  } catch { /* ignore */ }

  const db = await notionFetch(`/databases/${NOTION_DB_ID}`, token);
  const props = db.properties ?? {};

  let titleProp = 'Name';
  let statusProp: DbSchema['statusProp'];
  let dateProp: string | undefined;
  let priorityProp: string | undefined;
  let projectProp: string | undefined;
  let tagsProp: string | undefined;
  let notesProp: string | undefined;

  for (const [name, raw] of Object.entries(props)) {
    const p = raw as any;
    const key = name.toLowerCase();

    if (p.type === 'title') {
      titleProp = name;
    }

    // Statut — cherche un type "status" en priorité, puis checkbox
    if (p.type === 'status' && !statusProp) {
      const options: any[] = p.status?.options ?? [];
      const doneOpt = options.find((o: any) => {
        const n = o.name?.toLowerCase() ?? '';
        return n === 'done' || n === 'terminée' || n === 'terminé' || n === 'complet' || n === 'complété' || n === 'fini' || n === 'complete';
      }) ?? options[options.length - 1];
      const todoOpt = options.find((o: any) => {
        const n = o.name?.toLowerCase() ?? '';
        return n === 'not started' || n === 'à faire' || n === 'todo' || n === 'to do' || n === 'en attente';
      }) ?? options[0];
      statusProp = {
        name,
        type: 'status',
        doneValue: doneOpt?.name ?? 'Done',
        todoValue: todoOpt?.name ?? 'Not started',
      };
    }
    if (p.type === 'checkbox' && !statusProp) {
      if (key.includes('done') || key.includes('terminé') || key.includes('complet') || key.includes('fini') || key.includes('check')) {
        statusProp = { name, type: 'checkbox', doneValue: 'true' };
      }
    }
    if (p.type === 'select' && !statusProp) {
      if (key === 'statut' || key === 'status' || key === 'état') {
        const options: any[] = p.select?.options ?? [];
        const doneOpt = options.find((o: any) => ['done','terminé','complet','fini'].includes(o.name?.toLowerCase()));
        const todoOpt = options[0];
        statusProp = {
          name,
          type: 'select',
          doneValue: doneOpt?.name ?? options[options.length - 1]?.name ?? 'Done',
          todoValue: todoOpt?.name,
        };
      }
    }

    if (p.type === 'date' && !dateProp) {
      if (key.includes('date') || key.includes('due') || key.includes('échéance') || key.includes('deadline')) {
        dateProp = name;
      }
    }
    if ((p.type === 'select' || p.type === 'status') && !priorityProp) {
      if (key.includes('priorit') || key === 'importance') priorityProp = name;
    }
    if ((p.type === 'select' || p.type === 'relation') && !projectProp) {
      if (key.includes('projet') || key.includes('project') || key.includes('catégorie') || key.includes('category')) {
        projectProp = name;
      }
    }
    if (p.type === 'multi_select' && !tagsProp) {
      if (key.includes('tag') || key.includes('label') || key.includes('étiquette')) tagsProp = name;
    }
    if (p.type === 'rich_text' && !notesProp) {
      if (key.includes('note') || key.includes('description') || key.includes('détail')) notesProp = name;
    }
  }

  const schema: DbSchema = { titleProp, statusProp, dateProp, priorityProp, projectProp, tagsProp, notesProp };
  await AsyncStorage.setItem(SCHEMA_CACHE_KEY, JSON.stringify(schema));
  return schema;
}

// Invalider le cache schema (ex: après changement de base)
export async function clearSchemaCache(): Promise<void> {
  await AsyncStorage.removeItem(SCHEMA_CACHE_KEY);
}

// ─── Requêter toutes les tâches ──────────────────────────────────────────────

export async function queryDatabase(token: string, schema: DbSchema): Promise<NotionTask[]> {
  const results: any[] = [];
  let cursor: string | undefined;

  do {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    results.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results.map((page: any): NotionTask => ({
    notionId: page.id,
    title: extractTitle(page.properties, schema.titleProp),
    completed: extractCompleted(page.properties, schema),
    dueDate: extractDate(page.properties, schema),
    priority: extractPriority(page.properties, schema),
    project: extractProject(page.properties, schema),
    tags: extractTags(page.properties, schema),
    notes: extractNotes(page.properties, schema),
  }));
}

// ─── Créer une page Notion ───────────────────────────────────────────────────

export async function createNotionPage(token: string, schema: DbSchema, task: Task): Promise<string> {
  const properties: Record<string, any> = {
    [schema.titleProp]: {
      title: [{ text: { content: task.title } }],
    },
  };

  if (schema.statusProp && schema.statusProp.type !== 'checkbox') {
    const todoVal = schema.statusProp.todoValue ?? 'Not started';
    if (schema.statusProp.type === 'status') {
      properties[schema.statusProp.name] = { status: { name: task.completed ? schema.statusProp.doneValue : todoVal } };
    } else {
      properties[schema.statusProp.name] = { select: { name: task.completed ? schema.statusProp.doneValue : todoVal } };
    }
  }
  if (schema.statusProp?.type === 'checkbox') {
    properties[schema.statusProp.name] = { checkbox: task.completed };
  }

  if (schema.dateProp && task.dueDate) {
    properties[schema.dateProp] = { date: { start: task.dueDate } };
  }

  if (schema.notesProp && task.notes) {
    properties[schema.notesProp] = { rich_text: [{ text: { content: task.notes } }] };
  }

  const page = await notionFetch('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties,
    }),
  });

  return page.id as string;
}

// ─── Mettre à jour une page Notion ───────────────────────────────────────────

export async function updateNotionPage(
  token: string,
  schema: DbSchema,
  notionId: string,
  updates: { completed?: boolean; title?: string; dueDate?: string },
): Promise<void> {
  const properties: Record<string, any> = {};

  if (updates.title !== undefined) {
    properties[schema.titleProp] = {
      title: [{ text: { content: updates.title } }],
    };
  }

  if (updates.completed !== undefined && schema.statusProp) {
    const sp = schema.statusProp;
    const doneName = sp.doneValue;
    const todoName = sp.todoValue ?? 'Not started';
    if (sp.type === 'status') {
      properties[sp.name] = { status: { name: updates.completed ? doneName : todoName } };
    } else if (sp.type === 'checkbox') {
      properties[sp.name] = { checkbox: updates.completed };
    } else if (sp.type === 'select') {
      properties[sp.name] = { select: { name: updates.completed ? doneName : todoName } };
    }
  }

  if (updates.dueDate !== undefined && schema.dateProp) {
    properties[schema.dateProp] = updates.dueDate
      ? { date: { start: updates.dueDate } }
      : { date: null };
  }

  if (Object.keys(properties).length === 0) return;

  await notionFetch(`/pages/${notionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

// ─── Convertir NotionTask → Task local ───────────────────────────────────────

export function notionTaskToLocal(notion: NotionTask): Task {
  return {
    id: `notion_${notion.notionId.replace(/-/g, '')}`,
    notionId: notion.notionId,
    title: notion.title,
    project: 'perso',
    priority: notion.priority ?? 'normal',
    dueDate: notion.dueDate,
    energyLevel: 'medium',
    tags: notion.tags ?? [],
    recurrence: 'none',
    notes: notion.notes,
    completed: notion.completed,
    isMIT: false,
    pomodoroCount: 0,
    createdAt: new Date().toISOString(),
    completedAt: notion.completed ? new Date().toISOString() : undefined,
  };
}

// ─── Fusionner tâches Notion et locales ──────────────────────────────────────

export function mergeWithNotion(localTasks: Task[], notionTasks: NotionTask[]): Task[] {
  const notionMap = new Map(notionTasks.map(t => [t.notionId, t]));
  const localNotionIds = new Set(localTasks.filter(t => t.notionId).map(t => t.notionId!));

  // Mettre à jour les tâches locales qui ont un notionId (Notion fait autorité sur le statut)
  const updated = localTasks.map(t => {
    if (!t.notionId) return t;
    const notion = notionMap.get(t.notionId);
    if (!notion) return t;
    return {
      ...t,
      completed: notion.completed,
      completedAt: notion.completed && !t.completedAt ? new Date().toISOString() : (notion.completed ? t.completedAt : undefined),
      title: notion.title || t.title,
      dueDate: notion.dueDate ?? t.dueDate,
    };
  });

  // Ajouter les tâches Notion qui n'existent pas encore en local
  const newFromNotion = notionTasks
    .filter(n => !localNotionIds.has(n.notionId))
    .map(notionTaskToLocal);

  return [...updated, ...newFromNotion];
}
