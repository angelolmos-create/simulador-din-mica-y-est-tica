import React from 'react';
import { ArrowRight, BookOpen, Info } from 'lucide-react';
import { TOPIC_LIST } from '../data/quizzes';
import type { AppRoute, SavedState, TopicId } from '../types/physics';
import { getDoneCount } from '../utils/storage';

interface HomeViewProps {
  saved: SavedState;
  onNavigate: (route: AppRoute) => void;
}

const TopicDiagram: React.FC<{ id: TopicId }> = ({ id }) => {
  if (id === 'flat') {
    return (
      <svg viewBox="0 0 180 76" className="w-full h-20" aria-hidden="true">
        <line x1="10" y1="62" x2="170" y2="62" stroke="#62768A" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="74" y="24" width="42" height="38" rx="6" fill="#F6D3A8" stroke="#A5501B" strokeWidth="2" />
        <path d="M26 43h40" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
        <path d="M58 37l9 6-9 6" fill="#15803D" />
        <path d="M118 43h28" stroke="#0A7A91" strokeWidth="2.4" strokeDasharray="4 4" strokeLinecap="round" />
        <path d="M141 38l8 5-8 5" fill="#0A7A91" />
      </svg>
    );
  }
  if (id === 'incline') {
    return (
      <svg viewBox="0 0 180 76" className="w-full h-20" aria-hidden="true">
        <path d="M22 62h136L46 16z" fill="#EBF2F7" stroke="#62768A" strokeWidth="2.2" strokeLinejoin="round" />
        <g transform="translate(88 30) rotate(22)">
          <rect x="-15" y="-14" width="30" height="26" rx="5" fill="#F6D3A8" stroke="#A5501B" strokeWidth="2" />
        </g>
        <path d="M93 34v24" stroke="#7B3FE4" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M88 53l5 7 5-7" fill="#7B3FE4" />
        <path d="M93 34l18 7" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 180 76" className="w-full h-20" aria-hidden="true">
      <line x1="36" y1="10" x2="144" y2="10" stroke="#425666" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="10" x2="90" y2="23" stroke="#425666" strokeWidth="2.2" />
      <circle cx="90" cy="24" r="11" fill="#F8FAFC" stroke="#0F766E" strokeWidth="2.5" />
      <circle cx="90" cy="24" r="2.5" fill="#0F766E" />
      <line x1="79" y1="24" x2="79" y2="47" stroke="#0F766E" strokeWidth="2" />
      <line x1="101" y1="24" x2="101" y2="42" stroke="#0F766E" strokeWidth="2" />
      <rect x="67" y="47" width="24" height="20" rx="4" fill="#F6D3A8" stroke="#A5501B" strokeWidth="1.8" />
      <rect x="89" y="42" width="24" height="24" rx="4" fill="#CBE7E4" stroke="#0F766E" strokeWidth="1.8" />
    </svg>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({ saved, onNavigate }) => {
  return (
    <div className="space-y-8">
      {/* Encabezado sencillo de inicio */}
      <section className="pt-2">
        <p className="text-sm font-medium text-[#0B6A8F]">
          Simulador interactivo · Física escolar
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#10202B] mt-1 max-w-3xl [text-wrap:balance]">
          Aprende sobre fuerzas y movimiento
        </h1>
        <p className="text-[#425666] text-base mt-2 max-w-2xl">
          Elige un tema para practicar con niveles guiados, explorar en modo libre o responder sus preguntas.
        </p>
      </section>

      {/* Los 3 temas principales */}
      <section aria-labelledby="topics-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="topics-heading" className="font-display text-xl font-bold text-[#10202B]">
            Temas de estudio
          </h2>
          <span className="text-sm text-[#425666]">
            Niveles guiados, modo libre y preguntas dentro de cada tema
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {TOPIC_LIST.map((topic, index) => {
            const completed = getDoneCount(saved, topic.id);
            const bestQuiz = saved.quizBest[topic.id];
            const pct = (completed / 5) * 100;

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onNavigate({ view: 'topic', topic: topic.id })}
                className="group text-left bg-white border border-[#DCE4EB] rounded-2xl p-6 flex flex-col gap-4 hover:border-[#0B6A8F] hover:shadow-md transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0B6A8F]"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#425666]">
                  <span>0{index + 1} · {topic.shortTitle}</span>
                  <span className="tabular-nums text-[#08485F]">
                    {completed}/5 niveles
                  </span>
                </div>

                <div
                  className="rounded-xl p-3 border border-[#E6EDF2]"
                  style={{ backgroundColor: topic.softBg }}
                >
                  <TopicDiagram id={topic.id} />
                </div>

                <div>
                  <h3 className="font-display text-xl font-bold text-[#10202B] group-hover:text-[#08485F] transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-[#425666] mt-1.5 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="mt-auto pt-2 space-y-3">
                  <div className="h-1.5 w-full rounded-full bg-[#E6EDF2] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: topic.accentHex }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#425666] tabular-nums">
                      {bestQuiz >= 0 ? `Preguntas: ${bestQuiz}/10` : 'Niveles · Modo libre · Preguntas'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#08485F] whitespace-nowrap shrink-0">
                      Entrar <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Acceso compacto a la sección aparte de explicación de los fenómenos */}
      <section aria-label="Explicación de los fenómenos">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'phenomena' })}
          className="w-full text-left bg-white border border-[#DCE4EB] rounded-2xl px-5 py-4 hover:border-[#0B6A8F] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-[#EBF3F7] text-[#08485F] grid place-items-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-[#10202B]">
                ¿Cómo funcionan estos fenómenos?
              </h2>
              <p className="text-sm text-[#425666]">
                Lee la explicación resumida y sin tecnicismos sobre estática, dinámica, roce, rampas y poleas.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#08485F] whitespace-nowrap shrink-0 pl-13 sm:pl-0">
            Ver explicación <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </section>

      {/* Ficha informativa mínima con solo símbolo de información */}
      <footer className="bg-[#EBF3F7] border border-[#C8DCE6] rounded-2xl px-5 py-4 flex items-start sm:items-center gap-3.5">
        <Info className="w-5 h-5 text-[#08485F] shrink-0 mt-0.5 sm:mt-0" aria-label="Información" />
        <p className="text-sm text-[#10202B]">
          <strong>Este es un simulador gratuito diseñado para estudiar y aprender sobre la dinámica y la estática.</strong>{' '}
          <span className="text-[#425666]">
            Pon a prueba tus predicciones, observa las fuerzas y guarda tus resultados en tu cuaderno.
          </span>
        </p>
      </footer>
    </div>
  );
};
