import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TOPIC_LIST } from '../data/quizzes';
import type { AppRoute } from '../types/physics';

interface PhenomenaViewProps {
  onNavigate: (route: AppRoute) => void;
}

export const PhenomenaView: React.FC<PhenomenaViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'home' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al menú principal
        </button>
      </div>

      <section className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#10202B] [text-wrap:balance]">
          ¿Cómo funcionan estos fenómenos en la vida diaria?
        </h1>
        <p className="text-sm sm:text-base text-[#425666] max-w-3xl">
          Explicación resumida y en palabras sencillas para entender qué pasa en cada tema antes o después de practicar en el simulador.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOPIC_LIST.map((topic) => (
          <article
            key={topic.id}
            className="bg-white border border-[#DCE4EB] rounded-2xl p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="text-xs font-semibold" style={{ color: topic.accentHex }}>
                {topic.title}
              </div>
              <h2 className="font-display text-lg font-bold text-[#10202B]">
                {topic.phenomenonTitle}
              </h2>
              <p className="text-sm text-[#425666] leading-relaxed">
                {topic.phenomenonSummary}
              </p>
              <p className="text-xs text-[#66798A] pt-1">
                {topic.phenomenonExample}
              </p>
            </div>

            <div className="pt-2 border-t border-[#EDF2F6]">
              <button
                type="button"
                onClick={() => onNavigate({ view: 'topic', topic: topic.id })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#08485F] hover:underline cursor-pointer"
              >
                Practicar en {topic.title.toLowerCase()}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        ))}

        <article className="bg-white border border-[#DCE4EB] rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#08485F]">
              La idea central
            </div>
            <h2 className="font-display text-lg font-bold text-[#10202B]">
              ¿Qué diferencia hay entre estática y dinámica?
            </h2>
            <p className="text-sm text-[#425666] leading-relaxed">
              La <strong>estática</strong> estudia cuando todas las fuerzas que actúan sobre algo se compensan entre sí, por eso el objeto se queda quieto en equilibrio. La <strong>dinámica</strong> estudia qué pasa cuando una fuerza le gana a las demás: el objeto empieza a moverse, acelera más rápido o cambia de velocidad.
            </p>
            <p className="text-xs text-[#66798A] pt-1">
              Pista clave: si todas las fuerzas suman cero y algo ya se estaba moviendo, seguirá avanzando a la misma velocidad.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
};
