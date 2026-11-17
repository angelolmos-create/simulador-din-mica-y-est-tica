import React, { useState } from 'react';
import { ArrowLeft, Copy, Download, Trash2 } from 'lucide-react';
import type { AppRoute, NotebookEntry, TopicId } from '../types/physics';
import { buildNotebookCsv, buildNotebookTsv } from '../utils/storage';

interface NotebookViewProps {
  rows: NotebookEntry[];
  onClear: () => void;
  onNavigate: (route: AppRoute) => void;
  onNotify: (msg: string, tone?: 'ok' | 'warn') => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  rows,
  onClear,
  onNavigate,
  onNotify,
}) => {
  const [filter, setFilter] = useState<'all' | TopicId>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const visibleRows = filter === 'all' ? rows : rows.filter((r) => r.topic === filter);

  const handleCopy = async () => {
    if (visibleRows.length === 0) {
      onNotify('Guarda al menos un resultado antes de copiar.', 'warn');
      return;
    }
    const text = buildNotebookTsv(visibleRows);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        onNotify('Tabla copiada. Puedes pegarla en Word o Excel.', 'ok');
        return;
      }
    } catch {
      // fallback below
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    onNotify(
      ok ? 'Tabla copiada. Puedes pegarla en Word o Excel.' : 'No se pudo copiar. Usa «Descargar CSV».',
      ok ? 'ok' : 'warn',
    );
  };

  const handleDownloadCsv = () => {
    if (visibleRows.length === 0) {
      onNotify('Guarda al menos un resultado antes de descargar.', 'warn');
      return;
    }
    const csv = buildNotebookCsv(visibleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cuaderno_dinamica_estatica.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify('Archivo CSV descargado.', 'ok');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'home' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al menú principal
        </button>
        <span className="text-sm font-semibold text-[#425666] tabular-nums">
          {visibleRows.length === 0
            ? 'Sin resultados guardados'
            : `${visibleRows.length} ${visibleRows.length === 1 ? 'resultado' : 'resultados'}`}
        </span>
      </div>

      <section className="bg-white border border-[#DCE4EB] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#10202B]">
              Mi cuaderno de resultados
            </h1>
            <p className="text-sm text-[#425666] mt-0.5">
              Aquí se guardan las observaciones de los tres temas para repasar o exportar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F1F5F8] rounded-xl">
            {(
              [
                ['all', 'Todos'],
                ['flat', 'Superficie plana'],
                ['incline', 'Plano inclinado'],
                ['pulley', 'Poleas'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  filter === key
                    ? 'bg-white text-[#10202B] shadow-sm'
                    : 'text-[#425666] hover:text-[#10202B]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E3EAEF] rounded-xl">
          <table className="w-full border-collapse text-sm min-w-[780px]">
            <thead>
              <tr className="bg-[#F4F7FA] text-[#425666] text-xs font-semibold text-left">
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Tema</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Actividad</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Datos</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Fuerza neta</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">a observada</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Predicción → Realidad</th>
                <th className="py-3 px-3 border-b border-[#E3EAEF]">Explicación</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-[#66798A] italic">
                    Todavía no hay resultados en esta sección. Completa un nivel o usa el modo libre y pulsa «Guardar resultado».
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#E3EAEF] last:border-b-0 align-top">
                    <td className="py-3 px-3 font-semibold text-[#08485F] whitespace-nowrap">
                      {row.topicLabel}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#10202B]">{row.label}</td>
                    <td className="py-3 px-3 text-xs text-[#425666] font-mono-math">
                      {row.summaryParams}
                    </td>
                    <td className="py-3 px-3 font-mono-math font-semibold text-[#10202B] whitespace-nowrap">
                      {row.netForceLabel}
                    </td>
                    <td className="py-3 px-3 font-mono-math font-semibold text-[#10202B] whitespace-nowrap">
                      {row.accLabel}
                    </td>
                    <td className="py-3 px-3 text-[#10202B]">
                      <span>{row.predLabel}</span> → <strong>{row.actualLabel}</strong>{' '}
                      <span className={row.match ? 'text-[#17803D] font-bold' : 'text-[#B45309] font-bold'}>
                        {row.match ? '✓' : '·'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#425666] max-w-[260px]">
                      {row.explanation || <span className="italic text-[#8497A6]">Sin explicación</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DCE4EB] bg-white text-sm font-semibold text-[#10202B] hover:border-[#0B6A8F] cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Copiar tabla
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DCE4EB] bg-white text-sm font-semibold text-[#10202B] hover:border-[#0B6A8F] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar CSV
            </button>
          </div>

          {rows.length > 0 && (
            <div>
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#B42318] hover:bg-[#FDEBE9] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Borrar cuaderno
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      setConfirmClear(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#B42318] text-white font-semibold cursor-pointer"
                  >
                    Confirmar borrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#DCE4EB] bg-white text-[#425666] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
