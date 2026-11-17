import React, { useEffect, useRef } from 'react';
import type { PulleySetupMode } from '../physics/pulleyPhysics';
import { fmt, MIN_OBS_TIME } from '../utils/format';
import { CANVAS_FONT, sizeHighDpiCanvas, VEC_COLORS } from './CanvasUtils';

export interface PulleyPoint {
  t: number;
  y1: number;
  y2: number;
}

interface PulleyGraphProps {
  setup: PulleySetupMode;
  history: PulleyPoint[];
  currentTime: number;
}

function niceStep(span: number, targetTicks: number): number {
  const raw = Math.max(1e-3, span / targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

export const PulleyGraph: React.FC<PulleyGraphProps> = ({ setup, history, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gctx = canvas.getContext('2d');
    if (!gctx) return;

    const w = 440;
    const h = 215;
    const ratio = sizeHighDpiCanvas(canvas, w, h);
    gctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    gctx.clearRect(0, 0, w, h);
    gctx.textBaseline = 'alphabetic';

    const padL = 48;
    const padB = 34;
    const padT = 22;
    const padR = 14;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const maxT = Math.max(6, Math.ceil(currentTime / 2) * 2);
    let rawMaxY = setup === 'atwood' ? 3.5 : 5.5;
    let rawMinY = setup === 'atwood' ? -3.5 : -2.0;
    for (const p of history) {
      rawMaxY = Math.max(rawMaxY, p.y1, p.y2);
      rawMinY = Math.min(rawMinY, p.y1, p.y2);
    }
    const stepY = niceStep(rawMaxY - rawMinY, 4);
    const maxY = Math.ceil(rawMaxY / stepY) * stepY;
    const minY = Math.floor(rawMinY / stepY) * stepY;
    const spanY = Math.max(1, maxY - minY);
    const stepT = niceStep(maxT, 6);

    const toPx = (tv: number) => padL + (tv / maxT) * plotW;
    const toPy = (yVal: number) => padT + plotH * (1 - (yVal - minY) / spanY);

    gctx.font = `11px ${CANVAS_FONT}`;
    gctx.strokeStyle = '#E3EAEF';
    gctx.lineWidth = 1;
    gctx.fillStyle = VEC_COLORS.ink2;
    gctx.textAlign = 'right';
    for (let yv = minY; yv <= maxY + 1e-9; yv += stepY) {
      const gy = toPy(yv);
      gctx.beginPath();
      gctx.moveTo(padL, gy);
      gctx.lineTo(padL + plotW, gy);
      gctx.stroke();
      gctx.fillText(fmt(yv, stepY < 1 ? 1 : 0), padL - 6, gy + 4);
    }

    gctx.textAlign = 'center';
    for (let tv = 0; tv <= maxT + 1e-9; tv += stepT) {
      const gx = toPx(tv);
      gctx.beginPath();
      gctx.moveTo(gx, padT);
      gctx.lineTo(gx, padT + plotH);
      gctx.stroke();
      gctx.fillText(fmt(tv, 0), gx, padT + plotH + 15);
    }

    const obsX = toPx(MIN_OBS_TIME);
    gctx.save();
    gctx.strokeStyle = VEC_COLORS.ok;
    gctx.lineWidth = 1.8;
    gctx.setLineDash([5, 4]);
    gctx.beginPath();
    gctx.moveTo(obsX, padT);
    gctx.lineTo(obsX, padT + plotH);
    gctx.stroke();
    gctx.restore();
    gctx.fillStyle = VEC_COLORS.ok;
    gctx.font = `700 11px ${CANVAS_FONT}`;
    gctx.textAlign = 'left';
    gctx.fillText('2 s', obsX + 4, padT + 12);

    const zeroY = toPy(0);
    gctx.strokeStyle = '#5E7284';
    gctx.lineWidth = 1.8;
    gctx.beginPath();
    gctx.moveTo(padL, zeroY);
    gctx.lineTo(padL + plotW, zeroY);
    gctx.moveTo(padL, padT);
    gctx.lineTo(padL, padT + plotH);
    gctx.stroke();

    gctx.fillStyle = VEC_COLORS.ink;
    gctx.font = `700 11.5px ${CANVAS_FONT}`;
    gctx.fillText('Desplazamiento (m)', 6, 13);
    gctx.textAlign = 'right';
    gctx.fillText('Tiempo (s)', w - 8, h - 5);
    gctx.textAlign = 'left';

    if (history.length < 2) return;

    const last = history[history.length - 1];

    // Curve 2 (m2 in Atwood, rope pulled 2x in Movable)
    gctx.save();
    gctx.strokeStyle = setup === 'atwood' ? VEC_COLORS.tension : VEC_COLORS.push;
    gctx.lineWidth = 2.6;
    if (setup === 'movable') gctx.setLineDash([5, 3]);
    gctx.lineJoin = 'round';
    gctx.beginPath();
    history.forEach((pt, idx) => {
      const px = toPx(pt.t);
      const py = toPy(pt.y2);
      if (idx === 0) gctx.moveTo(px, py);
      else gctx.lineTo(px, py);
    });
    gctx.stroke();
    gctx.restore();

    // Curve 1 (m1 in Atwood, load in Movable)
    gctx.strokeStyle = VEC_COLORS.net;
    gctx.lineWidth = 2.8;
    gctx.lineJoin = 'round';
    gctx.beginPath();
    history.forEach((pt, idx) => {
      const px = toPx(pt.t);
      const py = toPy(pt.y1);
      if (idx === 0) gctx.moveTo(px, py);
      else gctx.lineTo(px, py);
    });
    gctx.stroke();

    // Active endpoint markers
    gctx.fillStyle = setup === 'atwood' ? VEC_COLORS.tension : VEC_COLORS.push;
    gctx.beginPath();
    gctx.arc(toPx(last.t), toPy(last.y2), 4.2, 0, Math.PI * 2);
    gctx.fill();

    gctx.fillStyle = VEC_COLORS.net;
    gctx.beginPath();
    gctx.arc(toPx(last.t), toPy(last.y1), 4.5, 0, Math.PI * 2);
    gctx.fill();
  }, [setup, history, currentTime]);

  const lastPt = history.length > 0 ? history[history.length - 1] : { t: 0, y1: 0, y2: 0 };

  return (
    <div className="bg-white border border-[#DCE4EB] rounded-xl p-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#0F766E]">
            {setup === 'atwood'
              ? 'Gráfica: altura de m₁ y m₂ en el tiempo'
              : 'Gráfica: altura de carga y cuerda en el tiempo'}
          </h3>
          <span className="font-mono-math text-xs font-semibold text-[#425666]">
            t = {fmt(currentTime, 1)} s
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-lg border border-[#E3EAEF] bg-[#F8FBFD]"
          style={{ aspectRatio: '440 / 215' }}
          role="img"
          aria-label={
            setup === 'atwood'
              ? 'Gráfica en tiempo real de la altura de las masas m1 y m2 respecto al tiempo'
              : 'Gráfica en tiempo real del desplazamiento de la carga y de la cuerda respecto al tiempo'
          }
        />
      </div>

      {setup === 'atwood' ? (
        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-[#425666] tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 bg-[#B45309]" />
            m₁ ({lastPt.y1 >= 0 ? '+' : ''}{fmt(lastPt.y1, 2)} m)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 bg-[#0F766E]" />
            m₂ ({lastPt.y2 >= 0 ? '+' : ''}{fmt(lastPt.y2, 2)} m)
          </span>
          <span className="text-[#17803D] font-semibold">Línea verde = meta 2 s</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-[#425666] tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 bg-[#B45309]" />
            Carga ({lastPt.y1 >= 0 ? '+' : ''}{fmt(lastPt.y1, 2)} m)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 border-t-2 border-dashed border-[#15803D]" />
            Cuerda 2× ({lastPt.y2 >= 0 ? '+' : ''}{fmt(lastPt.y2, 2)} m)
          </span>
          <span className="text-[#17803D] font-semibold">Línea verde = meta 2 s</span>
        </div>
      )}
    </div>
  );
};
