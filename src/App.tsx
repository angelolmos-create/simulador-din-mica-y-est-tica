import { useCallback, useEffect, useState } from 'react';
import { FlatLabView } from './components/FlatLabView';
import { HomeView } from './components/HomeView';
import { InclineLabView } from './components/InclineLabView';
import { LevelIntroView } from './components/LevelIntroView';
import { NotebookView } from './components/NotebookView';
import { PhenomenaView } from './components/PhenomenaView';
import { PulleyLabView } from './components/PulleyLabView';
import { QuizView } from './components/QuizView';
import { TopBar } from './components/TopBar';
import { TopicHubView } from './components/TopicHubView';
import type { AppRoute, NotebookEntry, QuizDraft, SavedState, TopicId } from './types/physics';
import { loadSavedState, persistSavedState } from './utils/storage';

function getInitialRoute(): AppRoute {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const topicParam = params.get('topic');
      const topic: TopicId =
        topicParam === 'incline' || topicParam === 'pulley' ? topicParam : 'flat';
      return { view: 'lab', topic, mode: 'learn', level: 1 };
    }
  } catch {
    // ignore URL parsing issues
  }
  return { view: 'home' };
}

export default function App() {
  const [saved, setSaved] = useState<SavedState>(() => loadSavedState());
  const [route, setRoute] = useState<AppRoute>(() => getInitialRoute());
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'warn' } | null>(null);

  useEffect(() => {
    persistSavedState(saved);
  }, [saved]);

  const notify = useCallback((msg: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ msg, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const navigate = useCallback((next: AppRoute) => {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleSaveResult = useCallback((entry: NotebookEntry, completedLevel?: number) => {
    setSaved((prev) => {
      const nextDone = { ...prev.done };
      if (completedLevel && completedLevel >= 1 && completedLevel <= 5) {
        nextDone[entry.topic] = {
          ...(nextDone[entry.topic] || {}),
          [completedLevel]: true,
        };
      }
      return {
        ...prev,
        done: nextDone,
        rows: [entry, ...prev.rows],
      };
    });
  }, []);

  const handleUnlockLevel = useCallback((topic: TopicId, completedLevel: number) => {
    if (completedLevel < 1 || completedLevel > 5) return;
    setSaved((prev) => {
      if (prev.done[topic]?.[completedLevel]) return prev;
      return {
        ...prev,
        done: {
          ...prev.done,
          [topic]: {
            ...(prev.done[topic] || {}),
            [completedLevel]: true,
          },
        },
      };
    });
  }, []);

  const handleUpdateExplanation = useCallback((entryId: string, explanation: string) => {
    setSaved((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === entryId ? { ...r, explanation } : r)),
    }));
  }, []);

  const handleResetTopicProgress = useCallback(
    (topic: TopicId) => {
      setSaved((prev) => ({
        ...prev,
        done: {
          ...prev.done,
          [topic]: {},
        },
      }));
      notify('Avance reiniciado. Tus registros en el cuaderno se conservan.', 'ok');
    },
    [notify],
  );

  const handleSaveQuizDraft = useCallback((topic: TopicId, draft: QuizDraft | undefined) => {
    setSaved((prev) => ({
      ...prev,
      quizDrafts: {
        ...prev.quizDrafts,
        [topic]: draft,
      },
    }));
  }, []);

  const handleSaveQuizBest = useCallback((topic: TopicId, score: number) => {
    setSaved((prev) => ({
      ...prev,
      quizBest: {
        ...prev.quizBest,
        [topic]: Math.max(prev.quizBest[topic] ?? -1, score),
      },
    }));
  }, []);

  const handleClearNotebook = useCallback(() => {
    setSaved((prev) => ({ ...prev, rows: [] }));
    notify('Cuaderno borrado.', 'ok');
  }, [notify]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA] text-[#10202B]">
      <TopBar route={route} notebookCount={saved.rows.length} onNavigate={navigate} />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {route.view === 'home' && <HomeView saved={saved} onNavigate={navigate} />}

        {route.view === 'phenomena' && <PhenomenaView onNavigate={navigate} />}

        {route.view === 'topic' && (
          <TopicHubView
            topic={route.topic}
            saved={saved}
            onNavigate={navigate}
            onResetTopicProgress={handleResetTopicProgress}
          />
        )}

        {route.view === 'intro' && (
          <LevelIntroView topic={route.topic} level={route.level} onNavigate={navigate} />
        )}

        {route.view === 'lab' && route.topic === 'flat' && (
          <FlatLabView
            mode={route.mode}
            level={route.level}
            onSaveResult={handleSaveResult}
            onUnlockLevel={handleUnlockLevel}
            onUpdateExplanation={handleUpdateExplanation}
            onNavigate={navigate}
            onNotify={notify}
          />
        )}

        {route.view === 'lab' && route.topic === 'incline' && (
          <InclineLabView
            mode={route.mode}
            level={route.level}
            onSaveResult={handleSaveResult}
            onUnlockLevel={handleUnlockLevel}
            onUpdateExplanation={handleUpdateExplanation}
            onNavigate={navigate}
            onNotify={notify}
          />
        )}

        {route.view === 'lab' && route.topic === 'pulley' && (
          <PulleyLabView
            mode={route.mode}
            level={route.level}
            onSaveResult={handleSaveResult}
            onUnlockLevel={handleUnlockLevel}
            onUpdateExplanation={handleUpdateExplanation}
            onNavigate={navigate}
            onNotify={notify}
          />
        )}

        {route.view === 'quiz' && (
          <QuizView
            topic={route.topic}
            bestScores={saved.quizBest}
            drafts={saved.quizDrafts}
            onSaveDraft={handleSaveQuizDraft}
            onSaveBestScore={handleSaveQuizBest}
            onNavigate={navigate}
          />
        )}

        {route.view === 'notebook' && (
          <NotebookView
            rows={saved.rows}
            onClear={handleClearNotebook}
            onNavigate={navigate}
            onNotify={notify}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 bottom-4 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border ${
            toast.tone === 'ok'
              ? 'bg-[#10202B] text-white border-[#4FCB7E]'
              : 'bg-[#10202B] text-white border-[#F2AE46]'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
