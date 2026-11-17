export const CANVAS_FONT = '"DM Sans", "Segoe UI", system-ui, sans-serif';

export const VEC_COLORS = {
  push: '#15803D',
  fric: '#C62828',
  normal: '#0B6BCB',
  weight: '#7B3FE4',
  net: '#B45309',
  vel: '#0A7A91',
  tension: '#0F766E',
  parallel: '#D97706',
  ink: '#10202B',
  ink2: '#425666',
  ok: '#17803D',
  mystery: '#4B45D6',
};

export function drawRoundedRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

export function sizeHighDpiCanvas(
  canvas: HTMLCanvasElement,
  logicalW: number,
  logicalH: number,
): number {
  const cssW = Math.max(240, Math.round(canvas.clientWidth || logicalW));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(cssW * dpr);
  const ph = Math.round((cssW * dpr * logicalH) / logicalW);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  return canvas.width / logicalW;
}

export function drawArrow(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  dx: number,
  dy: number,
  color: string,
  dashed = false,
): { x: number; y: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < 3) return null;
  const x2 = x1 + dx;
  const y2 = y1 + dy;
  const angle = Math.atan2(dy, dx);

  c.save();
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = dashed ? 2.6 : 3.4;
  c.lineCap = 'round';
  if (dashed) c.setLineDash([6, 4]);
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2 - Math.cos(angle) * 5, y2 - Math.sin(angle) * 5);
  c.stroke();
  c.restore();

  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(x2 - 11 * Math.cos(angle - 0.42), y2 - 11 * Math.sin(angle - 0.42));
  c.lineTo(x2 - 11 * Math.cos(angle + 0.42), y2 - 11 * Math.sin(angle + 0.42));
  c.closePath();
  c.fill();

  return { x: x2, y: y2 };
}

export interface LabelCandidate {
  x: number;
  y: number;
  a?: 'l' | 'r' | 'c';
}

export function makeLabelPlacer(c: CanvasRenderingContext2D, W: number, maxH: number) {
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  const intersects = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) => a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;

  return {
    keepOut(r: { x: number; y: number; w: number; h: number }) {
      rects.push(r);
    },
    label(text: string, color: string, cands: LabelCandidate[]) {
      c.font = `700 12px ${CANVAS_FONT}`;
      const w = Math.ceil(c.measureText(text).width) + 14;
      const h = 21;
      let chosen = { x: 4, y: 4, w, h };

      for (let i = 0; i < cands.length; i++) {
        const cd = cands[i];
        const x = cd.a === 'r' ? cd.x - w : cd.a === 'c' ? cd.x - w / 2 : cd.x;
        const r = { x, y: cd.y - 15, w, h };
        const inside = r.x >= 4 && r.x + r.w <= W - 4 && r.y >= 4 && r.y + r.h <= maxH - 4;
        const free = !rects.some((o) => intersects(r, o));
        if (inside && free) {
          chosen = r;
          break;
        }
        if (i === cands.length - 1) {
          r.x = Math.max(4, Math.min(W - w - 4, r.x));
          r.y = Math.max(4, Math.min(maxH - 4 - h, r.y));
          chosen = r;
        }
      }

      rects.push(chosen);
      c.save();
      c.fillStyle = 'rgba(255,255,255,0.95)';
      drawRoundedRect(c, chosen.x, chosen.y, chosen.w, chosen.h, 6);
      c.fill();
      c.strokeStyle = color;
      c.globalAlpha = 0.5;
      c.lineWidth = 1.2;
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = color;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(text, chosen.x + 7, chosen.y + chosen.h / 2 + 0.5);
      c.restore();
    },
  };
}
