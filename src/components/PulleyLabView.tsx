import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Save } from 'lucide-react';
import {
  computePulleyPhysics,
  PULLEY_MISSIONS,
  PULLEY_PRED_LABELS_ATWOOD,
  PULLEY_PRED_LABELS_MOVABLE,
  type PulleyPredKey,
  type PulleySetupMode,
} from '../physics/pulleyPhysics';
import type { AppRoute, NotebookEntry, TopicId } from '../types/physics';
import { fmt, MAX_LEVEL_UNLOCK_SEC, MIN_OBS_TIME, parseLocaleFloat } from '../utils/format';
import {
  CANVAS_FONT,
  drawArrow,
  drawRoundedRect,
  sizeHighDpiCanvas,
  VEC_COLORS,
} from './CanvasUtils';
import { PulleyGraph, type PulleyPoint } from './PulleyGraph';

const MAX_HISTORY_POINTS = 600;

interface PulleyLabViewProps {
  mode: 'learn' | 'free';
  level: number;
  onSaveResult: (entry: NotebookEntry, completedLevel?: number) => void;
  onUnlockLevel: (topic: TopicId, completedLevel: number) => void;
  onUpdateExplanation: (entryId: string, explanation: string) => void;
  onNavigate: (route: AppRoute) => void;
  onNotify: (msg: string, tone?: 'ok' | 'warn') => void;
}

function drawPulleyWheel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#F1F5F9';
  c.strokeStyle = '#0F766E';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.strokeStyle = '#94A3B8';
  c.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    c.beginPath();
    c.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    c.lineTo(-Math.cos(a) * r * 0.78, -Math.sin(a) * r * 0.78);
    c.stroke();
  }

  c.fillStyle = '#0F766E';
  c.beginPath();
  c.arc(0, 0, 5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export const PulleyLabView: React.FC<PulleyLabViewProps> = ({
  mode,
  level,
  onSaveResult,
  onUnlockLevel,
  onUpdateExplanation,
  onNavigate,
  onNotify,
}) => {
  const isFree = mode === 'free';
  const mission = PULLEY_MISSIONS[level] ?? PULLEY_MISSIONS[1];

  const [setup, setSetup] = useState<PulleySetupMode>(isFree ? 'atwood' : mission.setup);
  const [m1, setM1] = useState(isFree ? 5 : mission.m1);
  const [m2, setM2] = useState(isFree ? 5 : mission.m2);
  const [axleFriction, setAxleFriction] = useState(isFree ? 0 : mission.axleFriction);
  const [loadMass, setLoadMass] = useState(isFree ? 10 : mission.loadMass);
  const [pullForce, setPullForce] = useState(isFree ? 49 : mission.pullForce);

  const [pred, setPred] = useState<PulleyPredKey | ''>('');
  const [predAccText, setPredAccText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [levelElapsedSec, setLevelElapsedSec] = useState(0);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [showHint, setShowHint] = useState(false);

  const [obsElapsed, setObsElapsed] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const [history, setHistory] = useState<PulleyPoint[]>([{ t: 0, y1: 0, y2: 0 }]);

  const simRef = useRef({
    t: 0,
    v: 0,
    offsetPx: 0, // Atwood: + means right moves down; Movable: + means load moves up
    wheelAngle: 0,
    obs: 0,
    history: [{ t: 0, y1: 0, y2: 0 }] as PulleyPoint[],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef({
    setup,
    m1,
    m2,
    axleFriction,
    loadMass,
    pullForce,
    isFree,
    hasStarted,
  });
  paramsRef.current = { setup, m1, m2, axleFriction, loadMass, pullForce, isFree, hasStarted };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 300;
    const ratio = sizeHighDpiCanvas(canvas, W, H);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const {
      setup: st,
      m1: leftM,
      m2: rightM,
      axleFriction: fAxle,
      loadMass: lMass,
      pullForce: pForce,
      isFree: freeMode,
      hasStarted: started,
    } = paramsRef.current;
    const revealed = freeMode || started;
    const { offsetPx, wheelAngle, v } = simRef.current;
    const phys = computePulleyPhysics(
      { setup: st, m1: leftM, m2: rightM, axleFriction: fAxle, loadMass: lMass, pullForce: pForce },
      v,
    );

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#E9F4F4');
    sky.addColorStop(1, '#F8FBFD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Overhead beam
    ctx.fillStyle = '#475569';
    ctx.fillRect(110, 14, 420, 14);
    ctx.fillStyle = '#334155';
    for (let x = 125; x < 520; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x + 10, 4);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (st === 'atwood') {
      const pulleyX = W / 2 - 20;
      const pulleyY = 72;
      const r = 44;

      // Support bracket
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pulleyX, 28);
      ctx.lineTo(pulleyX, pulleyY);
      ctx.stroke();

      const leftX = pulleyX - r;
      const rightX = pulleyX + r;
      const baseBlockY = 165;
      const clampedOff = Math.max(-48, Math.min(48, offsetPx));
      const leftY = baseBlockY - clampedOff;
      const rightY = baseBlockY + clampedOff;

      // Rope
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(leftX, pulleyY);
      ctx.arc(pulleyX, pulleyY, r, Math.PI, 0, false);
      ctx.lineTo(rightX, rightY);
      ctx.stroke();

      drawPulleyWheel(ctx, pulleyX, pulleyY, r, wheelAngle);

      // Left block m1
      const s1 = 42 + leftM * 0.9;
      ctx.fillStyle = '#F6D3A8';
      ctx.strokeStyle = '#A5501B';
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, leftX - s1 / 2, leftY, s1, s1, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6B2E0F';
      ctx.font = `700 12px ${CANVAS_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`m₁: ${leftM} kg`, leftX, leftY + s1 / 2);

      // Right block m2
      const s2 = 42 + rightM * 0.9;
      ctx.fillStyle = '#CBE7E4';
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, rightX - s2 / 2, rightY, s2, s2, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0B4F4A';
      ctx.fillText(`m₂: ${rightM} kg`, rightX, rightY + s2 / 2);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Force arrows
      const wScale = 0.42;
      drawArrow(ctx, leftX, leftY + s1, 0, Math.min(50, phys.weight1 * wScale), VEC_COLORS.weight);
      ctx.fillStyle = VEC_COLORS.weight;
      ctx.font = `700 11.5px ${CANVAS_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`P₁ = ${fmt(phys.weight1, 1)} N`, leftX - 10, leftY + s1 + 26);
      ctx.textAlign = 'left';

      drawArrow(ctx, rightX, rightY + s2, 0, Math.min(50, phys.weight2 * wScale), VEC_COLORS.weight);
      ctx.fillText(`P₂ = ${fmt(phys.weight2, 1)} N`, rightX + 12, rightY + s2 + 26);

      if (revealed) {
        const diffTensions = Math.abs(phys.tension1 - phys.tension2) >= 0.05;
        drawArrow(ctx, leftX - 8, leftY, 0, -Math.min(48, phys.tension1 * wScale), VEC_COLORS.tension);
        drawArrow(ctx, rightX + 8, rightY, 0, -Math.min(48, phys.tension2 * wScale), VEC_COLORS.tension);
        ctx.fillStyle = VEC_COLORS.tension;
        if (diffTensions) {
          ctx.textAlign = 'right';
          ctx.fillText(`T₁ = ${fmt(phys.tension1, 1)} N`, leftX - 16, leftY - 12);
          ctx.textAlign = 'left';
          ctx.fillText(`T₂ = ${fmt(phys.tension2, 1)} N`, rightX + 16, rightY - 12);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(`T = ${fmt(phys.tension, 1)} N`, rightX + 16, rightY - 12);
        }
      }
    } else {
      // Movable pulley 2:1 with strictly vertical supporting strands
      const r = 24;
      const movX = 250;
      const anchorX = movX - r;
      const topGuideX = movX + r * 2;
      const topGuideY = 60;
      const clampedOff = Math.max(-42, Math.min(42, offsetPx));
      const movY = 152 - clampedOff;

      // Rope: anchor -> down left of movable pulley -> under movable pulley -> straight up to top guide -> down to pull handle
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anchorX, 28);
      ctx.lineTo(movX - r, movY);
      ctx.arc(movX, movY, r, Math.PI, 0, true);
      ctx.lineTo(topGuideX - r, topGuideY);
      ctx.arc(topGuideX, topGuideY, r, Math.PI, 0, false);
      ctx.lineTo(topGuideX + r, 185 + clampedOff * 1.4);
      ctx.stroke();

      // Anchor dot
      ctx.fillStyle = '#0F766E';
      ctx.beginPath();
      ctx.arc(anchorX, 28, 5, 0, Math.PI * 2);
      ctx.fill();

      // Top guide support
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topGuideX, 28);
      ctx.lineTo(topGuideX, topGuideY);
      ctx.stroke();

      drawPulleyWheel(ctx, movX, movY, r, wheelAngle);
      drawPulleyWheel(ctx, topGuideX, topGuideY, r, wheelAngle * 1.2);

      // Load hanging from movable pulley
      const boxW = 74;
      const boxH = 42;
      const boxY = movY + r + 14;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(movX, movY);
      ctx.lineTo(movX, boxY);
      ctx.stroke();

      ctx.fillStyle = '#F6D3A8';
      ctx.strokeStyle = '#A5501B';
      ctx.lineWidth = 2.4;
      drawRoundedRect(ctx, movX - boxW / 2, boxY, boxW, boxH, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6B2E0F';
      ctx.font = `700 12px ${CANVAS_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Carga ${lMass} kg`, movX, boxY + boxH / 2);

      // Pull arrow on right strand
      const handY = 185 + clampedOff * 1.4;
      drawArrow(ctx, topGuideX + r, handY, 0, Math.min(54, pForce * 0.55), VEC_COLORS.push);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = VEC_COLORS.push;
      ctx.font = `700 12px ${CANVAS_FONT}`;
      ctx.fillText(`F_tiro = ${pForce} N`, topGuideX + r + 10, handY + 26);

      // Load weight arrow
      drawArrow(ctx, movX, boxY + boxH, 0, Math.min(44, phys.weight1 * 0.36), VEC_COLORS.weight);
      ctx.fillStyle = VEC_COLORS.weight;
      ctx.textAlign = 'center';
      ctx.fillText(`Peso = ${fmt(phys.weight1, 1)} N`, movX, boxY + boxH + 54);
      ctx.textAlign = 'left';

      if (revealed) {
        ctx.fillStyle = VEC_COLORS.tension;
        ctx.textAlign = 'right';
        ctx.fillText(`2 tramos × ${pForce} N = ${fmt(phys.weight2, 0)} N ↑`, anchorX - 14, 118);
        ctx.textAlign = 'left';
      }
    }

    if (!revealed) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#8D89EE';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      drawRoundedRect(ctx, W - 210, 36, 194, 52, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = VEC_COLORS.mystery;
      ctx.font = `700 12px ${CANVAS_FONT}`;
      ctx.fillText('? Predice y pulsa «Iniciar»', W - 198, 59);
      ctx.font = `500 11px ${CANVAS_FONT}`;
      ctx.fillText('Fuerza neta y a ocultas', W - 198, 76);
    }
  }, []);

  const resetTrial = useCallback(
    (
      stVal: PulleySetupMode,
      m1Val: number,
      m2Val: number,
      fAxVal: number,
      lVal: number,
      pVal: number,
    ) => {
      setRunning(false);
      setHasStarted(false);
      setRecorded(false);
      setSavedEntryId(null);
      setFeedback(null);
      setExplanationText('');
      setShowHint(false);
      setPred('');
      setPredAccText('');
      const initHist: PulleyPoint[] = [{ t: 0, y1: 0, y2: 0 }];
      simRef.current = {
        t: 0,
        v: 0,
        offsetPx: 0,
        wheelAngle: 0,
        obs: 0,
        history: initHist,
      };
      setSimTime(0);
      setHistory(initHist);
      setObsElapsed(0);
      setSetup(stVal);
      setM1(m1Val);
      setM2(m2Val);
      setAxleFriction(fAxVal);
      setLoadMass(lVal);
      setPullForce(pVal);
      requestAnimationFrame(drawCanvas);
    },
    [drawCanvas],
  );

  useEffect(() => {
    setLevelElapsedSec(0);
    if (isFree) {
      resetTrial('atwood', 5, 5, 0, 10, 49);
    } else {
      resetTrial(
        mission.setup,
        mission.m1,
        mission.m2,
        mission.axleFriction,
        mission.loadMass,
        mission.pullForce,
      );
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
  }, [setup, m1, m2, axleFriction, loadMass, pullForce, hasStarted, drawCanvas]);

  useEffect(() => {
    if (!running) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const cur = simRef.current;
      const phys = computePulleyPhysics(
        { setup, m1, m2, axleFriction, loadMass, pullForce },
        cur.v,
      );

      cur.v += phys.acceleration * dt;
      cur.t += dt;
      cur.obs += dt;
      const limit = setup === 'atwood' ? 50 : 42;
      const prevOff = cur.offsetPx;
      const rawOff = cur.offsetPx + cur.v * dt * 16;
      if (rawOff >= limit) {
        cur.offsetPx = limit;
        cur.v = 0;
      } else if (rawOff <= -limit) {
        cur.offsetPx = -limit;
        cur.v = 0;
      } else {
        cur.offsetPx = rawOff;
      }
      if (Math.abs(cur.offsetPx - prevOff) > 0.001) {
        cur.wheelAngle += (cur.offsetPx - prevOff) / 26;
      }

      const disp = cur.offsetPx / 16;
      const y1 = disp;
      const y2 = setup === 'atwood' ? -disp : disp * 2;
      cur.history.push({ t: cur.t, y1, y2 });
      if (cur.history.length > MAX_HISTORY_POINTS) {
        const compacted = [cur.history[0]];
        for (let i = 1; i < cur.history.length - 1; i += 2) compacted.push(cur.history[i]);
        compacted.push(cur.history[cur.history.length - 1]);
        cur.history = compacted;
      }

      setSimTime(cur.t);
      setObsElapsed(cur.obs);
      setHistory(cur.history.slice());
      drawCanvas();

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [running, setup, m1, m2, axleFriction, loadMass, pullForce, drawCanvas]);

  const goalReached =
    isFree ||
    (setup === 'atwood'
      ? m1 === mission.targetM1 && m2 === mission.targetM2
      : loadMass === mission.targetLoad && pullForce === mission.targetPull);

  const needsCalc = !isFree && Boolean(mission.needsCalc);
  const parsedCalc = parseLocaleFloat(predAccText);
  const canStart = goalReached && pred !== '' && (!needsCalc || !Number.isNaN(parsedCalc));
  const canSave = hasStarted && obsElapsed >= MIN_OBS_TIME && !recorded && pred !== '';
  const levelUnlocked =
    !isFree && (recorded || (hasStarted && obsElapsed >= MIN_OBS_TIME) || levelElapsedSec >= MAX_LEVEL_UNLOCK_SEC);

  useEffect(() => {
    if (!isFree && levelUnlocked) {
      onUnlockLevel('pulley', level);
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

  const predOptions =
    setup === 'atwood' ? PULLEY_PRED_LABELS_ATWOOD : PULLEY_PRED_LABELS_MOVABLE;

  const handleSave = () => {
    if (!canSave || !pred) return;
    const res = computePulleyPhysics(
      { setup, m1, m2, axleFriction, loadMass, pullForce },
      simRef.current.v,
    );
    const match = pred === res.predMatchKey;

    let calcDisplay = '—';
    let calcValid = true;
    if (needsCalc && !Number.isNaN(parsedCalc)) {
      calcValid = Math.abs(parsedCalc - Math.abs(res.acceleration)) <= 0.08;
      calcDisplay = `${fmt(parsedCalc, 2)} m/s² ${calcValid ? '✓' : '✗'}`;
    }

    const okAll = match && calcValid;
    const predLabel =
      (predOptions as Record<string, { label: string }>)[pred]?.label ?? pred;
    const actualLabel =
      (predOptions as Record<string, { label: string }>)[res.predMatchKey]?.label ??
      res.stateLabel;

    setFeedback({
      ok: okAll,
      text: okAll
        ? `¡Acertaste! ${res.stateLabel} (a = ${fmt(Math.abs(res.acceleration), 2)} m/s²).`
        : `Elegiste «${predLabel}», pero ocurrió: ${res.stateLabel}.`,
    });

    const id = `pul-${Date.now()}`;
    const entry: NotebookEntry = {
      id,
      topic: 'pulley',
      topicLabel: 'Sistema de poleas',
      label: isFree ? 'Modo libre' : `Nivel ${level}`,
      free: isFree,
      summaryParams:
        setup === 'atwood'
          ? `Atwood · m₁=${m1}kg · m₂=${m2}kg`
          : `Polea móvil 2:1 · carga=${loadMass}kg · F=${pullForce}N`,
      netForceLabel: `${fmt(res.netForce, 1)} N`,
      calcDisplay,
      accLabel: `${fmt(Math.abs(res.acceleration), 2)} m/s²`,
      predLabel,
      actualLabel,
      match,
      explanation: '',
      timestamp: new Date().toISOString(),
    };

    onSaveResult(entry, isFree ? undefined : level);
    setSavedEntryId(id);
    setRecorded(true);
    onNotify(
      isFree
        ? 'Resultado de poleas guardado en tu cuaderno.'
        : `¡Nivel ${level} de poleas completado!`,
      'ok',
    );
  };

  const handleSaveExplanation = () => {
    if (!savedEntryId || !explanationText.trim()) return;
    onUpdateExplanation(savedEntryId, explanationText.trim().replace(/\s+/g, ' '));
    onNotify('Explicación guardada en tu cuaderno.', 'ok');
  };

  const resNow = computePulleyPhysics(
    { setup, m1, m2, axleFriction, loadMass, pullForce },
    simRef.current.v,
  );
  const revealed = isFree || hasStarted;
  const obsPct = Math.min(100, (obsElapsed / MIN_OBS_TIME) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'topic', topic: 'pulley' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Sistema de poleas
        </button>
        <div className="text-sm font-semibold text-[#0F766E]">
          {isFree ? 'Sistema de poleas · Modo libre' : `Sistema de poleas · Nivel ${level} de 5`}
        </div>
      </div>

      <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 sm:p-5 space-y-2">
        <div className="text-xs font-semibold text-[#0F766E]">
          {isFree ? 'Exploración libre' : `Nivel ${level} · ${mission.concept}`}
        </div>
        <h1 className="font-display text-xl font-bold text-[#10202B]">
          {isFree ? 'Experimenta con poleas y contrapesos' : `Nivel ${level}: ${mission.title}`}
        </h1>
        <p className="text-sm text-[#425666]">
          {isFree
            ? 'Elige entre dos masas colgando (máquina de Atwood) o una polea móvil que divide el esfuerzo a la mitad.'
            : mission.what}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-5 space-y-3">
          {/* Paso 1 */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  goalReached ? 'bg-[#17803D] text-white' : 'bg-[#0F766E] text-white'
                }`}
              >
                {goalReached ? '✓' : '1'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">
                  Prepara las poleas
                </h2>
                <p className="text-xs text-[#425666]">
                  {isFree ? 'Elige el tipo de sistema y ajusta las masas o fuerza.' : 'Ajusta la variable hasta alcanzar la meta.'}
                </p>
              </div>
            </div>

            {isFree && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F1F5F8] rounded-xl">
                <button
                  type="button"
                  onClick={() => resetTrial('atwood', m1, m2, axleFriction, loadMass, pullForce)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    setup === 'atwood' ? 'bg-white text-[#10202B] shadow-sm' : 'text-[#425666]'
                  }`}
                >
                  Dos masas (Atwood)
                </button>
                <button
                  type="button"
                  onClick={() => resetTrial('movable', m1, m2, axleFriction, loadMass, pullForce)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    setup === 'movable' ? 'bg-white text-[#10202B] shadow-sm' : 'text-[#425666]'
                  }`}
                >
                  Polea móvil (2:1)
                </button>
              </div>
            )}

            {setup === 'atwood' ? (
              <>
                <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'm1' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="pul-m1" className="font-semibold">Masa izquierda (m₁)</label>
                    <span className="font-bold text-[#0F766E] tabular-nums">{m1} kg</span>
                  </div>
                  <input
                    id="pul-m1"
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={m1}
                    disabled={!isFree && mission.unlock !== 'm1'}
                    onChange={(e) => resetTrial('atwood', Number(e.target.value), m2, axleFriction, loadMass, pullForce)}
                    className="w-full mt-2 accent-[#0F766E]"
                  />
                </div>

                <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'm2' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="pul-m2" className="font-semibold">Masa derecha (m₂)</label>
                    <span className="font-bold text-[#0F766E] tabular-nums">{m2} kg</span>
                  </div>
                  {!isFree && mission.unlock === 'm2' && (
                    <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                      {m2 === mission.targetM2 ? `Meta lograda: ${mission.targetM2} kg` : `Meta: ${mission.targetM2} kg`}
                    </div>
                  )}
                  <input
                    id="pul-m2"
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={m2}
                    disabled={!isFree && mission.unlock !== 'm2'}
                    onChange={(e) => resetTrial('atwood', m1, Number(e.target.value), axleFriction, loadMass, pullForce)}
                    className="w-full mt-2 accent-[#0F766E]"
                  />
                </div>

                {isFree && (
                  <div className="rounded-xl p-3 border border-[#E3EAEF] bg-[#F8FAFC]">
                    <div className="flex justify-between text-sm">
                      <label htmlFor="pul-fric" className="font-semibold">Roce del eje</label>
                      <span className="font-bold text-[#0F766E] tabular-nums">{axleFriction} N</span>
                    </div>
                    <input
                      id="pul-fric"
                      type="range"
                      min={0}
                      max={40}
                      step={5}
                      value={axleFriction}
                      onChange={(e) => resetTrial('atwood', m1, m2, Number(e.target.value), loadMass, pullForce)}
                      className="w-full mt-2 accent-[#0F766E]"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'load' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="pul-load" className="font-semibold">Masa de la carga</label>
                    <span className="font-bold text-[#0F766E] tabular-nums">{loadMass} kg ({fmt(loadMass * 9.8, 0)} N)</span>
                  </div>
                  <input
                    id="pul-load"
                    type="range"
                    min={4}
                    max={20}
                    step={2}
                    value={loadMass}
                    disabled={!isFree && mission.unlock !== 'load'}
                    onChange={(e) => resetTrial('movable', m1, m2, axleFriction, Number(e.target.value), pullForce)}
                    className="w-full mt-2 accent-[#0F766E]"
                  />
                </div>

                <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'pull' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                  <div className="flex justify-between text-sm">
                    <label htmlFor="pul-force" className="font-semibold">Tu fuerza de tiro (F_tiro)</label>
                    <span className="font-bold text-[#0F766E] tabular-nums">{pullForce} N</span>
                  </div>
                  {!isFree && mission.unlock === 'pull' && (
                    <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                      {pullForce === mission.targetPull ? `Meta lograda: ${mission.targetPull} N` : `Meta: ${mission.targetPull} N`}
                    </div>
                  )}
                  <input
                    id="pul-force"
                    type="range"
                    min={10}
                    max={140}
                    step={1}
                    value={pullForce}
                    disabled={!isFree && mission.unlock !== 'pull'}
                    onChange={(e) => resetTrial('movable', m1, m2, axleFriction, loadMass, Number(e.target.value))}
                    className="w-full mt-2 accent-[#0F766E]"
                  />
                </div>
              </>
            )}
          </section>

          {/* Paso 2 */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  pred ? 'bg-[#17803D] text-white' : 'bg-[#0F766E] text-white'
                }`}
              >
                {pred ? '✓' : '2'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">Predice qué ocurrirá</h2>
                <p className="text-xs text-[#425666]">{hasStarted ? 'Predicción bloqueada' : 'Elige antes de iniciar'}</p>
              </div>
            </div>

            <div className="grid gap-2">
              {Object.entries(predOptions).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  disabled={hasStarted}
                  onClick={() => setPred(key as PulleyPredKey)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${
                    hasStarted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[#7FBBD2]'
                  } ${
                    pred === key ? 'border-[#4B45D6] bg-[#EDEEFF]' : 'border-[#DCE4EB] bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-[#10202B]">{info.label}</div>
                  <div className="text-[11px] text-[#425666]">{info.sub}</div>
                </button>
              ))}
            </div>

            {needsCalc && (
              <div className="rounded-xl p-3 bg-[#FFF8EB] border border-[#EDC98A] space-y-1.5">
                <label htmlFor="pul-calc" className="block text-xs font-bold text-[#6B3203]">
                  Calcula la aceleración (m/s²) del sistema con m₁ = 4 kg y m₂ = 8 kg:
                </label>
                <input
                  id="pul-calc"
                  type="text"
                  inputMode="decimal"
                  disabled={hasStarted}
                  value={predAccText}
                  onChange={(e) => setPredAccText(e.target.value)}
                  placeholder="Ej. 3,27"
                  className="w-full px-3 py-2 rounded-lg border border-[#D5B27A] bg-white text-sm font-semibold"
                />
              </div>
            )}
          </section>

          {/* Paso 3 */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  recorded ? 'bg-[#17803D] text-white' : 'bg-[#0F766E] text-white'
                }`}
              >
                {recorded ? '✓' : '3'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">Observa y guarda</h2>
                <p className="text-xs text-[#425666]">Observa 2,0 s seguidos y guarda tu resultado.</p>
              </div>
            </div>

            <div>
              <div className="h-2.5 rounded-full bg-[#DDE5EB] overflow-hidden">
                <div className="h-full bg-[#17803D] transition-all duration-100" style={{ width: `${obsPct}%` }} />
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
                    isFree ? setup : mission.setup,
                    isFree ? m1 : mission.m1,
                    isFree ? m2 : mission.m2,
                    isFree ? axleFriction : mission.axleFriction,
                    isFree ? loadMass : mission.loadMass,
                    isFree ? pullForce : mission.pullForce,
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
                    onClick={() => onNavigate({ view: 'intro', topic: 'pulley', level: level + 1 })}
                    className="px-4 py-2 rounded-xl bg-[#17803D] hover:bg-[#0F6A30] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Continuar al nivel {level + 1} →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!levelUnlocked}
                    onClick={() => onNavigate({ view: 'topic', topic: 'pulley' })}
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
                  <span className="text-xs font-bold text-[#10202B]">Explica lo ocurrido</span>
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
                  placeholder={isFree ? '¿Qué ocurrió con la tensión y el movimiento?' : mission.explainQuestion}
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

        {/* Columna derecha */}
        <div className="lg:col-span-7 space-y-3">
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h2 className="font-display text-sm font-bold text-[#0F766E]">
                Escena: {setup === 'atwood' ? 'dos masas en polea fija' : 'polea móvil (ventaja 2:1)'}
              </h2>
              <span className="text-xs font-semibold text-[#425666]">
                {revealed ? resNow.stateLabel : 'Predice antes de iniciar'}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-xl border border-[#E3EAEF] bg-[#F8FBFD]"
              style={{ aspectRatio: '640 / 300' }}
              role="img"
              aria-label="Simulación de sistema de poleas con masas, cuerda y fuerzas"
            />
            <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-[#425666]">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#7B3FE4]" />Peso</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#0F766E]" />Tensión de cuerda (T)</span>
              {setup === 'movable' && (
                <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" />Tu fuerza de tiro</span>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Fuerza neta</div>
              <div className={`font-display text-base font-bold tabular-nums ${revealed ? 'text-[#B45309]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(resNow.netForce, 1)} N` : '?'}
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">
                {setup === 'atwood' && revealed && Math.abs(resNow.tension1 - resNow.tension2) >= 0.05
                  ? 'Tensiones (T₁ / T₂)'
                  : 'Tensión cuerda'}
              </div>
              <div className={`font-display font-bold tabular-nums ${revealed ? 'text-[#0F766E]' : 'text-[#4B45D6]'} ${setup === 'atwood' && revealed && Math.abs(resNow.tension1 - resNow.tension2) >= 0.05 ? 'text-xs sm:text-sm pt-0.5' : 'text-base'}`}>
                {revealed
                  ? setup === 'atwood' && Math.abs(resNow.tension1 - resNow.tension2) >= 0.05
                    ? `${fmt(resNow.tension1, 1)} / ${fmt(resNow.tension2, 1)} N`
                    : `${fmt(resNow.tension, 1)} N`
                  : '?'}
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Aceleración</div>
              <div className={`font-display text-base font-bold tabular-nums ${revealed ? 'text-[#08485F]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(Math.abs(resNow.acceleration), 2)} m/s²` : '?'}
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">
                {setup === 'atwood' ? 'Masa total (m₁+m₂)' : 'Ventaja mecánica'}
              </div>
              <div className="font-display text-base font-bold text-[#10202B] tabular-nums">
                {setup === 'atwood' ? `${m1 + m2} kg` : '2 : 1 (×2 fuerza)'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-7">
              <PulleyGraph setup={setup} history={history} currentTime={simTime} />
            </div>
            <section
              className={`md:col-span-5 rounded-xl border p-4 flex flex-col justify-center ${
                revealed ? 'bg-[#E8F6EE] border-[#8ED0A5]' : 'bg-white border-[#DCE4EB]'
              }`}
            >
              <div className="text-xs font-bold text-[#0F766E]">
                Cómo se calcula (2.ª ley de Newton)
              </div>
              {revealed ? (
                setup === 'atwood' ? (
                  <div className="font-mono-math text-xs sm:text-sm text-[#10202B] mt-2 space-y-1">
                    <div>
                      P₁ = {fmt(resNow.weight1, 1)} N · P₂ = {fmt(resNow.weight2, 1)} N
                      {axleFriction > 0 ? ` · Roce eje máx. = ${axleFriction} N` : ''}
                    </div>
                    <div>
                      ΣF = <strong className="text-[#B45309]">{fmt(resNow.netForce, 1)} N</strong> · a = ΣF ÷ ({m1} + {m2}) ={' '}
                      <strong className="text-[#08485F]">{fmt(Math.abs(resNow.acceleration), 2)} m/s²</strong>
                    </div>
                    {Math.abs(resNow.tension1 - resNow.tension2) >= 0.05 && (
                      <div className="text-xs text-[#0F766E]">
                        T₁ = {fmt(resNow.tension1, 1)} N · T₂ = {fmt(resNow.tension2, 1)} N (|T₂ − T₁| ={' '}
                        {fmt(Math.abs(resNow.tension2 - resNow.tension1), 1)} N compensa el roce del eje)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-mono-math text-xs sm:text-sm text-[#10202B] mt-2 space-y-1">
                    <div>
                      Fuerza hacia arriba = 2 × {pullForce} N = {fmt(resNow.weight2, 1)} N · Peso = {fmt(resNow.weight1, 1)} N
                    </div>
                    <div>
                      ΣF = {fmt(resNow.weight2, 1)} − {fmt(resNow.weight1, 1)} ={' '}
                      <strong className="text-[#B45309]">{fmt(resNow.netForce, 1)} N</strong> · a = ΣF ÷ {loadMass} ={' '}
                      <strong className="text-[#08485F]">{fmt(Math.abs(resNow.acceleration), 2)} m/s²</strong>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-[#425666] mt-2">
                  Aquí aparecerá el cálculo de la fuerza neta, la tensión y la aceleración al pulsar «Iniciar».
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
