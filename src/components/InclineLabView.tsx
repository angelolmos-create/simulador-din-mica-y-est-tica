import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Save } from 'lucide-react';
import {
  computeInclinePhysics,
  INCLINE_MISSIONS,
  INCLINE_PRED_LABELS,
  type InclinePredKey,
} from '../physics/inclinePhysics';
import type { AppRoute, NotebookEntry, TopicId } from '../types/physics';
import { fmt, MAX_LEVEL_UNLOCK_SEC, MIN_OBS_TIME, parseLocaleFloat } from '../utils/format';
import {
  CANVAS_FONT,
  drawArrow,
  drawRoundedRect,
  makeLabelPlacer,
  sizeHighDpiCanvas,
  VEC_COLORS,
} from './CanvasUtils';
import { InclineGraph, type InclinePoint } from './InclineGraph';

interface InclineLabViewProps {
  mode: 'learn' | 'free';
  level: number;
  onSaveResult: (entry: NotebookEntry, completedLevel?: number) => void;
  onUnlockLevel: (topic: TopicId, completedLevel: number) => void;
  onUpdateExplanation: (entryId: string, explanation: string) => void;
  onNavigate: (route: AppRoute) => void;
  onNotify: (msg: string, tone?: 'ok' | 'warn') => void;
}

const TOP_SLIDE_FRAC = 0.72;
const BOTTOM_SLIDE_FRAC = 0.09;
const MAX_HISTORY_POINTS = 600;

export const InclineLabView: React.FC<InclineLabViewProps> = ({
  mode,
  level,
  onSaveResult,
  onUnlockLevel,
  onUpdateExplanation,
  onNavigate,
  onNotify,
}) => {
  const isFree = mode === 'free';
  const mission = INCLINE_MISSIONS[level] ?? INCLINE_MISSIONS[1];

  const [mass, setMass] = useState(isFree ? 5 : mission.mass);
  const [theta, setTheta] = useState(isFree ? 20 : mission.theta);
  const [muS, setMuS] = useState(isFree ? 0.5 : mission.muS);
  const [muK, setMuK] = useState(isFree ? 0.35 : mission.muK);

  const [pred, setPred] = useState<InclinePredKey | ''>('');
  const [predAccText, setPredAccText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [levelElapsedSec, setLevelElapsedSec] = useState(0);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [showHint, setShowHint] = useState(false);

  const [obsElapsed, setObsElapsed] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const [history, setHistory] = useState<InclinePoint[]>([{ t: 0, dist: 0 }]);

  const simRef = useRef({
    t: 0,
    v: 0,
    slideFrac: TOP_SLIDE_FRAC, // TOP_SLIDE_FRAC = top of ramp, BOTTOM_SLIDE_FRAC = bottom limit
    obs: 0,
    history: [{ t: 0, dist: 0 }] as InclinePoint[],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paramsRef = useRef({ mass, theta, muS, muK, isFree, hasStarted });
  paramsRef.current = { mass, theta, muS, muK, isFree, hasStarted };

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

    const { mass: m, theta: deg, muS: ms, muK: mk, isFree: freeMode, hasStarted: started } =
      paramsRef.current;
    const revealed = freeMode || started;
    const rad = (deg * Math.PI) / 180;
    const res = computeInclinePhysics({ mass: m, theta: deg, muS: ms, muK: mk });

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#E7F3F8');
    sky.addColorStop(1, '#F8FBFD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Ramp geometry: base at bottom-left, slope rises toward right
    const baseY = 262;
    const startX = 110;
    const rampLen = 370;
    const endX = startX + Math.cos(rad) * rampLen;
    const endY = baseY - Math.sin(rad) * rampLen;

    // Ground line
    ctx.strokeStyle = '#94A6B5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, baseY);
    ctx.lineTo(W - 30, baseY);
    ctx.stroke();

    // Ramp wedge fill
    ctx.fillStyle = '#DFE8EF';
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(endX, baseY);
    ctx.lineTo(endX, endY);
    ctx.closePath();
    ctx.fill();

    // Ramp surface line
    ctx.lineCap = 'round';
    ctx.strokeStyle = ms === 0 ? '#1F9DB5' : ms >= 0.6 ? '#475569' : '#64748B';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(startX, baseY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Bottom limit stopper at the base of the ramp
    ctx.save();
    ctx.translate(startX, baseY);
    ctx.rotate(-rad);
    ctx.fillStyle = '#334155';
    drawRoundedRect(ctx, -3, -18, 7, 18, 2);
    ctx.fill();
    ctx.restore();

    // Angle arc
    if (deg > 0.5) {
      ctx.strokeStyle = '#0B6A8F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startX, baseY, 54, -rad, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#08485F';
    ctx.font = `700 13px ${CANVAS_FONT}`;
    ctx.fillText(`θ = ${fmt(deg, 1)}°`, startX + 62, baseY - 10);

    // Block on ramp
    const tangent = { x: Math.cos(rad), y: -Math.sin(rad) };
    const normalOut = { x: -Math.sin(rad), y: -Math.cos(rad) };
    const posFrac = simRef.current.slideFrac;
    const surfX = startX + tangent.x * rampLen * posFrac;
    const surfY = baseY + tangent.y * rampLen * posFrac;
    const cx = surfX + normalOut.x * 23;
    const cy = surfY + normalOut.y * 23;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rad);
    ctx.fillStyle = '#F6D3A8';
    ctx.strokeStyle = '#A5501B';
    ctx.lineWidth = 2.4;
    drawRoundedRect(ctx, -26, -19, 52, 38, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6B2E0F';
    ctx.font = `700 12.5px ${CANVAS_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${m} kg`, 0, 0);
    ctx.restore();

    // Status or vectors
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (!revealed) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#8D89EE';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      drawRoundedRect(ctx, W - 260, 14, 244, 52, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = VEC_COLORS.mystery;
      ctx.font = `700 12.5px ${CANVAS_FONT}`;
      ctx.fillText('? Predice y pulsa «Iniciar»', W - 246, 37);
      ctx.font = `500 11.5px ${CANVAS_FONT}`;
      ctx.fillText('Los vectores y fuerzas aparecerán aquí.', W - 246, 55);
      return;
    }

    // Rotated axes
    const axisLen = 78;
    ctx.save();
    ctx.strokeStyle = '#9FB0BF';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - tangent.x * axisLen, cy - tangent.y * axisLen);
    ctx.lineTo(cx + tangent.x * axisLen, cy + tangent.y * axisLen);
    ctx.moveTo(cx - normalOut.x * axisLen, cy - normalOut.y * axisLen);
    ctx.lineTo(cx + normalOut.x * axisLen, cy + normalOut.y * axisLen);
    ctx.stroke();
    ctx.restore();

    const scale = Math.min(2.2, 96 / Math.max(20, res.weight));
    const placer = makeLabelPlacer(ctx, W, H);
    placer.keepOut({ x: cx - 34, y: cy - 30, w: 68, h: 60 });

    const drawLabeledVec = (
      dx: number,
      dy: number,
      color: string,
      text: string,
      cands: Array<{ x: number; y: number; a?: 'l' | 'r' | 'c' }>,
    ) => {
      const tip = drawArrow(ctx, cx, cy, dx, dy, color);
      if (!tip) return;
      placer.label(text, color, cands);
    };

    // Weight mg (straight down)
    const wTipY = cy + res.weight * scale;
    drawLabeledVec(0, res.weight * scale, VEC_COLORS.weight, `Peso ${fmt(res.weight, 1)} N`, [
      { x: cx + 10, y: wTipY + 4, a: 'l' },
      { x: cx - 10, y: wTipY + 4, a: 'r' },
    ]);

    // Parallel component mg sinθ (down the slope)
    if (res.parallel > 0.2) {
      const pdx = -Math.cos(rad) * res.parallel * scale;
      const pdy = Math.sin(rad) * res.parallel * scale;
      drawLabeledVec(pdx, pdy, VEC_COLORS.parallel, `mg·sinθ ${fmt(res.parallel, 1)} N`, [
        { x: cx + pdx - 10, y: cy + pdy + 6, a: 'r' },
        { x: cx + pdx, y: cy + pdy + 22, a: 'c' },
      ]);
    }

    // Normal N
    const ndx = normalOut.x * res.normal * scale;
    const ndy = normalOut.y * res.normal * scale;
    drawLabeledVec(ndx, ndy, VEC_COLORS.normal, `Normal ${fmt(res.normal, 1)} N`, [
      { x: cx + ndx + 10, y: cy + ndy + 4, a: 'l' },
      { x: cx + ndx - 10, y: cy + ndy + 4, a: 'r' },
    ]);

    // Friction f (up the slope)
    if (res.friction > 0.1) {
      const fdx = tangent.x * res.friction * scale;
      const fdy = tangent.y * res.friction * scale;
      drawLabeledVec(fdx, fdy, VEC_COLORS.fric, `Roce ${fmt(res.friction, 1)} N`, [
        { x: cx + fdx + 10, y: cy + fdy - 2, a: 'l' },
        { x: cx + fdx, y: cy + fdy - 20, a: 'c' },
      ]);
    }
  }, []);

  const resetTrial = useCallback(
    (mVal: number, tVal: number, msVal: number, mkVal: number) => {
      setRunning(false);
      setHasStarted(false);
      setRecorded(false);
      setAtBottom(false);
      setSavedEntryId(null);
      setFeedback(null);
      setExplanationText('');
      setShowHint(false);
      setPred('');
      setPredAccText('');
      const initHist: InclinePoint[] = [{ t: 0, dist: 0 }];
      simRef.current = {
        t: 0,
        v: 0,
        slideFrac: TOP_SLIDE_FRAC,
        obs: 0,
        history: initHist,
      };
      setSimTime(0);
      setHistory(initHist);
      setObsElapsed(0);
      setMass(mVal);
      setTheta(tVal);
      setMuS(msVal);
      setMuK(Math.min(mkVal, msVal));
      requestAnimationFrame(drawCanvas);
    },
    [drawCanvas],
  );

  useEffect(() => {
    setLevelElapsedSec(0);
    if (isFree) {
      resetTrial(5, 20, 0.5, 0.35);
    } else {
      resetTrial(mission.mass, mission.theta, mission.muS, mission.muK);
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
  }, [mass, theta, muS, muK, hasStarted, drawCanvas]);

  useEffect(() => {
    if (!running) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const cur = simRef.current;
      const phys = computeInclinePhysics({ mass, theta, muS, muK });
      cur.t += dt;
      cur.obs += dt;

      if (phys.acceleration > 0 && cur.slideFrac > BOTTOM_SLIDE_FRAC) {
        cur.v = Math.min(4.5, cur.v + phys.acceleration * dt);
        cur.slideFrac -= cur.v * dt * 0.14;
        if (cur.slideFrac <= BOTTOM_SLIDE_FRAC) {
          cur.slideFrac = BOTTOM_SLIDE_FRAC;
          cur.v = 0;
          setAtBottom(true);
        }
      }

      const dist = Math.max(0, (TOP_SLIDE_FRAC - cur.slideFrac) / 0.14);
      cur.history.push({ t: cur.t, dist });
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
  }, [running, mass, theta, muS, muK, drawCanvas]);

  const handleParamChange = (kind: 'mass' | 'theta' | 'muS' | 'muK', val: number) => {
    const nextM = kind === 'mass' ? val : mass;
    const nextT = kind === 'theta' ? val : theta;
    const nextMs = kind === 'muS' ? val : muS;
    const nextMk = kind === 'muK' ? val : Math.min(muK, nextMs);
    resetTrial(nextM, nextT, nextMs, nextMk);
  };

  const goalReached =
    isFree ||
    (mission.unlock === 'angle'
      ? Math.abs(theta - mission.targetTheta) < 0.05
      : mission.unlock === 'mass'
        ? mass === mission.targetMass
        : mission.unlock === 'muS'
          ? Math.abs(muS - mission.targetMuS) < 0.01
          : Math.abs(muK - mission.targetMuK) < 0.01);

  const needsCalc = !isFree && Boolean(mission.needsCalc);
  const parsedCalc = parseLocaleFloat(predAccText);
  const canStart = goalReached && pred !== '' && (!needsCalc || !Number.isNaN(parsedCalc));
  const canSave = hasStarted && obsElapsed >= MIN_OBS_TIME && !recorded && pred !== '';
  const levelUnlocked =
    !isFree && (recorded || (hasStarted && obsElapsed >= MIN_OBS_TIME) || levelElapsedSec >= MAX_LEVEL_UNLOCK_SEC);

  useEffect(() => {
    if (!isFree && levelUnlocked) {
      onUnlockLevel('incline', level);
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
    const res = computeInclinePhysics({ mass, theta, muS, muK });
    const match = pred === res.state;

    let calcDisplay = '—';
    let calcValid = true;
    if (needsCalc && !Number.isNaN(parsedCalc)) {
      calcValid = Math.abs(parsedCalc - res.acceleration) <= 0.05 + 1e-9;
      calcDisplay = `${fmt(parsedCalc, 2)} m/s² ${calcValid ? '✓' : '✗'}`;
    }

    const okAll = match && calcValid;
    setFeedback({
      ok: okAll,
      text: okAll
        ? `¡Acertaste! ${res.behavior} (a = ${fmt(res.acceleration, 2)} m/s²).`
        : `Elegiste «${INCLINE_PRED_LABELS[pred].label}», pero ocurrió: ${res.behavior}.`,
    });

    const id = `inc-${Date.now()}`;
    const entry: NotebookEntry = {
      id,
      topic: 'incline',
      topicLabel: 'Plano inclinado',
      label: isFree ? 'Modo libre' : `Nivel ${level}`,
      free: isFree,
      summaryParams: `m=${mass}kg · θ=${fmt(theta, 1)}° · μs=${fmt(muS, 2)} · μk=${fmt(muK, 2)}`,
      netForceLabel: `${fmt(res.netParallel, 1)} N`,
      calcDisplay,
      accLabel: `${fmt(res.acceleration, 2)} m/s²`,
      predLabel: INCLINE_PRED_LABELS[pred].label,
      actualLabel: INCLINE_PRED_LABELS[res.state].label,
      match,
      explanation: '',
      timestamp: new Date().toISOString(),
    };

    onSaveResult(entry, isFree ? undefined : level);
    setSavedEntryId(id);
    setRecorded(true);
    onNotify(
      isFree
        ? 'Resultado de plano inclinado guardado.'
        : `¡Nivel ${level} de plano inclinado completado!`,
      'ok',
    );
  };

  const handleSaveExplanation = () => {
    if (!savedEntryId || !explanationText.trim()) return;
    onUpdateExplanation(savedEntryId, explanationText.trim().replace(/\s+/g, ' '));
    onNotify('Explicación guardada en tu cuaderno.', 'ok');
  };

  const resNow = computeInclinePhysics({ mass, theta, muS, muK });
  const revealed = isFree || hasStarted;
  const obsPct = Math.min(100, (obsElapsed / MIN_OBS_TIME) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'topic', topic: 'incline' })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#425666] hover:text-[#08485F] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Plano inclinado
        </button>
        <div className="text-sm font-semibold text-[#B45309]">
          {isFree ? 'Plano inclinado · Modo libre' : `Plano inclinado · Nivel ${level} de 5`}
        </div>
      </div>

      <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 sm:p-5 space-y-2">
        <div className="text-xs font-semibold text-[#B45309]">
          {isFree ? 'Exploración libre' : `Nivel ${level} · ${mission.concept}`}
        </div>
        <h1 className="font-display text-xl font-bold text-[#10202B]">
          {isFree ? 'Explora fuerzas en una rampa' : `Nivel ${level}: ${mission.title}`}
        </h1>
        <p className="text-sm text-[#425666]">
          {isFree
            ? 'Modifica el ángulo de la rampa, el agarre (fricción) y la masa del bloque para descubrir cuándo resbala.'
            : mission.what}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Columna izquierda: Pasos */}
        <div className="lg:col-span-5 space-y-3">
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
                  Prepara la rampa
                </h2>
                <p className="text-xs text-[#425666]">
                  {isFree ? 'Ajusta ángulo, masa y fricción.' : 'Lleva la variable desbloqueada hasta la meta.'}
                </p>
              </div>
            </div>

            {/* Ángulo */}
            <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'angle' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
              <div className="flex justify-between items-baseline text-sm">
                <label htmlFor="inc-theta" className="font-semibold text-[#10202B]">
                  Ángulo de inclinación (θ)
                </label>
                <span className="font-display font-bold text-[#08485F] tabular-nums">{fmt(theta, 1)}°</span>
              </div>
              {!isFree && mission.unlock === 'angle' && (
                <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                  {Math.abs(theta - mission.targetTheta) < 0.05
                    ? `Meta lograda: ${mission.targetTheta}°`
                    : `Meta: ${mission.targetTheta}°`}
                </div>
              )}
              <input
                id="inc-theta"
                type="range"
                min={0}
                max={60}
                step={0.5}
                value={theta}
                disabled={!isFree && mission.unlock !== 'angle'}
                onChange={(e) => handleParamChange('theta', Number(e.target.value))}
                className="w-full mt-2 accent-[#B45309]"
              />
            </div>

            {/* Masa */}
            <div className={`rounded-xl p-3 border ${isFree || mission.unlock === 'mass' ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
              <div className="flex justify-between items-baseline text-sm">
                <label htmlFor="inc-mass" className="font-semibold text-[#10202B]">
                  Masa del bloque (m)
                </label>
                <span className="font-display font-bold text-[#08485F] tabular-nums">{mass} kg</span>
              </div>
              {!isFree && mission.unlock === 'mass' && (
                <div className="text-xs font-semibold mt-0.5 text-[#B45309]">
                  {mass === mission.targetMass
                    ? `Meta lograda: ${mission.targetMass} kg`
                    : `Meta: ${mission.targetMass} kg`}
                </div>
              )}
              <input
                id="inc-mass"
                type="range"
                min={2}
                max={20}
                step={1}
                value={mass}
                disabled={!isFree && mission.unlock !== 'mass'}
                onChange={(e) => handleParamChange('mass', Number(e.target.value))}
                className="w-full mt-2 accent-[#B45309]"
              />
            </div>

            {/* Fricción estática y cinética por separado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className={`rounded-xl p-3 border ${isFree || level >= 2 ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                <div className="flex justify-between items-baseline text-xs">
                  <label htmlFor="inc-mus" className="font-semibold text-[#10202B]">Roce estático (μs)</label>
                  <span className="font-bold text-[#08485F] tabular-nums">{fmt(muS, 2)}</span>
                </div>
                {!isFree && mission.unlock === 'muS' && (
                  <div className="text-[11px] font-semibold mt-0.5 text-[#B45309]">
                    {Math.abs(muS - mission.targetMuS) < 0.01
                      ? `Meta lograda: ${fmt(mission.targetMuS, 2)}`
                      : `Meta: ${fmt(mission.targetMuS, 2)}`}
                  </div>
                )}
                <input
                  id="inc-mus"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muS}
                  disabled={!isFree && level === 1}
                  onChange={(e) => handleParamChange('muS', Number(e.target.value))}
                  className="w-full mt-2 accent-[#B45309]"
                />
              </div>

              <div className={`rounded-xl p-3 border ${(isFree || level >= 2) && muS > 0 ? 'border-[#7FBBD2] bg-white' : 'border-[#E3EAEF] bg-[#F6F9FB]'}`}>
                <div className="flex justify-between items-baseline text-xs">
                  <label htmlFor="inc-muk" className="font-semibold text-[#10202B]">Roce cinético (μk)</label>
                  <span className="font-bold text-[#08485F] tabular-nums">{fmt(muK, 2)}</span>
                </div>
                {!isFree && mission.unlock === 'muK' && (
                  <div className="text-[11px] font-semibold mt-0.5 text-[#B45309]">
                    {Math.abs(muK - mission.targetMuK) < 0.01
                      ? `Meta lograda: ${fmt(mission.targetMuK, 2)}`
                      : `Meta: ${fmt(mission.targetMuK, 2)}`}
                  </div>
                )}
                <input
                  id="inc-muk"
                  type="range"
                  min={0}
                  max={Math.max(0, muS)}
                  step={0.05}
                  value={muK}
                  disabled={(!isFree && level === 1) || muS === 0}
                  onChange={(e) => handleParamChange('muK', Number(e.target.value))}
                  className="w-full mt-2 accent-[#B45309]"
                />
              </div>
            </div>
          </section>

          {/* Paso 2 */}
          <section className="bg-white border border-[#DCE4EB] rounded-2xl p-4 space-y-3">
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
                  Predice qué hará el bloque
                </h2>
                <p className="text-xs text-[#425666]">
                  {hasStarted ? 'Predicción bloqueada' : 'Elige antes de iniciar'}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {(Object.keys(INCLINE_PRED_LABELS) as InclinePredKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={hasStarted}
                  onClick={() => setPred(key)}
                  className={`text-left p-3 rounded-xl border-2 transition-colors ${
                    hasStarted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[#7FBBD2]'
                  } ${
                    pred === key
                      ? 'border-[#4B45D6] bg-[#EDEEFF]'
                      : 'border-[#DCE4EB] bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-[#10202B]">{INCLINE_PRED_LABELS[key].label}</div>
                  <div className="text-[11px] text-[#425666]">{INCLINE_PRED_LABELS[key].sub}</div>
                </button>
              ))}
            </div>

            {needsCalc && (
              <div className="rounded-xl p-3 bg-[#FFF8EB] border border-[#EDC98A] space-y-1.5">
                <label htmlFor="inc-calc" className="block text-xs font-bold text-[#6B3203]">
                  ¿Qué aceleración tendrá el bloque de 15 kg a 25° (μs = 0,50)? (Escribe 0 si crees que no se mueve)
                </label>
                <input
                  id="inc-calc"
                  type="text"
                  inputMode="decimal"
                  disabled={hasStarted}
                  value={predAccText}
                  onChange={(e) => setPredAccText(e.target.value)}
                  placeholder="Ej. 0"
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
                  recorded ? 'bg-[#17803D] text-white' : 'bg-[#0B6A8F] text-white'
                }`}
              >
                {recorded ? '✓' : '3'}
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-[#10202B]">Observa y guarda</h2>
                <p className="text-xs text-[#425666]">Observa 2,0 s seguidos y guarda tu evidencia.</p>
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
                    isFree ? mass : mission.mass,
                    isFree ? theta : mission.theta,
                    isFree ? muS : mission.muS,
                    isFree ? muK : mission.muK,
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
                    onClick={() => onNavigate({ view: 'intro', topic: 'incline', level: level + 1 })}
                    className="px-4 py-2 rounded-xl bg-[#17803D] hover:bg-[#0F6A30] disabled:bg-[#D5DEE5] disabled:text-[#66798A] text-white text-sm font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Continuar al nivel {level + 1} →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!levelUnlocked}
                    onClick={() => onNavigate({ view: 'topic', topic: 'incline' })}
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
                  placeholder={isFree ? 'Compara mg·sinθ con μs·N…' : mission.explainQuestion}
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
              <h2 className="font-display text-sm font-bold text-[#08485F]">
                Escena: bloque en plano inclinado
              </h2>
              <span className="text-xs font-semibold text-[#425666]">
                {atBottom
                  ? 'Detenido en el tope inferior'
                  : muS === 0
                    ? 'Superficie sin fricción'
                    : `Ángulo crítico: ${fmt(resNow.criticalAngle, 1)}°`}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-xl border border-[#E3EAEF] bg-[#F8FBFD]"
              style={{ aspectRatio: '640 / 300' }}
              role="img"
              aria-label="Simulación de plano inclinado con vectores de peso, normal y fricción"
            />
            <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-[#425666]">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#7B3FE4]" />Peso (mg)</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />Cuesta abajo (mg·sinθ)</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#0B6BCB]" />Normal (N)</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#C62828]" />Roce (f)</span>
            </div>
          </section>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Fuerza cuesta abajo (mg·sinθ)</div>
              <div className={`font-display text-base font-bold tabular-nums ${revealed ? 'text-[#B45309]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(resNow.parallel, 1)} N` : '?'}
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">Normal (mg·cosθ)</div>
              <div className="font-display text-base font-bold text-[#0B6BCB] tabular-nums">
                {fmt(resNow.normal, 1)} N
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">Roce máx. (μs·N)</div>
              <div className="font-display text-base font-bold text-[#10202B] tabular-nums">
                {fmt(resNow.maxStatic, 1)} N
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Roce real</div>
              <div className={`font-display text-base font-bold tabular-nums ${revealed ? 'text-[#C62828]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(resNow.friction, 1)} N` : '?'}
              </div>
            </div>
            <div className={`border rounded-xl p-3 ${revealed ? 'bg-white border-[#DCE4EB]' : 'bg-[#EDEEFF] border-[#C8C5F7]'}`}>
              <div className="text-xs font-semibold text-[#425666]">Aceleración</div>
              <div className={`font-display text-base font-bold tabular-nums ${revealed ? 'text-[#08485F]' : 'text-[#4B45D6]'}`}>
                {revealed ? `${fmt(resNow.acceleration, 2)} m/s²` : '?'}
              </div>
            </div>
            <div className="bg-white border border-[#DCE4EB] rounded-xl p-3">
              <div className="text-xs font-semibold text-[#425666]">Peso total (mg)</div>
              <div className="font-display text-base font-bold text-[#7B3FE4] tabular-nums">
                {fmt(resNow.weight, 1)} N
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-7">
              <InclineGraph history={history} currentTime={simTime} />
            </div>
            <section
              className={`md:col-span-5 rounded-xl border p-4 flex flex-col justify-center ${
                revealed ? 'bg-[#E8F6EE] border-[#8ED0A5]' : 'bg-white border-[#DCE4EB]'
              }`}
            >
              <div className="text-xs font-bold text-[#08485F]">
                Cómo se calcula en el plano inclinado
              </div>
              {revealed ? (
                <div className="font-mono-math text-xs sm:text-sm text-[#10202B] mt-2 space-y-1">
                  <div>
                    Cuesta abajo = mg·sinθ = {fmt(resNow.parallel, 1)} N · Roce = {fmt(resNow.friction, 1)} N
                  </div>
                  <div>
                    ΣF = {fmt(resNow.parallel, 1)} − {fmt(resNow.friction, 1)} ={' '}
                    <strong className="text-[#B45309]">{fmt(resNow.netParallel, 1)} N</strong> · a = ΣF ÷ {mass} ={' '}
                    <strong className="text-[#08485F]">{fmt(resNow.acceleration, 2)} m/s²</strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#425666] mt-2">
                  Aquí aparecerá la comparación entre mg·sinθ y el roce junto con la aceleración al pulsar «Iniciar».
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
