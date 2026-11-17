export type TopicId = 'flat' | 'incline' | 'pulley';

export type AppRoute =
  | { view: 'home' }
  | { view: 'phenomena' }
  | { view: 'topic'; topic: TopicId }
  | { view: 'intro'; topic: TopicId; level: number }
  | { view: 'lab'; topic: TopicId; mode: 'learn' | 'free'; level: number }
  | { view: 'quiz'; topic: TopicId }
  | { view: 'notebook' };

export interface QuizQuestion {
  id: string;
  tag: string;
  q: string;
  ok: string;
  bad: [string, string, string];
  why: string;
}

export interface QuizOption {
  t: string;
  ok: boolean;
}

export interface QuizDraft {
  i: number;
  opts: QuizOption[][];
  answers: (number | null)[];
}

export interface NotebookEntry {
  id: string;
  topic: TopicId;
  topicLabel: string;
  label: string;
  free: boolean;
  summaryParams: string;
  netForceLabel: string;
  calcDisplay: string;
  accLabel: string;
  predLabel: string;
  actualLabel: string;
  match: boolean;
  explanation: string;
  timestamp: string;
}

export interface SavedState {
  done: Record<TopicId, Record<number, boolean>>;
  quizBest: Record<TopicId, number>;
  quizDrafts: Partial<Record<TopicId, QuizDraft>>;
  rows: NotebookEntry[];
}
