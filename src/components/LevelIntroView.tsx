import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TOPIC_MAP } from '../data/quizzes';
import { FLAT_MISSIONS } from '../physics/flatPhysics';
import { INCLINE_MISSIONS } from '../physics/inclinePhysics';
import { PULLEY_MISSIONS } from '../physics/pulleyPhysics';
import type { AppRoute, TopicId } from '../types/physics';

interface LevelIntroViewProps {
  topic: TopicId;
  level: number;
  onNavigate: (route: AppRoute) => void;
}

export const LevelIntroView: React.FC<LevelIntroViewProps> = ({ topic, level, onNavigate }) => {
  const meta = TOPIC_MAP[topic];
  const mission =
    topic === 'flat'
      ? FLAT_MISSIONS[level]
      : topic === 'incline'
        ? INCLINE_MISSIONS[level]
        : PULLEY_MISSIONS[level];

  if (!mission) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        type="button"
        onClick={() => onNavigate({ view: 'topic', topic })}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a {meta.title}
      </button>

      <article className="bg-white border border-[#DCE4EB] rounded-2xl p-6 sm:p-8 space-y-5">
        <div>
          <div className="text-xs font-semibold text-[#0B6A8F]">
            {meta.title} · Antes de empezar · {mission.concept}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#10202B] mt-1">
            Nivel {level}: {mission.title}
          </h1>
        </div>

        <p className="text-base text-[#10202B] leading-relaxed">{mission.lead}</p>

        <div className="rounded-xl p-4 bg-[#EBF4F8] border border-[#C6E0EC] text-sm text-[#08485F] font-medium">
          <strong className="font-semibold">Idea clave:</strong> {mission.keyTakeaway}
        </div>

        <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#425666]">
          {mission.points.map((pt, idx) => (
            <li key={idx}>{pt}</li>
          ))}
        </ul>

        <div className="pt-2">
          <div className="text-xs font-semibold text-[#425666] mb-2">
            Cómo funciona cada nivel
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-[#F4F7FA] border border-[#E3EAEF] rounded-xl p-3 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B6A8F] text-white font-bold text-xs grid place-items-center shrink-0">
                1
              </span>
              <span>Prepara las variables</span>
            </div>
            <div className="bg-[#F4F7FA] border border-[#E3EAEF] rounded-xl p-3 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B6A8F] text-white font-bold text-xs grid place-items-center shrink-0">
                2
              </span>
              <span>Predice qué va a pasar</span>
            </div>
            <div className="bg-[#F4F7FA] border border-[#E3EAEF] rounded-xl p-3 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B6A8F] text-white font-bold text-xs grid place-items-center shrink-0">
                3
              </span>
              <span>Observa y avanza (guardar es opcional)</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate({ view: 'lab', topic, mode: 'learn', level })}
            className="px-6 py-3 rounded-xl bg-[#0B6A8F] hover:bg-[#08485F] text-white font-display font-bold text-base transition-colors cursor-pointer"
          >
            Empezar nivel {level} →
          </button>
        </div>
      </article>
    </div>
  );
};
