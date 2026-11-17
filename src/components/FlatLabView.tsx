import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Save } from 'lucide-react';
import {
  computeFlatPhysics,
  evaluateFlatPrediction,
  FLAT_MISSIONS,
  FLAT_PRED_LABELS,
  type FlatPredKey,
} from '../physics/flatPhysics';
import type { AppRoute, NotebookEntry, TopicId } from '../types/physics';
import { fmt, MAX_LEVEL_UNLOCK_SEC, MIN_OBS_TIME, parseLocaleFloat, V_EPS } from '../utils/format';
import {
  CANVAS_FONT,
  drawArrow,
  drawRoundedRect,
  makeLabelPlacer,
  sizeHighDpiCanvas,
  VEC_COLORS,
} from './CanvasUtils';
import { VelocityGraph, type VelocityPoint } from './VelocityGraph';

interface FlatLabViewProps {
  mode: 'learn' | 'free';
  level: number;
  onSaveResult: (entry: NotebookEntry, completedLevel?: number) => void;
  onUnlockLevel: (topic: TopicId, completedLevel: number) => void;
  onUpdateExplanation: (entryId: string, explanation: string) => void;
  onNavigate: (route: AppRoute) => void;
  onNotify: (msg: string, tone?: 'ok' | 'warn') => void;
}

const PIXELS_PER_METER = 38;
const MAX_HISTORY_POINTS = 600;

function ik2(ax: number, ay: number, bx: number, by: number, l1: number, l2: number, bend: number) {
  let dx = bx - ax;
  let dy = by - ay;
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.01;
  if (d > maxd) {
    bx = ax + (dx * maxd) / d;
    by = ay + (dy * maxd) / d;
    dx = bx - ax;
    dy = by - ay;
    d = maxd;
  }
  if (d < 0.5) d = 0.5;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return {
    kx: ax + (dx * a) / d - (bend * dy * h) / d,
    ky: ay + (dy * a) / d + (bend * dx * h) / d,
    fx: bx,
    fy: by,
  };
}

function gaitFoot(p: number) {
  const frac = p - Math.floor(p);
  const S = 11;
  if (frac < 0.6) return { x: S * (1 - (2 * frac) / 0.6), lift: 0 };
  const q = (frac - 0.6) / 0.4;
  return { x: -S + 2 * S * q, lift: Math.sin(Math.PI * q) * 7 };
}

function drawLimb(c: CanvasRenderingContext2D, pts: [number, number][], color: string, w: number) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}

function drawPusherFigure(
  c: CanvasRenderingContext2D,
  boxLeft: number,
  boxRight: number,
  groundY: number,
  fa: number,
  vel: number,
  dist: number,
  tSim: number,
) {
  if (Math.abs(fa) < 1) return;
  const dir = fa > 0 ? 1 : -1;
  const contactX = dir > 0 ? boxLeft : boxRight;
  const L1 = 16.5;
  const L2 = 16.5;
  const moving = Math.abs(vel) > 0.05;
  const lean = 0.16 + 0.24 * Math.min(1, Math.abs(fa) / 250);
  const torso = 25;
  const effort = !moving ? Math.sin(tSim * 9) : 0;
  const phase = (dir * dist) / 1.0;
  const bob = moving ? Math.abs(Math.sin(phase * Math.PI * 2)) * 1.6 : 0;

  const hipX = contactX - dir * (Math.sin(lean) * torso + 21) + dir * effort * 0.6;
  const hipY = groundY - (L1 + L2 - 2.2) + bob;
  const shX = hipX + dir * Math.sin(lean) * torso;
  const shY = hipY - Math.cos(lean) * torso;
  const ux = (shX - hipX) / torso;
  const uy = (shY - hipY) / torso;
  const headX = shX + ux * 13;
  const headY = shY + uy * 13;

  const w = Math.min(1, Math.abs(vel) / 0.5);
  const fa1 = gaitFoot(phase);
  const fb1 = gaitFoot(phase + 0.5);
  const offA = (-22 + effort * 1.2) * (1 - w) + (fa1.x - 7) * w;
  const offB = 7 * (1 - w) + (fb1.x - 7) * w;
  const footA = { x: hipX + dir * offA, y: groundY - fa1.lift * w };
  const footB = { x: hipX + dir * offB, y: groundY - fb1.lift * w };

  const SKIN = '#F2C29B';
  const SHIRT = '#16A34A';
  const SHIRT_D = '#0F7A38';
  const PANTS = '#27406B';
  const PANTS_D = '#1B2E4F';
  const SHOE = '#1F2937';
  const HAIR = '#3B2314';

  c.save();
  c.fillStyle = 'rgba(16,32,43,0.14)';
  c.beginPath();
  c.ellipse(hipX + dir * 2, groundY + 2, 20, 4, 0, 0, Math.PI * 2);
  c.fill();

  const drawLeg = (foot: { x: number; y: number }, col: string, shoeCol: string) => {
    const k = ik2(hipX, hipY, foot.x, foot.y - 3, L1, L2, -dir);
    drawLimb(c, [[hipX, hipY], [k.kx, k.ky], [k.fx, k.fy]], col, 7);
    drawLimb(c, [[foot.x - dir, foot.y - 1.5], [foot.x + dir * 9, foot.y - 1.5]], shoeCol, 6);
  };
  const drawArm = (dy: number, shirtCol: string) => {
    const hx = contactX;
    const hy = shY + 6 + dy;
    const e = ik2(shX, shY + 1, hx, hy, 12, 12, dir);
    drawLimb(c, [[shX, shY + 1], [e.kx, e.ky]], shirtCol, 6);
    drawLimb(c, [[e.kx, e.ky], [e.fx, e.fy]], SKIN, 4.6);
    c.fillStyle = SKIN;
    c.beginPath();
    c.arc(e.fx, e.fy, 2.8, 0, Math.PI * 2);
    c.fill();
  };

  drawLeg(footB, PANTS_D, '#0F172A');
  drawArm(3, SHIRT_D);
  drawLimb(c, [[hipX, hipY + 1], [shX, shY]], SHIRT, 11);
  drawLeg(footA, PANTS, SHOE);
  drawArm(0, SHIRT);
  drawLimb(c, [[shX, shY], [shX + ux * 6, shY + uy * 6]], SKIN, 5);
  c.fillStyle = HAIR;
  c.beginPath();
  c.arc(headX, headY, 8.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(headX + dir * 2, headY + 1.6, 7.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#10202B';
  c.beginPath();
  c.arc(headX + dir * 5, headY - 0.6, 1.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export const FlatLabView: React.FC<FlatLabViewProps> = ({
  mode,
  level,
  onSaveResult,
  onUnlockLevel,
  onUpdateExplanation,
  onNavigate,
  onNotify,
}) => {
  const isFree = mode === 'free';
  const mission = FLAT_MISSIONS[level] ?? FLAT_MISSIONS[1];

  const [mass, setMass] = useState(isFree ? 50 : mission.m);
  const [fapp, setFapp] = useState(isFree ? 0 : mission.fa);
  const [fric, setFric] = useState(isFree ? 50 : mission.fk);
  const [vInitFree, setVInitFree] = useState(0);

  const [pred, setPred] = useState<FlatPredKey | ''>('');
  const [predAccText, setPredAccText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [levelElapsedSec, setLevelElapsedSec] = useState(0);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [showHint, setShowHint] = useState(false);

  const [simTime, setSimTime] = useState(0);
  const [simVel, setSimVel] = useState(isFree ? 0 : mission.v0);
  const [obsElapsed, setObsElapsed] = useState(0);
  const [history, setHistory] = useState<VelocityPoint[]>([{ t: 0, v: isFree ? 0 : mission.v0 }]);

  const simRef = useRef({
    t: 0,
    v: isFree ? 0 : mission.v0,
    dist: 0,
    obs: 0,
    history: [{ t: 0, v: isFree ? 0 : mission.v0 }] as VelocityPoint[],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef({ mass, fapp, fric, isFree, hasStarted });
  paramsRef.current = { mass, fapp, fric, isFree, hasStarted };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const LH = 245;
    const ratio = sizeHighDpiCanvas(canvas, W, LH);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, LH);

    const { mass: m, fapp: fa, fric: fkVal, isFree: freeMode, hasStarted: started } = paramsRef.current;
    const { v, dist, t } = simRef.current;
    const revealed = freeMode || started;
    const groundY = 186;

    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#E4F1F8');
    sky.addColorStop(1, '#F8FBFD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, groundY);

    const groundFill = fkVal === 0 ? '#CFEFF6' : fkVal <= 100 ? '#E1E8ED' : '#C6D1D9';
    const groundLine = fkVal === 0 ? '#1F9DB5' : fkVal <= 100 ? '#62768A' : '#33475A';
    ctx.fillStyle = groundFill;
    ctx.fillRect(0, groundY, W, LH - groundY);
    ctx.strokeStyle = groundLine;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    const meterStep = 2;
    const pxStep = meterStep * PIXELS_PER_METER;
    const boxCenterX = Math.round(W * 0.39);
    const startMeter = Math.floor((dist - boxCenterX / PIXELS_PER_METER) / meterStep) * meterStep;
    const endMeter = startMeter + Math.ceil(W / pxStep) * meterStep + 4;

    ctx.font = `700 11px ${CANVAS_FONT}`;
    ctx.textBaseline = 'alphabetic';
    for (let mMark = startMeter; mMark <= endMeter; mMark += meterStep) {
      const gx = boxCenterX + (mMark - dist) * PIXELS_PER_METER;
      if (gx < -20 || gx > W + 20) continue;
      ctx.strokeStyle = '#8EA1B1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx, groundY - 12);
      ctx.stroke();
      ctx.fillStyle = '#41576A';
      ctx.fillText(`${mMark} m`, gx - 10, groundY + 15);
      if (fkVal > 0) {
        ctx.fillStyle = fkVal > 100 ? '#41576A' : '#8EA1B1';
        const teeth = fkVal > 100 ? 4 : 2;
        for (let j = 1; j <= teeth; j++) {
          const tx = gx + (pxStep * j) / (teeth + 1);
          ctx.beginPath();
          ctx.moveTo(tx - 3, groundY);
          ctx.lineTo(tx, groundY + 5);
          ctx.lineTo(tx + 3, groundY);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    const phys = computeFlatPhysics(m, fa, fkVal, v);
    const size = 50 + m * 0.18;
    const boxX = boxCenterX - size / 2;
    const boxTop = groundY - size;
    const cx = boxCenterX;
    const cy = boxTop + size / 2;

    drawPusherFigure(ctx, boxX, boxX + size, groundY, fa, v, dist, t);

    ctx.save();
    ctx.fillStyle = 'rgba(16,32,43,0.14)';
    ctx.beginPath();
    ctx.ellipse(boxX + size / 2, groundY + 2, size * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F6D3A8';
    ctx.strokeStyle = '#A5501B';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, boxX, boxTop, size, size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(165,80,27,0.28)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(boxX + 6, boxTop + 6, size - 12, size - 12);
    ctx.restore();

    ctx.fillStyle = '#10202B';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6B2E0F';
    ctx.font = `700 12.5px ${CANVAS_FONT}`;
    ctx.fillText(`${m} kg`, boxX + 9, boxTop + 20);

    const nbW = 246;
    const nbH = 56;
    const nbX = W - nbW - 12;
    const nbY = 10;

    const placer = makeLabelPlacer(ctx, W, LH);
    placer.keepOut({ x: boxX - 3, y: boxTop - 3, w: size + 6, h: size + 6 });
    placer.keepOut({ x: nbX, y: nbY, w: nbW, h: nbH });
    if (Math.abs(fa) >= 1) {
      placer.keepOut(
        fa > 0
          ? { x: boxX - 50, y: groundY - 78, w: 50, h: 80 }
          : { x: boxX + size, y: groundY - 78, w: 50, h: 80 },
      );
    }

    const hScale = Math.min(0.48, (W - cx - 110) / 300, (cx - 30) / 300);
    const L = groundY + 22 - cy;
    const velY = Math.min(boxTop - 36, 82);

    if (Math.abs(v) > V_EPS) {
      const vLen = Math.max(24, Math.min(115, Math.abs(v) * 16)) * Math.sign(v);
      const tip = drawArrow(ctx, cx, velY, vLen, 0, VEC_COLORS.vel, true);
      if (tip) {
        placer.label(
          `Velocidad ${fmt(v, 2)} m/s`,
          VEC_COLORS.vel,
          v > 0
            ? [{ x: tip.x + 8, y: tip.y + 5, a: 'l' }, { x: cx, y: tip.y - 12, a: 'c' }]
            : [{ x: tip.x - 8, y: tip.y + 5, a: 'r' }, { x: cx, y: tip.y - 12, a: 'c' }],
        );
      }
    }

    if (Math.abs(fa) > 0) {
      const tip = drawArrow(ctx, cx, cy - 8, fa * hScale, 0, VEC_COLORS.push);
      if (tip) {
        placer.label(
          `Empuje ${fa} N`,
          VEC_COLORS.push,
          fa > 0
            ? [{ x: tip.x + 8, y: tip.y + 5, a: 'l' }, { x: boxX + size + 8, y: tip.y + 5, a: 'l' }]
            : [{ x: tip.x - 8, y: tip.y + 5, a: 'r' }, { x: boxX - 8, y: tip.y + 5, a: 'r' }],
        );
      }
    }

    if (Math.abs(phys.fr) > 0) {
      const tip = drawArrow(ctx, cx, cy + 9, phys.fr * hScale, 0, VEC_COLORS.fric);
      const frText = `${phys.frType === 'static' ? 'Roce (quieta)' : 'Roce (mov.)'} ${Math.abs(phys.fr)} N`;
      const ty = cy + 9;
      placer.label(
        frText,
        VEC_COLORS.fric,
        phys.fr < 0
          ? [{ x: (tip ? tip.x : cx) - 8, y: ty + 5, a: 'r' }, { x: boxX + size + 8, y: ty + 24, a: 'l' }]
          : [{ x: (tip ? tip.x : cx) + 8, y: ty + 5, a: 'l' }, { x: boxX - 8, y: ty + 24, a: 'r' }],
      );
    }

    const nTip = drawArrow(ctx, cx, cy, 0, -L, VEC_COLORS.normal);
    if (nTip) {
      placer.label(`Normal ${fmt(phys.normal, 0)} N`, VEC_COLORS.normal, [
        { x: cx + 10, y: nTip.y + 5, a: 'l' },
        { x: cx - 10, y: nTip.y + 5, a: 'r' },
      ]);
    }
    const wTip = drawArrow(ctx, cx, cy, 0, L, VEC_COLORS.weight);
    if (wTip) {
      placer.label(`Peso ${fmt(phys.weight, 0)} N`, VEC_COLORS.weight, [
        { x: cx + 10, y: wTip.y + 5, a: 'l' },
        { x: cx - 10, y: wTip.y + 5, a: 'r' },
      ]);
    }

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = revealed ? VEC_COLORS.net : '#8D89EE';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    drawRoundedRect(ctx, nbX, nbY, nbW, nbH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = revealed ? VEC_COLORS.net : VEC_COLORS.mystery;
    ctx.font = `700 11.5px ${CANVAS_FONT}`;
    ctx.fillText('FUERZA NETA = suma de fuerzas', nbX + 12, nbY + 18);

    if (!revealed) {
      ctx.fillStyle = VEC_COLORS.mystery;
      ctx.font = `700 12.5px ${CANVAS_FONT}`;
      ctx.fillText('? Predice y pulsa «Iniciar»', nbX + 12, nbY + 41);
    } else if (Math.abs(phys.fnet) > 0) {
      const half = 55;
      const dx = Math.max(-half, Math.min(half, phys.fnet * 0.35));
      const sx = phys.fnet > 0 ? nbX + 18 : nbX + nbW - 18;
      const tip = drawArrow(ctx, sx, nbY + 40, dx, 0, VEC_COLORS.net);
      const txt = `${phys.fnet > 0 ? '+' : ''}${phys.fnet} N`;
      ctx.fillStyle = VEC_COLORS.net;
      ctx.font = `700 13.5px ${CANVAS_FONT}`;
      if (tip) {
        if (phys.fnet > 0) {
          ctx.textAlign = 'left';
          ctx.fillText(txt, tip.x + 8, nbY + 45);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(txt, tip.x - 8, nbY + 45);
        }
        ctx.textAlign = 'left';
      }
    } else {
      ctx.fillStyle = VEC_COLORS.ink2;
      ctx.font = `700 12.5px ${CANVAS_FONT}`;
      ctx.fillText('0 N · fuerzas equilibradas', nbX + 12, nbY + 41);
    }
  }, []);

  const resetTrial = useCallback(
    (mVal: number, faVal: number, fkVal: number, v0Val: number) => {
      setRunning(false);
      setHasStarted(false);
      setRecorded(false);
      setSavedEntryId(null);
      setFeedback(null);
      setExplanationText('');
      setShowHint(false);
      setPred('');
      setPredAccText('');
      simRef.current = {
        t: 0,
        v: v0Val,
        dist: 0,
        obs: 0,
        history: [{ t: 0, v: v0Val }],
      };
      setSimTime(0);
      setSimVel(v0Val);
      setObsElapsed(0);
      setHistory([{ t: 0, v: v0Val }]);
      setMass(mVal);
      setFapp(faVal);
      setFric(fkVal);
      requestAnimationFrame(drawCanvas);
    },
    [drawCanvas],
  );

  useEffect(() => {
    setLevelElapsedSec(0);
    if (isFree) {
      resetTrial(50, 0, 50, 0);
      setVInitFree(0);
    } else {
      resetTrial(mission.m, mission.fa, mission.fk, mission.v0);
    }
  }, [isFree, level, mission, resetTrial]);

  useEffect(() => {
    if (isFree) return;
    const id = window.setInterval(() => {
      setLevelElapsedSec((s) => (s < MAX_LEVEL_UNLOCK_SEC ? s + 1 : s));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isFree, level]);

  useEffect(() => {
    drawCanvas();
  }, [mass, fapp, fric, hasStarted, drawCanvas]);

  useEffect(() => {
    if (!running) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const cur = simRef.current;
      const phys = computeFlatPhysics(mass, fapp, fric, cur.v);
      const vPrev = cur.v;
      let vNext = vPrev + phys.acc * dt;
      if ((vPrev > 0 && vNext <= 0) || (vPrev < 0 && vNext >= 0)) vNext = 0;

      cur.v = vNext;
      cur.t += dt;
      cur.obs += dt;
      cur.dist += vNext * dt;

      cur.history.push({ t: cur.t, v: vNext });
      if (cur.history.length > MAX_HISTORY_POINTS) {
        const compacted = [cur.history[0]];
        for (let i = 1; i < cur.history.length - 1; i += 2) compacted.push(cur.history[i]);
        compacted.push(cur.history[cur.history.length - 1]);
        cur.history = compacted;
      }

      setSimTime(cur.t);
      setSimVel(cur.v);
      setObsElapsed(cur.obs);
      setHistory(cur.history.slice());
      drawCanvas();

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [running, mass, fapp, fric, drawCanvas]);

  const handleParamChange = (kind: 'mass' | 'fapp' | 'fric' | 'v0', val: number) => {
    const nextM = kind === 'mass' ? val : mass;
    const nextFa = kind === 'fapp' ? val : fapp;
    const nextFk = kind === 'fric' ? val : fric;
    const nextV0 = kind === 'v0' ? val : isFree ? vInitFree : mission.v0;
    if (kind === 'v0') setVInitFree(val);
    resetTrial(nextM, nextFa, nextFk, nextV0);
  };

  const goalReached =
    isFree ||
    (mass === mission.targetM &&
      fapp === mission.targetFa &&
      fric === mission.targetFk);

  const needsCalc = !isFree && Boolean(mission.needsCalc);
  const parsedCalc = parseLocaleFloat(predAccText);
  const canStart = goalReached && pred !== '' && (!needsCalc || !Number.isNaN(parsedCalc));
  const canSave = hasStarted && obsElapsed >= MIN_OBS_TIME && !recorded && pred !== '';
  const levelUnlocked =
    !isFree && (recorded || (hasStarted && obsElapsed >= MIN_OBS_TIME) || levelElapsedSec >= MAX_LEVEL_UNLOCK_SEC);

  useEffect(() => {
    if (!isFree && levelUnlocked) {
      onUnlockLevel('flat', level);
    }
  }, [isFree, levelUnlocked, level, onUnlockLevel]);

  const toggleRun = () => {
    if (!hasStarted) setHasStarted(true);
    if (running) {
      setRunning(false);
      if (!recorded) {
        simRef.current.obs = 0;
        setObsElapsed(0);
      }
    } else {
      setRunning(true);
    }
  };

  const handleSave = () => {
    if (!canSave || !pred) return;
    const phys = computeFlatPhysics(mass, fapp, fric, simVel);
    const actualKey = evaluateFlatPrediction(phys.acc, simVel);
    const match = pred === actualKey;

    let calcDisplay = '—';
    let calcValid = true;
    if (needsCalc && !Number.isNaN(parsedCalc)) {
      calcValid = Math.abs(parsedCalc - phys.acc) <= 0.05 + 1e-9;
      calcDisplay = `${fmt(parsedCalc, 2)} m/s² ${calcValid ? '✓' : '✗'}`;
    }

    const okAll = match && calcValid;
    setFeedback({
      ok: okAll,
      text: okAll
        ? `¡Acertaste! Con fuerza neta de ${phys.fnet} N ocurrió: «${FLAT_PRED_LABELS[actualKey].label}».`
        : `Elegiste «${FLAT_PRED_LABELS[pred].label}», pero ocurrió «${FLAT_PRED_LABELS[actualKey].label}».`,
    });

    const id = `flat-${Date.now()}`;
    const entry: NotebookEntry = {
      id,
      topic: 'flat',
      topicLabel: 'Superficie plana',
      label: isFree ? 'Modo libre' : `Nivel ${level}`,
      free: isFree,
      summaryParams: `m=${mass}kg · Fap=${fapp}N · roce=${fric}N`,
      netForceLabel: `${phys.fnet > 0 ? '+' : ''}${phys.fnet} N`,
      calcDisplay,
      accLabel: `${fmt(phys.acc, 2)} m/s²`,
      predLabel: FLAT_PRED_LABELS[pred].label,
      actualLabel: FLAT_PRED_LABELS[actualKey].label,
      match,
      explanation: '',
      timestamp: new Date().toISOString(),
    };

    onSaveResult(entry, isFree ? undefined : level);
    setSavedEntryId(id);
    setRecorded(true);
    onNotify(
      isFree
        ? 'Resultado guardado en tu cuaderno.'
        : `¡Nivel ${level} guardado en tu cuaderno!`,
      'ok',
    );
  };

  const handleSaveExplanation = () => {
    if (!savedEntryId || !explanationText.trim()) return;
    onUpdateExplanation(savedEntryId, explanationText.trim().replace(/\s+/g, ' '));
    onNotify('Explicación guardada en tu cuaderno.', 'ok');
  };

  const physNow = computeFlatPhysics(mass, fapp, fric, simVel);
  const revealed = isFree || hasStarted;
  const obsPct = Math.min(100, (obsElapsed / MIN_OBS_TIME) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'topic', topic: 'flat' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Superficie plana
        </button>
        <div className="text-sm font-semibold text-[#08485F]">
          {isFree ? 'Superficie plana · Modo libre' : `Superficie plana · Nivel ${level} de 5`}
        </div>
      </div>

      {/* Resumen superior */}
      <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 sm:p-5 space-y-2">
        <div className="text-xs font-semibold text-[#0B6A8F]">
          {isFree ? 'Exploración libre' : `Nivel ${level} · ${mission.concept}`}
        </div>
        <h1 className="font-display text-xl font-bold text-[#10202B]">
          {isFree ? 'Prueba fuerzas sobre superficie plana' : `Nivel ${level}: ${mission.title}`}
        </h1>
        <p className="text-sm text-[#425666]">
          {isFree
            ? 'Cambia la masa, el empuje (positivo hacia la derecha, negativo hacia la izquierda) y el roce máximo del suelo.'
            : mission.what}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Columna izquierda: Pasos */}
        <div className="lg:col-span-5 space-y-3">
          {/* Paso 1 */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  goalReached ? 'bg-[#17803D] text-white' : 'bg-[#0B6A8F] text-white'
                }`}
              >
                {goalReached ? '✓' : '1'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">
                  Prepara el experimento
                </h2>
                <p className="text-xs text-[#425666]">
                  {isFree ? 'Ajusta las variables a tu gusto.' : 'Lleva la variable desbloqueada hasta la meta.'}
                </p>
              </div>
            </div>

            {/* Masa */}
            <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'mass' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
              <div className="flex justify-between items-baseline text-sm">
                <label htmlFor="flat-mass" className="font-semibold text-[#10202B]">
                  Masa de la caja (m)
                </label>
                <span className="font-display font-bold text-[#08485F] tabular-nums">{mass} kg</span>
              </div>
              {!isFree && mission.unlock === 'mass' && (
                <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                  {mass === mission.targetM ? `Meta lograda: ${mission.targetM} kg` : `Meta: ${mission.targetM} kg`}
                </div>
              )}
              <input
                id="flat-mass"
                type="range"
                min={25}
                max={150}
                step={25}
                value={mass}
                disabled={!isFree && mission.unlock !== 'mass'}
                onChange={(e) => handleParamChange('mass', Number(e.target.value))}
                className="w-full mt-2 accent-[#0B6A8F]"
              />
            </div>

            {/* Empuje */}
            <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'fapp' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
              <div className="flex justify-between items-baseline text-sm">
                <label htmlFor="flat-fapp" className="font-semibold text-[#10202B]">
                  Tu empuje (F_ap)
                </label>
                <span className="font-display font-bold text-[#08485F] tabular-nums">{fapp} N</span>
              </div>
              {!isFree && mission.unlock === 'fapp' && (
                <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                  {fapp === mission.targetFa ? `Meta lograda: ${mission.targetFa} N` : `Meta: ${mission.targetFa} N`}
                </div>
              )}
              <input
                id="flat-fapp"
                type="range"
                min={-300}
                max={300}
                step={25}
                value={fapp}
                disabled={!isFree && mission.unlock !== 'fapp'}
                onChange={(e) => handleParamChange('fapp', Number(e.target.value))}
                className="w-full mt-2 accent-[#0B6A8F]"
              />
            </div>

            {/* Roce máximo */}
            <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'fric' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
              <div className="flex justify-between items-baseline text-sm">
                <label htmlFor="flat-fric" className="font-semibold text-[#10202B]">
                  Roce máximo del suelo (f)
                </label>
                <span className="font-display font-bold text-[#08485F] tabular-nums">{fric} N</span>
              </div>
              {!isFree && mission.unlock === 'fric' && (
                <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                  {fric === mission.targetFk ? `Meta lograda: ${mission.targetFk} N` : `Meta: ${mission.targetFk} N`}
                </div>
              )}
              <input
                id="flat-fric"
                type="range"
                min={0}
                max={200}
                step={25}
                value={fric}
                disabled={!isFree && mission.unlock !== 'fric'}
                onChange={(e) => handleParamChange('fric', Number(e.target.value))}
                className="w-full mt-2 accent-[#0B6A8F]"
              />
            </div>

            {isFree && (
              <div className="rounded-xl p-3 border border-[#E3EAEF] bg-[#F8FAFC]">
                <div className="flex justify-between items-baseline text-sm">
                  <label htmlFor="flat-v0" className="font-semibold text-[#10202B]">
                    Velocidad inicial (v₀)
                  </label>
                  <span className="font-display font-bold text-[#08485F] tabular-nums">{fmt(vInitFree, 1)} m/s</span>
                </div>
                <input
                  id="flat-v0"
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={vInitFree}
                  onChange={(e) => handleParamChange('v0', Number(e.target.value))}
                  className="w-full mt-2 accent-[#0B6A8F]"
                />
              </div>
            )}
          </section>

          {/* Paso 2: Predicción */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                    pred ? 'bg-[#17803D] text-white' : 'bg-[#0B6A8F] text-white'
                  }`}
                >
                  {pred ? '✓' : '2'}
                </span>
                <div>
                  <h2 className="font-display text-sm font-bold text-[#10202B]">
                    Predice qué va a pasar
                  </h2>
                  <p className="text-xs text-[#425666]">
                    {hasStarted ? 'Predicción bloqueada durante la prueba' : 'Elige antes de iniciar'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(FLAT_PRED_LABELS) as FlatPredKey[]).map((key) => {
                const selected = pred === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={hasStarted}
                    onClick={() => setPred(key)}
                    className={`text-left p-3 rounded-xl border-2 transition-colors ${
                      hasStarted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[#7FBBD2]'
                    } ${
                      selected
                        ? 'border-[#4B45D6] bg-[#EDEEFF]'
                        : 'border-[#DCE4EB] bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#10202B]">{FLAT_PRED_LABELS[key].label}</div>
                    <div className="text-[11px] text-[#425666] mt-0.5">{FLAT_PRED_LABELS[key].sub}</div>
                  </button>
                );
              })}
            </div>

            {needsCalc && (
              <div className="rounded-xl p-3 bg-[#FFF8EB] border border-[#EDC98A] space-y-1.5">
                <label htmlFor="flat-calc" className="block text-xs font-bold text-[#6B3203]">
                  Calcula: si ΣF = 200 N y masa = 100 kg, ¿cuánto vale la aceleración (m/s²)?
                </label>
                <input
                  id="flat-calc"
                  type="text"
                  inputMode="decimal"
                  disabled={hasStarted}
                  value={predAccText}
                  onChange={(e) => setPredAccText(e.target.value)}
                  placeholder="Ej. 2,00"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5B27A] bg-white text-sm font-semibold"
                />
              </div>
            )}
          </section>

          {/* Paso 3: Observar y guardar */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  recorded ? 'bg-[#17803D] text-white' : 'bg-[#0B6A8F] text-white'
                }`}
              >
                {recorded ? '✓' : '3'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">
                  Observa y guarda
                </h2>
                <p className="text-xs text-[#425666]">Observa 2,0 s seguidos y guarda tu resultado.</p>
              </div>
            </div>

            <div>
              <div className="h-2.5 rounded-full bg-[#DDE5EB] overflow-hidden">
                <div
                  className="h-full bg-[#17803D] transition-all duration-100"
                  style={{ width: `${obsPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-[#425666] mt-1 tabular-nums">
                <span>Observación seguida</span>
                <span>{fmt(Math.min(obsElapsed, MIN_OBS_TIME), 1)} / 2,0 s</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!canStart}
                onClick={toggleRun}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#17803D] hover:bg-[#0F6A30] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{running ? 'Pausar' : hasStarted ? 'Continuar' : 'Iniciar'}</span>
              </button>

              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0B6A8F] hover:bg-[#08485F] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{recorded ? 'Guardado' : 'Guardar'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  resetTrial(
                    isFree ? mass : mission.m,
                    isFree ? fapp : mission.fa,
                    isFree ? fric : mission.fk,
                    isFree ? vInitFree : mission.v0,
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#E3EAEF] hover:bg-[#D2DCE3] text-[#2D4252] text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </div>

            {!isFree && (
              <div className="pt-2 border-t border-[#E6EDF2] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#425666] tabular-nums">
                  {levelUnlocked
                    ? 'Guardar es opcional. Ya puedes pasar al siguiente nivel.'
                    : `Siguiente nivel disponible en ${Math.max(0, MAX_LEVEL_UNLOCK_SEC - levelElapsedSec)} s (o tras observar 2,0 s)`}
                </span>
                {level < 5 ? (
                  <button
                    type="button"
                    disabled={!levelUnlocked}
                    onClick={() => onNavigate({ view: 'intro', topic: 'flat', level: level + 1 })}
                    className="px-4 py-2 rounded-xl bg-[#17803D] hover:bg-[#0F6A30] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Continuar al nivel {level + 1} →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!levelUnlocked}
                    onClick={() => onNavigate({ view: 'topic', topic: 'flat' })}
                    className="px-4 py-2 rounded-xl bg-[#17803D] hover:bg-[#0F6A30] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Finalizar tema →
                  </button>
                )}
              </div>
            )}

            {feedback && (
              <div
                className={`rounded-xl p-3 text-sm border ${
                  feedback.ok
                    ? 'bg-[#E8F6EE] border-[#8ED0A5] text-[#0B4A22]'
                    : 'bg-[#FFF8EB] border-[#EDC98A] text-[#5E2C03]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {recorded && (
              <div className="space-y-3 pt-1 border-t border-[#E6EDF2]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#10202B]">
                    Explica brevemente lo que observaste (opcional)
                  </span>
                  {!isFree && (
                    <button
                      type="button"
                      onClick={() => setShowHint((h) => !h)}
                      className="text-xs font-semibold text-[#5A31B8] hover:underline cursor-pointer"
                    >
                      {showHint ? 'Ocultar pista' : 'Ver pista'}
                    </button>
                  )}
                </div>
                {showHint && !isFree && (
                  <p className="text-xs bg-[#F5F0FD] border border-[#D8C9FA] rounded-lg p-2.5 text-[#3E2380]">
                    {mission.hint}
                  </p>
                )}
                <textarea
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  placeholder={isFree ? '¿Qué pasó con la fuerza neta y la gráfica?' : mission.explainQuestion}
                  className="w-full rounded-xl border border-[#DCE4EB] p-2.5 text-sm min-h-[64px]"
                />
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <button
                    type="button"
                    onClick={handleSaveExplanation}
                    disabled={!explanationText.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#5A31B8] hover:bg-[#492599] disabled:bg-[#D5DEE5] text-white text-xs font-bold cursor-pointer"
                  >
                    Guardar explicación
                  </button>

                  {isFree && (
                    <button
                      type="button"
                      onClick={() => onNavigate({ view: 'notebook' })}
                      className="px-4 py-2 rounded-xl bg-[#0B6A8F] hover:bg-[#08485F] text-white text-sm font-bold cursor-pointer"
                    >
                      Ver mi cuaderno →
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Columna derecha: Escena, Lecturas, Gráfica y Ecuación */}
        <div className="lg:col-span-7 space-y-3">
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h2 className="font-display text-sm font-bold text-[#08485F]">
                Escena: la caja y sus fuerzas
              </h2>
              <span className="text-xs font-semibold text-[#425666]">
                {fric === 0 ? 'Suelo: hielo liso' : fric <= 100 ? 'Suelo: roce medio' : 'Suelo: muy rugoso'}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-xl border border-[#E3EAEF] bg-[#F8FBFD]"
              style={{ aspectRatio: '640 / 245' }}
              role="img"
              aria-label="Simulación de caja sobre suelo horizontal con vectores de fuerza"
            />
            <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-[#425666]">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" />Empuje</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#C62828]" />Roce</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#0B6BCB]" />Normal</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#7B3FE4]" />Peso</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#B45309]" />Fuerza neta</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-3 h-0.5 bg-[#0A7A91]" />Velocidad</span>
            </div>
          </section>

          {/* Lecturas numéricas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">Peso = Normal</div>
              <div className="font-display text-lg font-bold text-[#10202B] tabular-nums">
                {fmt(physNow.weight, 0)} N
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Fuerza neta</div>
              <div className={`font-display text-lg font-bold tabular-nums ${revealed ? 'text-[#B45309]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${physNow.fnet > 0 ? '+' : ''}${physNow.fnet} N` : '?'}
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Aceleración</div>
              <div className={`font-display text-lg font-bold tabular-nums ${revealed ? 'text-[#08485F]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(physNow.acc, 2)} m/s²` : '?'}
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">Velocidad</div>
              <div className="font-display text-lg font-bold text-[#10202B] tabular-nums">
                {fmt(simVel, 2)} m/s
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-xs font-semibold text-[#425666]">Tiempo</div>
              <div className="font-display text-lg font-bold text-[#10202B] tabular-nums">
                {fmt(simTime, 1)} s
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-7">
              <VelocityGraph history={history} currentTime={simTime} />
            </div>
            <div
              className={`md:col-span-5 rounded-xl border p-4 flex flex-col justify-center ${
                revealed ? 'bg-[#E8F6EE] border-[#8ED0A5]' : 'bg-white border-[#DCE4EB]'
              }`}
            >
              <div className="text-xs font-bold text-[#08485F]">
                Cómo se calcula (2.ª ley de Newton)
              </div>
              {revealed ? (
                <div className="font-mono-math text-xs sm:text-sm text-[#10202B] mt-2 space-y-1">
                  <div>
                    ΣF = ({fapp} N) {physNow.fr >= 0 ? '+' : '−'} {Math.abs(physNow.fr)} N ={' '}
                    <strong className="text-[#B45309]">
                      {physNow.fnet > 0 ? '+' : ''}
                      {physNow.fnet} N
                    </strong>
                  </div>
                  <div>
                    a = ΣF ÷ m = {physNow.fnet} ÷ {mass} ={' '}
                    <strong className="text-[#08485F]">{fmt(physNow.acc, 2)} m/s²</strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#425666] mt-2">
                  Aquí aparecerá la suma de fuerzas y la aceleración cuando pulses «Iniciar».
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
