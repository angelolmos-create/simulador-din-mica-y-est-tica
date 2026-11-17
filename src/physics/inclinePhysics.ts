import { GRAVITY } from '../utils/format';

export type InclinePredKey = 'rest' | 'limit' | 'slide';
export type InclineVarKey = 'mass' | 'angle' | 'muS' | 'muK';

export interface InclineConfig {
  mass: number;
  theta: number;
  muS: number;
  muK: number;
}

export interface InclinePhysicsResult extends InclineConfig {
  weight: number;
  parallel: number;
  perpendicular: number;
  normal: number;
  maxStatic: number;
  criticalAngle: number;
  friction: number;
  netParallel: number;
  acceleration: number;
  state: InclinePredKey;
  behavior: string;
}

export interface InclineMission {
  level: number;
  title: string;
  concept: string;
  idea: string;
  what: string;
  lead: string;
  keyTakeaway: string;
  points: string[];
  explainQuestion: string;
  hint: string;
  mass: number;
  theta: number;
  muS: number;
  muK: number;
  targetMass: number;
  targetTheta: number;
  targetMuS: number;
  targetMuK: number;
  unlock: InclineVarKey;
  needsCalc?: boolean;
}

export const INCLINE_PRED_LABELS: Record<InclinePredKey, { label: string; sub: string }> = {
  rest: { label: 'Se queda quieta en la rampa', sub: 'El roce estático logra sostener el bloque' },
  limit: { label: 'Equilibrio justo en el límite', sub: 'Está en el ángulo crítico, a punto de deslizar' },
  slide: { label: 'Resbala y acelera cuesta abajo', sub: 'La componente del peso vence al roce' },
};

export const INCLINE_MISSIONS: Record<number, InclineMission> = {
  1: {
    level: 1,
    title: 'Rampa sin roce',
    concept: 'El peso se divide en dos partes',
    idea: 'Al inclinar el suelo, parte del peso empuja el bloque rampa abajo.',
    what: 'Tienes una caja de 5 kg sobre una rampa muy lisa (roce = 0). Sube el ángulo de 0° hasta 30°. Predice qué hará la caja y observa las flechas del peso.',
    lead: 'En un suelo plano todo el peso apunta contra el piso. Pero en una rampa inclinada, la gravedad sigue tirando hacia abajo y su efecto se divide en dos: una parte aprieta contra la rampa (mg·cosθ) y otra parte jala cuesta abajo (mg·sinθ).',
    keyTakeaway: 'Sin roce, cualquier ángulo mayor que 0° hace que el bloque resbale con aceleración a = g·sinθ.',
    points: [
      'Mientras más empinada está la rampa, mayor es la parte que jala cuesta abajo (mg·sinθ).',
      'Al mismo tiempo, la fuerza que aprieta contra la rampa (Normal = mg·cosθ) se hace más pequeña.',
    ],
    explainQuestion: '¿Por qué al inclinar la rampa a 30° la caja empieza a acelerar cuesta abajo aunque nadie la empuje?',
    hint: 'Porque una parte del peso (mg·sinθ = 24,5 N) apunta paralela a la rampa hacia abajo y no hay roce que la detenga.',
    mass: 5,
    theta: 0,
    muS: 0,
    muK: 0,
    targetMass: 5,
    targetTheta: 30,
    targetMuS: 0,
    targetMuK: 0,
    unlock: 'angle',
  },
  2: {
    level: 2,
    title: 'El roce detiene el bloque',
    concept: 'Equilibrio estático en una rampa',
    idea: 'Si el roce estático máximo es mayor que la fuerza cuesta abajo, la caja no resbala.',
    what: 'La rampa está inclinada a 20° con el bloque de 5 kg. Al inicio el roce estático es bajo (μs = 0,25) y resbalaría. Sube el roce estático (μs) hasta 0,60 para detenerlo y predice qué ocurrirá.',
    lead: '¿Por qué un zapato no se resbala en una calle con poca pendiente? Porque el roce estático agarra el objeto hacia arriba de la rampa, compensando la componente del peso.',
    keyTakeaway: 'Mientras mg·sinθ sea menor o igual que el roce estático máximo (μs·N), el bloque permanece en equilibrio.',
    points: [
      'El roce apunta hacia arriba de la rampa, oponiéndose al deslizamiento.',
      'A 20°, con μs = 0,60, el agarre máximo (27,6 N) supera la fuerza hacia abajo (16,8 N).',
    ],
    explainQuestion: 'A 20° la gravedad jala cuesta abajo, pero al subir μs a 0,60 la caja sigue quieta. ¿Qué fuerza la sostiene?',
    hint: 'El roce estático apunta rampa arriba con el mismo valor que mg·sinθ (16,8 N), que es menor que el máximo posible (μs·N = 27,6 N).',
    mass: 5,
    theta: 20,
    muS: 0.25,
    muK: 0.2,
    targetMass: 5,
    targetTheta: 20,
    targetMuS: 0.6,
    targetMuK: 0.2,
    unlock: 'muS',
  },
  3: {
    level: 3,
    title: 'El ángulo crítico',
    concept: 'Superar el agarre máximo',
    idea: 'Existe un ángulo exacto a partir del cual el bloque empieza a deslizar.',
    what: 'Con μs = 0,50, el ángulo límite es aproximadamente 26,6°. Sube el ángulo desde 18° hasta 30° para superar ese límite y observa qué pasa.',
    lead: 'Si vas levantando poco a poco una tabla con un borrador encima, llega un punto en que de pronto empieza a resbalar. Ese ángulo se llama ángulo crítico.',
    keyTakeaway: 'Cuando θ supera arctan(μs), mg·sinθ vence a μs·N y comienza el movimiento.',
    points: [
      'A medida que sube el ángulo, mg·sinθ aumenta y la Normal (mg·cosθ) disminuye.',
      'Por eso el roce máximo cae mientras la fuerza que jala hacia abajo crece.',
    ],
    explainQuestion: '¿Por qué al subir el ángulo hasta 30° el roce ya no pudo sostener el bloque?',
    hint: 'A 30°, mg·sinθ (24,5 N) superó al roce máximo μs·N (21,2 N). La fuerza neta dejó de ser cero y el bloque resbaló.',
    mass: 5,
    theta: 18,
    muS: 0.5,
    muK: 0.35,
    targetMass: 5,
    targetTheta: 30,
    targetMuS: 0.5,
    targetMuK: 0.35,
    unlock: 'angle',
  },
  4: {
    level: 4,
    title: 'Rampa más empinada',
    concept: 'Roce cinético al deslizar',
    idea: 'Una vez en movimiento, actúa el roce cinético (μk) y cuanto menor sea, más acelera el bloque.',
    what: 'Con la rampa a 45° y μs = 0,50, el bloque ya supera el ángulo crítico y desliza. Baja el roce cinético (μk) de 0,45 hasta 0,30 para observar cómo cambia la aceleración.',
    lead: 'Cuando el bloque ya está resbalando, el agarre disminuye respecto al estático (μk < μs). La diferencia entre la fuerza hacia abajo y el roce cinético determina qué tan rápido acelera.',
    keyTakeaway: 'Al deslizar: fuerza neta = mg·sinθ − μk·N, y la aceleración es a = (mg·sinθ − μk·N) ÷ m.',
    points: [
      'Aquí puedes ajustar por separado el roce estático (μs) y el cinético (μk).',
      'La diferencia entre mg·sinθ y μk·N produce una aceleración constante cuesta abajo.',
    ],
    explainQuestion: 'A 45° y con μk = 0,30 la aceleración es alta. ¿Qué fuerzas compiten a lo largo de la rampa?',
    hint: 'Compiten mg·sinθ (34,6 N) hacia abajo contra el roce cinético μk·N (10,4 N) hacia arriba; sobran 24,2 N cuesta abajo.',
    mass: 5,
    theta: 45,
    muS: 0.5,
    muK: 0.45,
    targetMass: 5,
    targetTheta: 45,
    targetMuS: 0.5,
    targetMuK: 0.3,
    unlock: 'muK',
  },
  5: {
    level: 5,
    title: '¿Importa la masa en el ángulo crítico?',
    concept: 'La masa se cancela en el equilibrio',
    idea: 'Si duplicas o triplicas la masa, también aumenta la Normal y el roce máximo.',
    what: 'La rampa está a 25° con μs = 0,50 (límite 26,6°). Sube la masa de 5 kg hasta 15 kg. Antes de iniciar, predice si la caja más pesada resbalará y calcula su aceleración.',
    lead: 'Muchas personas creen que una caja más pesada resbala más fácil por una rampa. Sin embargo, al aumentar la masa también aumenta la fuerza contra el suelo y, con ella, el roce máximo.',
    keyTakeaway: 'El ángulo crítico no depende de la masa: si 5 kg no resbala a 25°, 15 kg tampoco resbala.',
    points: [
      'Tanto mg·sinθ como μs·mg·cosθ se multiplican por la misma masa m.',
      'Escribe 0 si crees que no acelera.',
    ],
    explainQuestion: 'Triplicaste la masa de 5 kg a 15 kg y aun así la caja no resbaló a 25°. ¿Cómo lo explicas?',
    hint: 'La fuerza hacia abajo se triplicó (de 20,7 N a 62,1 N), pero la Normal y el roce máximo también se triplicaron (de 22,2 N a 66,6 N).',
    mass: 5,
    theta: 25,
    muS: 0.5,
    muK: 0.35,
    targetMass: 15,
    targetTheta: 25,
    targetMuS: 0.5,
    targetMuK: 0.35,
    unlock: 'mass',
    needsCalc: true,
  },
};

export function computeInclinePhysics(cfg: InclineConfig): InclinePhysicsResult {
  const radians = (cfg.theta * Math.PI) / 180;
  const weight = cfg.mass * GRAVITY;
  const parallel = weight * Math.sin(radians);
  const perpendicular = weight * Math.cos(radians);
  const normal = perpendicular;
  const muK = Math.min(cfg.muK, cfg.muS);
  const maxStatic = cfg.muS * normal;
  const criticalAngle = cfg.muS > 0 ? (Math.atan(cfg.muS) * 180) / Math.PI : 0;

  let friction = 0;
  let acceleration = 0;
  let state: InclinePredKey = 'rest';
  let behavior = 'Permanece en equilibrio estático';

  if (cfg.muS <= 1e-8) {
    friction = 0;
    acceleration = parallel / cfg.mass;
    if (cfg.theta <= 1e-6) {
      state = 'rest';
      behavior = 'Equilibrio: rampa horizontal (θ = 0°)';
    } else {
      state = 'slide';
      behavior = 'Desliza y acelera cuesta abajo';
    }
  } else if (parallel > maxStatic + 1e-6) {
    friction = muK * normal;
    acceleration = Math.max(0, (parallel - friction) / cfg.mass);
    state = 'slide';
    behavior = 'Supera el roce máximo y acelera cuesta abajo';
  } else {
    friction = parallel;
    acceleration = 0;
    const nearCritical = cfg.theta > 0 && Math.abs(cfg.theta - criticalAngle) <= 0.15;
    state = nearCritical ? 'limit' : 'rest';
    behavior = nearCritical
      ? 'Equilibrio límite (justo en el ángulo crítico)'
      : 'Permanece en equilibrio estático';
  }

  return {
    ...cfg,
    muK,
    weight,
    parallel,
    perpendicular,
    normal,
    maxStatic,
    criticalAngle,
    friction,
    netParallel: Math.max(0, parallel - friction),
    acceleration,
    state,
    behavior,
  };
}
