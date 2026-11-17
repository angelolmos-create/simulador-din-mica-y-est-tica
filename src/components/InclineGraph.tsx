import React, { useEffect, useRef } from 'react';
import { fmt, MIN_OBS_TIME } from '../utils/format';
import { CANVAS_FONT, sizeHighDpiCanvas, VEC_COLORS } from './CanvasUtils';

export interface InclinePoint {
  t: number;
  dist: number;
}

interface InclineGraphProps {
  history: InclinePoint[];
  currentTime: number;
}

function niceStep(span: number, targetTicks: number): number {
  const raw = Math.max(1e-3, span / targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

export const InclineGraph: React.FC<InclineGraphProps> = ({ history, currentTime }) => {
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

    const padL = 46;
    const padB = 34;
    const padT = 22;
    const padR = 14;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const maxT = Math.max(6, Math.ceil(currentTime / 2) * 2);
    let rawMaxD = 5;
    for (const p of history) {
      if (p.dist > rawMaxD) rawMaxD = p.dist;
    }
    const stepD = niceStep(rawMaxD, 5);
    const maxD = Math.ceil(rawMaxD / stepD) * stepD;
    const stepT = niceStep(maxT, 6);

    const toPx = (tv: number) => padL + (tv / maxT) * plotW;
    const toPy = (dVal: number) => padT + plotH * (1 - dVal / Math.max(1, maxD));

    gctx.font = `11.5px ${CANVAS_FONT}`;
    gctx.strokeStyle = '#E3EAEF';
    gctx.lineWidth = 1;
    gctx.fillStyle = VEC_COLORS.ink2;
    gctx.textAlign = 'right';
    for (let dv = 0; dv <= maxD + 1e-9; dv += stepD) {
      const gy = toPy(dv);
      gctx.beginPath();
      gctx.moveTo(padL, gy);
      gctx.lineTo(padL + plotW, gy);
      gctx.stroke();
      gctx.fillText(fmt(dv, stepD < 1 ? 1 : 0), padL - 6, gy + 4);
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
    gctx.fillText('Distancia bajada (m)', 6, 13);
    gctx.textAlign = 'right';
    gctx.fillText('Tiempo (s)', w - 8, h - 5);
    gctx.textAlign = 'left';

    if (history.length < 2) return;

    gctx.beginPath();
    history.forEach((pt, idx) => {
      const px = toPx(pt.t);
      const py = toPy(pt.dist);
      if (idx === 0) gctx.moveTo(px, py);
      else gctx.lineTo(px, py);
    });
    const last = history[history.length - 1];
    gctx.lineTo(toPx(last.t), zeroY);
    gctx.lineTo(toPx(history[0].t), zeroY);
    gctx.closePath();
    gctx.fillStyle = 'rgba(217, 119, 6, 0.13)';
    gctx.fill();

    gctx.strokeStyle = VEC_COLORS.parallel;
    gctx.lineWidth = 3;
    gctx.lineJoin = 'round';
    gctx.beginPath();
    history.forEach((pt, idx) => {
      const px = toPx(pt.t);
      const py = toPy(pt.dist);
      if (idx === 0) gctx.moveTo(px, py);
      else gctx.lineTo(px, py);
    });
    gctx.stroke();

    gctx.fillStyle = VEC_COLORS.parallel;
    gctx.beginPath();
    gctx.arc(toPx(last.t), toPy(last.dist), 4.5, 0, Math.PI * 2);
    gctx.fill();
  }, [history, currentTime]);

  const currentDist = history.length > 0 ? history[history.length - 1].dist : 0;

  return (
    <div className="bg-white border border-[#DCE4EB] rounded-xl p-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#08485F]">
            Gráfica: distancia en el tiempo
          </h3>
          <span className="font-mono-math text-xs font-semibold text-[#425666] whitespace-nowrap shrink-0 tabular-nums">
            t = {fmt(currentTime, 1)} s · x = {fmt(currentDist, 2)} m
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-lg border border-[#E3EAEF] bg-[#F8FBFD]"
          style={{ aspectRatio: '440 / 215' }}
          role="img"
          aria-label="Gráfica en tiempo real de la distancia recorrida cuesta abajo en la rampa respecto al tiempo"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-[#425666]">
        <span>Curva hacia arriba = acelera cuesta abajo</span>
        <span aria-hidden="true">·</span>
        <span>Plana = quieto o en tope</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#17803D] font-semibold">Línea verde = meta 2 s</span>
      </div>
    </div>
  );
};
