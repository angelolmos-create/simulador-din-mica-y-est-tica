import React from 'react';
import type { AppRoute, TopicId } from '../types/physics';

interface TopBarProps {
  route: AppRoute;
  notebookCount: number;
  onNavigate: (route: AppRoute) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ route, notebookCount, onNavigate }) => {
  const activeTopic: TopicId | null =
    route.view === 'topic' || route.view === 'intro' || route.view === 'lab' || route.view === 'quiz'
      ? route.topic
      : null;

  const isHome = route.view === 'home';
  const isPhenomena = route.view === 'phenomena';
  const isNotebook = route.view === 'notebook';

  const navBtnClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-1 border-b-2 cursor-pointer ${
      active
        ? 'text-[#08485F] border-[#0B6A8F]'
        : 'text-[#425666] border-transparent hover:text-[#10202B] hover:border-[#B5C6D2]'
    }`;

  return (
    <header className="bg-white border-b border-[#DCE4EB]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'home' })}
          className="font-display text-lg font-bold tracking-tight text-[#08485F] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#0B6A8F] transition-colors"
        >
          Fuerzas y Movimiento
        </button>

        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-6">
          <button type="button" onClick={() => onNavigate({ view: 'home' })} className={navBtnClass(isHome)}>
            Inicio
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'topic', topic: 'flat' })}
            className={navBtnClass(activeTopic === 'flat')}
          >
            Superficie plana
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'topic', topic: 'incline' })}
            className={navBtnClass(activeTopic === 'incline')}
          >
            Plano inclinado
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'topic', topic: 'pulley' })}
            className={navBtnClass(activeTopic === 'pulley')}
          >
            Sistema de poleas
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'phenomena' })}
            className={navBtnClass(isPhenomena)}
          >
            Fenómenos
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate({ view: 'notebook' })}
            className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              isNotebook
                ? 'bg-[#08485F] text-white'
                : 'bg-[#0B6A8F] text-white hover:bg-[#08485F]'
            }`}
          >
            {notebookCount > 0 ? `Mi cuaderno (${notebookCount})` : 'Mi cuaderno'}
          </button>
        </div>
      </div>
    </header>
  );
};
