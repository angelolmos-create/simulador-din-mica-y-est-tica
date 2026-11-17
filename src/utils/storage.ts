import type { NotebookEntry, QuizDraft, SavedState, TopicId } from '../types/physics';
import { QUIZZES_BY_TOPIC } from '../data/quizzes';
import { shuffleArray } from './format';

const STORE_KEY = 'labFuerzasMovimiento_react_v1';

const DEFAULT_STATE: SavedState = {
  done: { flat: {}, incline: {}, pulley: {} },
  quizBest: { flat: -1, incline: -1, pulley: -1 },
  quizDrafts: {},
  rows: [],
};

export function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return structuredClone(DEFAULT_STATE);
    return {
      done: {
        flat: parsed.done?.flat && typeof parsed.done.flat === 'object' ? parsed.done.flat : {},
        incline: parsed.done?.incline && typeof parsed.done.incline === 'object' ? parsed.done.incline : {},
        pulley: parsed.done?.pulley && typeof parsed.done.pulley === 'object' ? parsed.done.pulley : {},
      },
      quizBest: {
        flat: typeof parsed.quizBest?.flat === 'number' ? parsed.quizBest.flat : -1,
        incline: typeof parsed.quizBest?.incline === 'number' ? parsed.quizBest.incline : -1,
        pulley: typeof parsed.quizBest?.pulley === 'number' ? parsed.quizBest.pulley : -1,
      },
      quizDrafts: parsed.quizDrafts && typeof parsed.quizDrafts === 'object' ? parsed.quizDrafts : {},
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function persistSavedState(state: SavedState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota / sandbox restrictions
  }
}

export function makeQuizDraft(topic: TopicId): QuizDraft {
  const questions = QUIZZES_BY_TOPIC[topic];
  return {
    i: 0,
    opts: questions.map((q) =>
      shuffleArray([{ t: q.ok, ok: true }, ...q.bad.map((t) => ({ t, ok: false }))]),
    ),
    answers: questions.map(() => null),
  };
}

export function getDoneCount(state: SavedState, topic: TopicId): number {
  const map = state.done[topic] || {};
  let count = 0;
  for (let i = 1; i <= 5; i++) {
    if (map[i]) count++;
  }
  return count;
}

export function isLevelAvailable(state: SavedState, topic: TopicId, level: number): boolean {
  if (level <= 1) return true;
  return Boolean(state.done[topic]?.[level - 1]);
}

export function buildNotebookCsv(rows: NotebookEntry[]): string {
  const header = [
    'Tema',
    'Modo / Nivel',
    'Parametros',
    'Fuerza neta',
    'a calculada',
    'a observada',
    'Prediccion vs Realidad',
    'Explicacion',
  ];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(';'),
    ...rows.map((r) =>
      [
        r.topicLabel,
        r.label,
        r.summaryParams,
        r.netForceLabel,
        r.calcDisplay,
        r.accLabel,
        `${r.predLabel} -> ${r.actualLabel} (${r.match ? 'Acierto' : 'Diferente'})`,
        r.explanation || '',
      ]
        .map(esc)
        .join(';'),
    ),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export function buildNotebookTsv(rows: NotebookEntry[]): string {
  const header = [
    'Tema',
    'Modo / Nivel',
    'Parámetros',
    'Fuerza neta',
    'a calculada',
    'a observada',
    'Predicción vs Realidad',
    'Explicación',
  ];
  return [
    header.join('\t'),
    ...rows.map((r) =>
      [
        r.topicLabel,
        r.label,
        r.summaryParams,
        r.netForceLabel,
        r.calcDisplay,
        r.accLabel,
        `${r.predLabel} -> ${r.actualLabel}`,
        r.explanation || '',
      ].join('\t'),
    ),
  ].join('\n');
}
