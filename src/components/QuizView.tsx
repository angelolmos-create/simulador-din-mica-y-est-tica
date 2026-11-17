import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { QUIZZES_BY_TOPIC, TOPIC_MAP } from '../data/quizzes';
import type { AppRoute, QuizDraft, TopicId } from '../types/physics';
import { makeQuizDraft } from '../utils/storage';

interface QuizViewProps {
  topic: TopicId;
  bestScores: Record<TopicId, number>;
  drafts: Partial<Record<TopicId, QuizDraft>>;
  onSaveDraft: (topic: TopicId, draft: QuizDraft | undefined) => void;
  onSaveBestScore: (topic: TopicId, score: number) => void;
  onNavigate: (route: AppRoute) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const QuizView: React.FC<QuizViewProps> = ({
  topic,
  bestScores,
  drafts,
  onSaveDraft,
  onSaveBestScore,
  onNavigate,
}) => {
  const activeTopic = topic;

  const questions = QUIZZES_BY_TOPIC[activeTopic];
  const currentDraft = drafts[activeTopic];

  useEffect(() => {
    if (!currentDraft) {
      onSaveDraft(activeTopic, makeQuizDraft(activeTopic));
    }
  }, [activeTopic, currentDraft, onSaveDraft]);

  const draft = currentDraft ?? makeQuizDraft(activeTopic);
  const isFinished = draft.i >= questions.length;
  const meta = TOPIC_MAP[activeTopic];

  const score = draft.answers.reduce<number>((sum, ans, idx) => {
    if (ans === null) return sum;
    return sum + (draft.opts[idx]?.[ans]?.ok ? 1 : 0);
  }, 0);

  const handleSelectOption = (optIdx: number) => {
    if (isFinished || draft.answers[draft.i] !== null) return;
    const nextAnswers = draft.answers.slice();
    nextAnswers[draft.i] = optIdx;
    onSaveDraft(activeTopic, { ...draft, answers: nextAnswers });
  };

  const handleNext = () => {
    const nextIndex = draft.i + 1;
    if (nextIndex >= questions.length) {
      onSaveBestScore(activeTopic, score);
    }
    onSaveDraft(activeTopic, { ...draft, i: nextIndex });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestart = () => {
    onSaveDraft(activeTopic, makeQuizDraft(activeTopic));
  };

  const currentQuestion = !isFinished ? questions[draft.i] : null;
  const selectedIdx = !isFinished ? draft.answers[draft.i] : null;
  const currentOpts = !isFinished ? draft.opts[draft.i] : [];

  const wrongItems = questions
    .map((q, idx) => ({ q, ans: draft.answers[idx], opts: draft.opts[idx] }))
    .filter((item) => item.ans !== null && !item.opts[item.ans]?.ok);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'topic', topic: activeTopic })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a {meta.title}
        </button>

        <span className="text-sm font-semibold text-[#08485F] tabular-nums">
          {bestScores[activeTopic] >= 0 ? `Mejor puntaje: ${bestScores[activeTopic]}/10` : '10 preguntas'}
        </span>
      </div>

      {/* Encabezado de preguntas del tema */}
      <div className="bg-white border border-[#DCE4EB] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold" style={{ color: meta.accentHex }}>
            {meta.title}
          </div>
          <h1 className="font-display text-xl font-bold text-[#10202B]">
            Preguntas de repaso
          </h1>
        </div>
        <span className="text-xs font-medium text-[#425666]">
          Explicación inmediata al responder cada pregunta
        </span>
      </div>

      {/* Tarjeta de pregunta o resultado */}
      <div className="bg-white border border-[#DCE4EB] rounded-2xl p-6 sm:p-8 space-y-5">
        {!isFinished && currentQuestion ? (
          <>
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-[#425666]">
              <span>
                {meta.title} · Pregunta {draft.i + 1} de {questions.length}
              </span>
              <span className="tabular-nums text-[#08485F]">
                Aciertos: {score}
              </span>
            </div>

            <div className="h-2 rounded-full bg-[#E6EDF2] overflow-hidden">
              <div
                className="h-full bg-[#0B6A8F] transition-all duration-300"
                style={{ width: `${((draft.i + (selectedIdx !== null ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#0B6A8F]">
                {currentQuestion.tag}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#10202B] leading-snug">
                {currentQuestion.q}
              </h2>
            </div>

            <div className="grid gap-3">
              {currentOpts.map((opt, idx) => {
                const answered = selectedIdx !== null;
                const isSelected = selectedIdx === idx;
                const isRight = answered && opt.ok;
                const isWrong = answered && isSelected && !opt.ok;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={answered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 flex items-start gap-3 transition-colors ${
                      answered ? 'cursor-default' : 'cursor-pointer hover:border-[#0B6A8F] hover:bg-[#F3F9FC]'
                    } ${
                      isRight
                        ? 'border-[#2E9B58] bg-[#E8F6EE]'
                        : isWrong
                          ? 'border-[#D9534F] bg-[#FDEBE9]'
                          : 'border-[#DCE4EB] bg-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                        isRight
                          ? 'bg-[#17803D] text-white'
                          : isWrong
                            ? 'bg-[#B42318] text-white'
                            : 'bg-[#E6EDF2] text-[#425666]'
                      }`}
                    >
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="text-sm sm:text-base text-[#10202B] leading-snug pt-0.5">
                      {opt.t}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedIdx !== null && (
              <div className="space-y-4 pt-1">
                <div
                  className={`rounded-xl p-4 border text-sm ${
                    currentOpts[selectedIdx]?.ok
                      ? 'bg-[#E8F6EE] border-[#8ED0A5] text-[#0B4A22]'
                      : 'bg-[#FDEBE9] border-[#F2B8B5] text-[#6B1A14]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {currentOpts[selectedIdx]?.ok ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>¡Correcto!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Respuesta correcta: «{currentQuestion.ok}»</span>
                      </>
                    )}
                  </div>
                  <p>{currentQuestion.why}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-[#0B6A8F] hover:bg-[#08485F] text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {draft.i === questions.length - 1 ? 'Ver mi resultado →' : 'Siguiente pregunta →'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0B6A8F]">
                Resultado · {meta.title}
              </div>
              <div className="font-display text-5xl font-bold text-[#08485F] tabular-nums">
                {score} / {questions.length}
              </div>
              <p className="text-base text-[#10202B] max-w-md mx-auto">
                {score === questions.length
                  ? '¡Excelente! Dominas por completo este tema.'
                  : score >= 8
                    ? '¡Muy bien! Comprendiste casi todos los conceptos.'
                    : score >= 5
                      ? 'Buen avance. Repasa las explicaciones de abajo y vuelve a intentarlo.'
                      : 'Te conviene practicar un poco más en los niveles guiados y volver a intentarlo.'}
              </p>
              <p className="text-xs text-[#66798A] tabular-nums">
                Mejor puntaje guardado en {meta.title.toLowerCase()}: {Math.max(bestScores[activeTopic], score)} / {questions.length}
              </p>
            </div>

            {wrongItems.length > 0 && (
              <div className="text-left space-y-2.5 pt-2">
                <h3 className="font-display text-sm font-bold text-[#10202B]">
                  Para repasar ({wrongItems.length})
                </h3>
                {wrongItems.map(({ q }) => (
                  <div
                    key={q.id}
                    className="rounded-xl bg-[#F4F7FA] border border-[#E3EAEF] p-4 text-sm space-y-1"
                  >
                    <div className="font-semibold text-[#10202B]">{q.q}</div>
                    <div className="text-[#17803D] font-medium">Respuesta: {q.ok}</div>
                    <p className="text-[#425666]">{q.why}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B6A8F] hover:bg-[#08485F] text-white font-semibold text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Intentar de nuevo
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ view: 'home' })}
                className="px-5 py-2.5 rounded-xl border border-[#DCE4EB] bg-white text-[#10202B] font-semibold text-sm hover:border-[#0B6A8F] cursor-pointer"
              >
                Volver al menú principal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
