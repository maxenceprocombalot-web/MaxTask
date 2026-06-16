// Intégration API Anthropic Claude
import { Task, Message } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

function buildSystemPrompt(tasks: Task[]): string {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const activeTasks = tasks.filter(t => !t.completed);
  const mitTasks = tasks.filter(t => t.isMIT && !t.completed);
  const completedToday = tasks.filter(t => t.completed && t.completedAt?.startsWith(new Date().toISOString().split('T')[0]));

  const tasksSummary = activeTasks.slice(0, 20).map(t =>
    `- [${t.priority.toUpperCase()}] ${t.title} (${t.project})${t.dueDate ? ` — échéance: ${t.dueDate}` : ''}${t.isMIT ? ' 🎯 MIT' : ''}`
  ).join('\n');

  return `Tu es l'assistant productivité personnel de Maxence, un jeune entrepreneur français. Tu as accès à toutes ses tâches, projets et statistiques. Tu l'aides à prioriser, planifier et exécuter. Ton ton est direct, motivant et concis. Réponds toujours en français.

Date du jour: ${today}

MIT (Most Important Tasks) non complétées:
${mitTasks.map(t => `- ${t.title} (${t.project})`).join('\n') || 'Aucune MIT pour le moment'}

Tâches actives (${activeTasks.length} au total):
${tasksSummary || 'Aucune tâche active'}

Tâches complétées aujourd'hui: ${completedToday.length}

Rappel: garde tes réponses courtes et actionnables. Utilise des emojis avec parcimonie.`;
}

export async function sendMessage(
  userMessage: string,
  history: Message[],
  tasks: Task[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    return demoResponse(userMessage, tasks);
  }

  const messages = history.map(m => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(tasks),
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erreur API: ${response.status} — ${err}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  return data.content[0]?.text ?? 'Pas de réponse';
}

export async function decomposeTask(taskTitle: string, apiKey: string): Promise<string[]> {
  if (!apiKey) {
    return [
      `Définir les objectifs de "${taskTitle}"`,
      `Rechercher les ressources nécessaires`,
      `Créer un plan d'action`,
      `Exécuter la première étape`,
      `Réviser et ajuster`,
    ];
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Décompose cette tâche en 3 à 6 sous-tâches concrètes et actionnables: "${taskTitle}". Réponds uniquement avec une liste JSON de strings, sans texte avant ou après. Exemple: ["Sous-tâche 1", "Sous-tâche 2"]`,
      }],
    }),
  });

  if (!response.ok) return [];
  const data = (await response.json()) as ClaudeResponse;
  const text = data.content[0]?.text ?? '[]';
  try {
    return JSON.parse(text) as string[];
  } catch {
    return text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•*]\s*/, '').trim());
  }
}

export async function generateBriefing(tasks: Task[], apiKey: string): Promise<string> {
  const prompt = `Génère le briefing du matin pour Maxence. Identifie ses 3 MIT suggérées pour aujourd'hui, les tâches en retard urgentes, et donne un message de motivation court et percutant. Sois concis.`;

  if (!apiKey) {
    const mit = tasks.filter(t => t.isMIT && !t.completed).slice(0, 3);
    const mitList = mit.length ? mit.map(t => `• ${t.title}`).join('\n') : "• Définir tes MIT pour aujourd'hui";
    return `☀️ **Bonjour Maxence !**\n\n🎯 **Tes 3 priorités du jour :**\n${mitList}\n\n💪 Tu as le pouvoir de faire de cette journée une victoire. Focus !`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: buildSystemPrompt(tasks),
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) return 'Impossible de générer le briefing.';
  const data = (await response.json()) as ClaudeResponse;
  return data.content[0]?.text ?? '';
}

export async function generateWeeklyReview(tasks: Task[], apiKey: string): Promise<string> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekKey = weekStart.toISOString().split('T')[0];

  const completedThisWeek = tasks.filter(t => t.completedAt && t.completedAt >= weekKey);
  const pending = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]);

  const prompt = `Génère la weekly review de Maxence. Tâches complétées cette semaine: ${completedThisWeek.length}. Tâches en retard: ${pending.length}. Donne 3 priorités pour la semaine prochaine et un bilan motivant.`;

  if (!apiKey) {
    return `📊 **Weekly Review**\n\n✅ **${completedThisWeek.length} tâches complétées** cette semaine\n⚠️ **${pending.length} tâches en retard**\n\n🎯 **3 priorités pour la semaine prochaine :**\n• Définir et exécuter tes MIT chaque jour\n• Réduire le backlog de ${pending.length} tâches en retard\n• Planifier une session de deep work par jour\n\n🔥 Belle semaine ! Continue sur cette lancée.`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: buildSystemPrompt(tasks),
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) return 'Impossible de générer la weekly review.';
  const data = (await response.json()) as ClaudeResponse;
  return data.content[0]?.text ?? '';
}

// Réponses démo sans clé API
function demoResponse(message: string, tasks: Task[]): string {
  const lower = message.toLowerCase();
  if (lower.includes('priorité') || lower.includes('mit')) {
    const mit = tasks.filter(t => t.isMIT && !t.completed).slice(0, 3);
    if (mit.length === 0) return '🎯 Aucune MIT définie pour le moment. Commence par identifier ta tâche la plus impactante et marque-la comme MIT !';
    return `🎯 **Tes 3 priorités :**\n${mit.map((t, i) => `${i + 1}. ${t.title} (${t.project})`).join('\n')}\n\nFocus sur ces tâches avant tout le reste.`;
  }
  if (lower.includes('semaine') || lower.includes('planif')) {
    return '📅 **Plan de semaine** : Commence par lister tes MIT pour chaque jour, bloque des créneaux de deep work le matin, et réserve l\'après-midi pour les tâches légères. Active le mode démo ou ajoute ta clé API pour une planification personnalisée.';
  }
  if (lower.includes('30 minutes') || lower.includes('30min')) {
    const quick = tasks.filter(t => !t.completed && t.energyLevel !== 'high').slice(0, 3);
    return `⚡ En 30 minutes tu peux :\n${quick.length ? quick.map(t => `• ${t.title}`).join('\n') : '• Traiter tes emails\n• Planifier demain\n• Une tâche simple en attente'}\n\nLance un pomodoro et go ! 🍅`;
  }
  return `🤖 Mode démo actif. Ajoute ta clé API Anthropic dans les paramètres pour des réponses personnalisées basées sur tes vraies tâches.\n\n**Ta question :** "${message}"\n\nJe suis prêt à t'aider dès que tu auras configuré l'API !`;
}
