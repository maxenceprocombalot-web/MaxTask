// Utilitaires de dates en français
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDateFR(isoDate: string): string {
  const d = new Date(isoDate);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function isToday(isoDate: string): boolean {
  return isoDate === getTodayKey();
}

export function isOverdue(isoDate: string): boolean {
  return isoDate < getTodayKey();
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function getDayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return JOURS[d.getDay()].substring(0, 3);
}

export function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getTodayFull(): string {
  const d = new Date();
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
