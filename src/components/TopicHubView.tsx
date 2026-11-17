import React from 'react';
import { ArrowLeft, Check, Compass, GraduationCap, HelpCircle, Lock } from 'lucide-react';
import { TOPIC_MAP } from '../data/quizzes';
import type { AppRoute, SavedState, TopicId } from '../types/physics';
import { getDoneCount, isLevelAvailable } from '../utils/storage';

interface TopicHubViewProps {
  topic: TopicId;
  saved: SavedState;
  onNavigate: (route: AppRoute) => void;
  onResetTopicProgress: (topic: TopicId) => void;
}

const LEVEL_NAMES: Record<TopicId, string[]> = {
  flat: [
    'Empujón suave',
    'Empujón fuerte',
    'Caja en marcha',
    'El doble de empuje',
    'El doble de masa',
  ],
  incline: [
    'Rampa sin roce',
    'El roce detiene el bloque',
    'El ángulo crítico',
    'Rampa más empinada',
    '¿Importa la masa?',
  ],
  pulley: [
    'Contrapeso en equilibrio',
    'Desequilibrio de masas',
    'Aceleración del sistema',
    'Polea móvil: mitad de fuerza',
    'Levantar la carga',
  ],
};

export const TopicHubView: React.FC<TopicHubViewProps> = ({
  topic,
  saved,
  onNavigate,
  onResetTopicProgress,
}) => {
  const meta = TOPIC_MAP[topic];
  const doneCount = getDoneCount(saved, topic);
  const bestQuiz = saved.quizBest[topic];
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={() => onNavigate({ view: 'home' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al menú principal
        </button>

        <div className="bg-white border border-[#DCE4EB] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: meta.accentHex }}>
              Tema de estudio · {meta.shortTitle}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#10202B]">
              {meta.title}
            </h1>
            <p className="text-sm text-[#425666] max-w-2xl">{meta.description}</p>
          </div>
          <div className="text-sm text-[#425666] tabular-nums shrink-0">
            <div>Niveles completados: <strong className="text-[#10202B]">{doneCount} / 5</strong></div>
            <div>Mejor puntaje preguntas: <strong className="text-[#10202B]">{bestQuiz >= 0 ? `${bestQuiz} / 10` : 'Pendiente'}</strong></div>
          </div>
        </div>
      </div>

      {/* Opciones del tema: Modo libre y Preguntas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'lab', topic, mode: 'free', level: 1 })}
          className="text-left bg-white border border-[#DCE4EB] rounded-2xl p-6 hover:border-[#D97706] transition-all flex items-start gap-4 cursor-pointer"
        >
          <span className="w-12 h-12 rounded-xl bg-[#FEF3E2] text-[#B45309] grid place-items-center shrink-0">
            <Compass className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#10202B]">Modo libre</h2>
            <p className="text-sm text-[#425666]">
              Experimenta cambiando las variables como quieras, sin metas fijas ni bloqueos. Observa vectores, gráficas y guarda lo que descubras.
            </p>
            <div className="pt-1 text-sm font-semibold text-[#B45309]">
              Abrir simulador libre →
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ view: 'quiz', topic })}
          className="text-left bg-white border border-[#DCE4EB] rounded-2xl p-6 hover:border-[#0F766E] transition-all flex items-start gap-4 cursor-pointer"
        >
          <span className="w-12 h-12 rounded-xl bg-[#E6F5F3] text-[#0F766E] grid place-items-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#10202B]">
              Preguntas ({meta.title})
            </h2>
            <p className="text-sm text-[#425666]">
              10 preguntas de opción múltiple sobre {meta.title.toLowerCase()} para comprobar lo que aprendiste con explicación en cada respuesta.
            </p>
            <div className="pt-1 text-sm font-semibold text-[#0F766E]">
              {bestQuiz >= 0 ? `Volver a intentar (mejor: ${bestQuiz}/10) →` : 'Contestar 10 preguntas →'}
            </div>
          </div>
        </button>
      </div>

      {/* Sección de 5 Niveles Guiados */}
      <section aria-labelledby="levels-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#0B6A8F]" />
            <h2 id="levels-heading" className="font-display text-xl font-bold text-[#10202B]">
              Niveles guiados
            </h2>
          </div>
          <span className="text-sm text-[#425666]">
            Observa el experimento o espera hasta 12 s para abrir el siguiente nivel (guardar es opcional)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const done = Boolean(saved.done[topic]?.[lvl]);
            const avail = isLevelAvailable(saved, topic, lvl);
            const isNext = avail && !done;
            const title = LEVEL_NAMES[topic][lvl - 1];

            return (
              <button
                key={lvl}
                type="button"
                disabled={!avail}
                onClick={() => onNavigate({ view: 'intro', topic, level: lvl })}
                className={`text-center rounded-2xl p-5 border flex flex-col items-center gap-2.5 transition-all ${
                  avail ? 'cursor-pointer bg-white' : 'cursor-not-allowed bg-[#EEF2F6] opacity-80'
                } ${
                  done
                    ? 'border-[#8ED0A5] hover:border-[#17803D]'
                    : isNext
                      ? 'border-[#0B6A8F] shadow-sm'
                      : 'border-[#DCE4EB]'
                }`}
              >
                <span
                  className={`w-12 h-12 rounded-full grid place-items-center font-display text-lg font-bold ${
                    done
                      ? 'bg-[#17803D] text-white'
                      : avail
                        ? 'bg-[#0B6A8F] text-white'
                        : 'bg-[#DCE4EB] text-[#66798A]'
                  }`}
                >
                  {avail ? (done ? <Check className="w-6 h-6" /> : lvl) : <Lock className="w-5 h-5" />}
                </span>
                <div className="text-xs font-semibold text-[#425666]">Nivel {lvl}</div>
                <h3 className="font-display text-sm font-bold text-[#10202B] leading-snug">
                  {title}
                </h3>
                <span className="mt-auto pt-1 text-xs font-semibold text-[#08485F]">
                  {done ? 'Repetir →' : avail ? 'Empezar →' : `Completa el nivel ${lvl - 1}`}
                </span>
              </button>
            );
          })}
        </div>

        {doneCount > 0 && (
          <div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs text-[#66798A] underline hover:text-[#10202B] cursor-pointer"
              >
                Reiniciar avance de {meta.title.toLowerCase()}
              </button>
            ) : (
              <div className="inline-flex items-center gap-3 text-xs">
                <span className="text-[#B42318] font-semibold">¿Seguro? Se conservará tu cuaderno.</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetTopicProgress(topic);
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[#B42318] text-white font-semibold cursor-pointer"
                >
                  Sí, reiniciar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded border border-[#DCE4EB] bg-white text-[#425666] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
