import { GRAVITY, V_EPS } from '../utils/format';

export type PulleySetupMode = 'atwood' | 'movable';
export type PulleyPredKey = 'eq' | 'right' | 'left' | 'up' | 'down';
export type PulleyVarKey = 'm1' | 'm2' | 'pull' | 'load';

export interface PulleyConfig {
  setup: PulleySetupMode;
  m1: number;     // left mass in Atwood (kg)
  m2: number;     // right mass in Atwood (kg)
  axleFriction: number; // axle friction in N for Atwood
  loadMass: number;     // hanging load mass in Movable pulley (kg)
  pullForce: number;    // applied upward/downward pulling force on rope in Movable pulley (N)
}

export interface PulleyPhysicsResult {
  setup: PulleySetupMode;
  netForce: number; // positive = right goes down (Atwood) or load goes up (Movable)
  acceleration: number; // magnitude with sign matching netForce
  tension: number; // average / single-value rope tension (N)
  tension1: number; // left strand tension T1 (N)
  tension2: number; // right strand tension T2 (N)
  weight1: number; // P1 or Load weight
  weight2: number; // P2 or 2*F_pull
  mechanicalAdvantage: number;
  stateLabel: string;
  predMatchKey: PulleyPredKey;
}

export interface PulleyMission {
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
  setup: PulleySetupMode;
  m1: number;
  m2: number;
  axleFriction: number;
  loadMass: number;
  pullForce: number;
  targetM1: number;
  targetM2: number;
  targetLoad: number;
  targetPull: number;
  unlock: PulleyVarKey;
  needsCalc?: boolean;
}

export const PULLEY_PRED_LABELS_ATWOOD: Record<'eq' | 'right' | 'left', { label: string; sub: string }> = {
  eq: { label: 'Se queda en equilibrio', sub: 'Las masas no se mueven (a = 0)' },
  right: { label: 'La masa derecha baja', sub: 'm₂ baja y m₁ sube acelerando' },
  left: { label: 'La masa izquierda baja', sub: 'm₁ baja y m₂ sube acelerando' },
};

export const PULLEY_PRED_LABELS_MOVABLE: Record<'eq' | 'up' | 'down', { label: string; sub: string }> = {
  eq: { label: 'La carga queda suspendida', sub: 'En equilibrio, no sube ni baja (a = 0)' },
  up: { label: 'La carga sube acelerando', sub: 'La fuerza de los 2 tramos supera el peso' },
  down: { label: 'La carga baja acelerando', sub: 'El peso gana al tiro de la cuerda' },
};

export const PULLEY_MISSIONS: Record<number, PulleyMission> = {
  1: {
    level: 1,
    title: 'Contrapeso en equilibrio',
    concept: 'Polea fija y balance de pesos',
    idea: 'Una polea fija cambia la dirección de la fuerza, pero no la multiplica.',
    what: 'La masa izquierda (m₁) vale 5 kg. Ajusta la masa derecha (m₂) de 2 kg hasta 5 kg para equilibrar el sistema. Antes de iniciar, predice qué pasará.',
    lead: 'Una polea fija colgada del techo funciona como una balanza conectada por una cuerda: si jalas de un lado, levantas el otro. Cuando ambos lados pesan igual, las fuerzas se cancelan.',
    keyTakeaway: 'Si m₁ = m₂, los dos pesos son iguales (49 N cada uno), la fuerza neta es 0 N y la tensión de la cuerda vale 49 N.',
    points: [
      'La polea fija solo redirige la cuerda; no reduce el esfuerzo necesario.',
      'La tensión T tira hacia arriba de ambas cajas con el mismo valor.',
    ],
    explainQuestion: 'Con 5 kg de cada lado el sistema no se movió. ¿Cuánto vale la fuerza neta y por qué?',
    hint: 'Cada bloque pesa 5 × 9,8 = 49 N. Como tiran en sentidos opuestos de la cuerda, la fuerza neta es 49 − 49 = 0 N.',
    setup: 'atwood',
    m1: 5,
    m2: 2,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
    targetM1: 5,
    targetM2: 5,
    targetLoad: 10,
    targetPull: 49,
    unlock: 'm2',
  },
  2: {
    level: 2,
    title: 'Desequilibrio de masas',
    concept: 'Diferencia de pesos mueve todo el sistema',
    idea: 'La masa más pesada baja, pero debe arrastrar también a la más liviana.',
    what: 'Mantén m₁ en 5 kg y sube m₂ de 5 kg hasta 10 kg. Predice hacia qué lado acelerará el sistema y observa 2 segundos.',
    lead: 'Cuando una masa pesa más que la otra, la diferencia de pesos rompe el equilibrio. La masa pesada desciende y obliga a la masa liviana a subir al mismo ritmo.',
    keyTakeaway: 'La fuerza neta es la resta de los pesos (P₂ − P₁), pero acelera la suma de ambas masas (m₁ + m₂).',
    points: [
      'Como están atadas por la misma cuerda, ambas tienen la misma rapidez y aceleración.',
      'La aceleración será menor que g (9,8 m/s²) porque la masa liviana frena la caída.',
    ],
    explainQuestion: 'La masa m₂ (10 kg) bajó más lento que si cayera libremente. ¿Por qué?',
    hint: 'El peso extra es 98 N − 49 N = 49 N, pero esa fuerza tiene que mover 5 kg + 10 kg = 15 kg en total (a = 49 ÷ 15 = 3,27 m/s²).',
    setup: 'atwood',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
    targetM1: 5,
    targetM2: 10,
    targetLoad: 10,
    targetPull: 49,
    unlock: 'm2',
  },
  3: {
    level: 3,
    title: 'Calcula la aceleración del sistema',
    concept: 'Masa total en movimiento',
    idea: 'En una polea con dos masas, ΣF = (m₂ − m₁)·g y la masa total es (m₁ + m₂).',
    what: 'm₁ es de 4 kg. Sube m₂ de 4 kg hasta 8 kg. Antes de pulsar Iniciar, calcula la aceleración del sistema: diferencia de pesos ÷ masa total.',
    lead: 'Para saber qué tan rápido acelera una máquina de Atwood, divide la diferencia de pesos entre la masa total de los dos bloques juntos.',
    keyTakeaway: 'a = (P₂ − P₁) ÷ (m₁ + m₂). Aquí: (78,4 − 39,2) ÷ 12 = 3,27 m/s².',
    points: [
      'Peso 1 = 4 × 9,8 = 39,2 N; Peso 2 = 8 × 9,8 = 78,4 N.',
      'Masa total = 4 + 8 = 12 kg.',
    ],
    explainQuestion: '¿Por qué en el cálculo dividiste entre 12 kg y no solo entre 8 kg?',
    hint: 'Porque la cuerda une ambos bloques: la fuerza neta de 39,2 N tiene que acelerar tanto a los 8 kg que bajan como a los 4 kg que suben.',
    setup: 'atwood',
    m1: 4,
    m2: 4,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
    targetM1: 4,
    targetM2: 8,
    targetLoad: 10,
    targetPull: 49,
    unlock: 'm2',
    needsCalc: true,
  },
  4: {
    level: 4,
    title: 'La polea móvil: mitad de esfuerzo',
    concept: 'Ventaja mecánica 2:1',
    idea: 'Dos tramos de cuerda sostienen la carga, así que solo necesitas la mitad de fuerza.',
    what: 'Ahora usas una polea móvil para sostener una carga de 10 kg (peso = 98 N). Ajusta tu fuerza de tiro desde 30 N hasta 49 N. Predice qué pasará.',
    lead: '¿Cómo puede una persona levantar un motor pesadísimo? Usando una polea móvil. Como la cuerda baja hasta la polea de la carga y vuelve a subir al techo, hay dos tramos de cuerda cargando el peso.',
    keyTakeaway: 'Con 2 tramos de cuerda, tu fuerza se duplica: solo necesitas 49 N para sostener 98 N.',
    points: [
      'Un tramo tira desde el techo y el otro lo jalas tú: ambos tienen la misma tensión F_tiro.',
      'Fuerza hacia arriba sobre la carga = 2 × F_tiro.',
    ],
    explainQuestion: 'La caja pesa 98 N pero lograste sostenerla aplicando solo 49 N. ¿Cómo es posible?',
    hint: 'Porque el techo carga la otra mitad (49 N) a través del segundo tramo de la cuerda. 49 N + 49 N = 98 N.',
    setup: 'movable',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 30,
    targetM1: 5,
    targetM2: 5,
    targetLoad: 10,
    targetPull: 49,
    unlock: 'pull',
  },
  5: {
    level: 5,
    title: 'Levantar la carga con polea móvil',
    concept: 'Superar el peso con ventaja mecánica',
    idea: 'Cada Newton extra que jalas aporta el doble hacia arriba sobre la carga.',
    what: 'La carga sigue siendo de 10 kg (98 N). Sube tu fuerza de tiro desde 49 N hasta 64 N. Predice hacia dónde irá la carga y observa 2 segundos.',
    lead: 'Si tiras con más de la mitad del peso, la suma de las dos tensiones supera el peso de la carga y esta comienza a subir acelerando.',
    keyTakeaway: 'Fuerza neta sobre la carga = 2·F_tiro − m·g. Aquí: 2 × 64 − 98 = +30 N hacia arriba.',
    points: [
      'Como ventaja de la polea móvil usas la mitad de fuerza, pero tendrás que recoger el doble de cuerda.',
      'La aceleración de la carga es 30 ÷ 10 = 3,00 m/s² hacia arriba.',
    ],
    explainQuestion: 'Subiste tu fuerza de 49 N a 64 N (15 N más), pero la fuerza neta subió a 30 N. ¿Por qué?',
    hint: 'Porque tus 15 N extra pasan por dos tramos de cuerda unidos a la carga: 2 × 15 N = 30 N netos hacia arriba.',
    setup: 'movable',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
    targetM1: 5,
    targetM2: 5,
    targetLoad: 10,
    targetPull: 64,
    unlock: 'pull',
  },
};

export function computePulleyPhysics(cfg: PulleyConfig, vel = 0): PulleyPhysicsResult {
  if (cfg.setup === 'atwood') {
    const w1 = cfg.m1 * GRAVITY;
    const w2 = cfg.m2 * GRAVITY;
    const diff = w2 - w1;
    const totalMass = cfg.m1 + cfg.m2;
    const fAxle = Math.max(0, cfg.axleFriction);

    let netForce = 0;
    let acc = 0;
    let tension1 = w1;
    let tension2 = w2;

    if (Math.abs(vel) <= V_EPS && Math.abs(diff) <= fAxle + 1e-6) {
      netForce = 0;
      acc = 0;
      tension1 = w1;
      tension2 = w2;
    } else {
      const sign = Math.abs(vel) > V_EPS ? Math.sign(vel) : Math.sign(diff);
      const rawNet = diff - sign * fAxle;
      if (Math.abs(vel) <= V_EPS && rawNet * diff <= 0) {
        netForce = 0;
        acc = 0;
        tension1 = w1;
        tension2 = w2;
      } else {
        netForce = rawNet;
        acc = netForce / totalMass;
        // m1 accelerates upward with +acc => T1 - w1 = m1 * acc => T1 = m1 * (g + acc)
        // m2 accelerates downward with +acc => w2 - T2 = m2 * acc => T2 = m2 * (g - acc)
        // Thus T2 - T1 = sign * fAxle (torque balancing pulley axle friction!)
        tension1 = cfg.m1 * (GRAVITY + acc);
        tension2 = cfg.m2 * (GRAVITY - acc);
      }
    }

    const tension = (tension1 + tension2) / 2;

    let predMatchKey: PulleyPredKey = 'eq';
    let stateLabel = 'Equilibrio · las masas no aceleran';
    if (acc > V_EPS) {
      predMatchKey = 'right';
      stateLabel = 'm₂ baja y m₁ sube acelerando';
    } else if (acc < -V_EPS) {
      predMatchKey = 'left';
      stateLabel = 'm₁ baja y m₂ sube acelerando';
    }

    return {
      setup: 'atwood',
      netForce,
      acceleration: acc,
      tension,
      tension1,
      tension2,
      weight1: w1,
      weight2: w2,
      mechanicalAdvantage: 1,
      stateLabel,
      predMatchKey,
    };
  }

  // Movable pulley 2:1
  const loadWeight = cfg.loadMass * GRAVITY;
  const totalUpward = 2 * cfg.pullForce;
  const netForce = totalUpward - loadWeight;
  const acc = netForce / cfg.loadMass;

  let predMatchKey: PulleyPredKey = 'eq';
  let stateLabel = 'Equilibrio · la carga queda suspendida';
  if (acc > V_EPS) {
    predMatchKey = 'up';
    stateLabel = 'La carga sube acelerando';
  } else if (acc < -V_EPS) {
    predMatchKey = 'down';
    stateLabel = 'La carga baja acelerando';
  }

  return {
    setup: 'movable',
    netForce,
    acceleration: acc,
    tension: cfg.pullForce,
    tension1: cfg.pullForce,
    tension2: cfg.pullForce,
    weight1: loadWeight,
    weight2: totalUpward,
    mechanicalAdvantage: 2,
    stateLabel,
    predMatchKey,
  };
}
