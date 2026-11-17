import { GRAVITY, V_EPS } from '../utils/format';

export type FlatPredKey = 'rest' | 'right' | 'left' | 'const';
export type FlatVarKey = 'mass' | 'fapp' | 'fric';

export interface FlatMission {
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
  m: number;
  fa: number;
  fk: number;
  v0: number;
  targetM: number;
  targetFa: number;
  targetFk: number;
  unlock: FlatVarKey;
  needsCalc?: boolean;
}

export interface FlatPhysicsResult {
  m: number;
  fa: number;
  fk: number;
  fr: number;
  frType: 'static' | 'kinetic' | 'none';
  fnet: number;
  acc: number;
  weight: number;
  normal: number;
  isStatic: boolean;
}

export const FLAT_PRED_LABELS: Record<FlatPredKey, { label: string; sub: string }> = {
  rest: { label: 'Se queda quieta', sub: 'No se mueve: v = 0 y a = 0' },
  right: { label: 'Acelera hacia la derecha', sub: 'Cada vez más rápido (a > 0)' },
  left: { label: 'Acelera hacia la izquierda', sub: 'a < 0 (si iba a la derecha, frena)' },
  const: { label: 'Velocidad constante', sub: 'Se mueve sin acelerar (a = 0, v ≠ 0)' },
};

export const FLAT_MISSIONS: Record<number, FlatMission> = {
  1: {
    level: 1,
    title: 'Empujón suave',
    concept: 'Fuerzas equilibradas en reposo',
    idea: 'El roce del suelo compensa tu empuje mientras no superes su límite.',
    what: 'Una caja de 50 kg está quieta y el roce máximo del suelo es 100 N. Sube tu empuje de 0 N hasta 75 N. Antes de iniciar, predice qué pasará.',
    lead: 'Una fuerza es un empujón o un jalón. Cuando empujas una caja en el suelo, el piso hace roce hacia el lado contrario. Si tu empuje no supera el agarre máximo, las fuerzas se equilibran y la caja sigue quieta.',
    keyTakeaway: 'Fuerza neta = suma de todas las fuerzas. Si tu empuje es menor o igual que el roce máximo, la fuerza neta vale 0 N y no se mueve.',
    points: [
      'Mientras tu empuje no supere los 100 N, el roce se ajusta y vale exactamente lo mismo hacia el lado contrario.',
      'Las fuerzas hacia la derecha suman positivo (+) y hacia la izquierda negativo (−).',
    ],
    explainQuestion: 'Empujaste con 75 N hacia la derecha y la caja no se movió. ¿Por qué?',
    hint: 'Tu empuje (75 N) no supera el roce máximo (100 N). El suelo responde con 75 N hacia la izquierda, dejando una fuerza neta de 0 N.',
    m: 50,
    fa: 0,
    fk: 100,
    v0: 0,
    targetM: 50,
    targetFa: 75,
    targetFk: 100,
    unlock: 'fapp',
  },
  2: {
    level: 2,
    title: 'Empujón fuerte',
    concept: 'La fuerza que sobra acelera',
    idea: 'Cuando tu empuje supera el roce, la fuerza neta produce aceleración.',
    what: 'Ahora el suelo es más liso: el roce máximo es 50 N y la caja sigue siendo de 50 kg. Sube tu empuje de 0 N hasta 150 N. Predice qué hará la caja.',
    lead: 'Cuando empujas más fuerte de lo que el suelo puede frenar, sobra fuerza hacia un lado. Esa fuerza que sobra es la fuerza neta y hace que la velocidad cambie: la caja acelera.',
    keyTakeaway: 'Aceleración = fuerza neta ÷ masa. Aquí sobran 100 N para 50 kg: a = 2,00 m/s².',
    points: [
      'En la gráfica de velocidad contra tiempo, una aceleración constante dibuja una línea recta inclinada.',
      'Cada segundo que pasa, la velocidad aumenta 2,00 m/s.',
    ],
    explainQuestion: 'Con 150 N hacia la derecha y 50 N de roce hacia la izquierda, ¿por qué aceleró la caja?',
    hint: 'Porque tu empuje fue mayor que el roce (150 − 50 = +100 N). La fuerza neta positiva hace que la velocidad crezca constantemente.',
    m: 50,
    fa: 0,
    fk: 50,
    v0: 0,
    targetM: 50,
    targetFa: 150,
    targetFk: 50,
    unlock: 'fapp',
  },
  3: {
    level: 3,
    title: 'Caja en marcha',
    concept: 'Inercia y velocidad constante',
    idea: 'Si ya se está moviendo y las fuerzas se equilibran, sigue avanzando a la misma velocidad.',
    what: 'La caja ya viaja a 4,0 m/s con un empuje de 150 N y roce de 50 N. Sube el roce hasta 150 N para igualar tu empuje. Predice qué pasará.',
    lead: 'Muchos piensan que para que algo siga moviéndose hace falta que sobre fuerza. En realidad, cuando las fuerzas suman cero sobre un objeto que ya se mueve, conserva su velocidad por inercia.',
    keyTakeaway: 'Fuerza neta = 0 N significa que la velocidad no cambia: si estaba en 4 m/s, sigue en 4 m/s.',
    points: [
      'Estar quieto no es lo único donde hay equilibrio: moverse parejo en línea recta también es equilibrio.',
      'En la gráfica verás una línea horizontal plana en 4,0 m/s.',
    ],
    explainQuestion: 'El roce llegó a 150 N, igual que el empuje. ¿Por qué la caja no se frenó?',
    hint: 'Empuje (+150 N) + roce (−150 N) = 0 N. Sin fuerza neta no hay aceleración ni frenado; la inercia mantiene los 4,00 m/s.',
    m: 50,
    fa: 150,
    fk: 50,
    v0: 4.0,
    targetM: 50,
    targetFa: 150,
    targetFk: 150,
    unlock: 'fric',
  },
  4: {
    level: 4,
    title: 'El doble de empuje',
    concept: 'Más fuerza, más aceleración',
    idea: 'La aceleración crece en proporción a la fuerza neta.',
    what: 'Con masa de 50 kg y roce de 50 N, sube tu empuje de 150 N hasta 250 N. Predice qué ocurrirá y compara con el nivel 2.',
    lead: 'Si mantienes la misma caja y duplicas la fuerza neta que sobra, la aceleración también se duplica.',
    keyTakeaway: 'a = ΣF ÷ m. Con igual masa: el doble de fuerza neta produce el doble de aceleración.',
    points: [
      'La fuerza neta (empuje menos roce) pasa de 100 N a 200 N.',
      'La línea de la gráfica sube el doble de rápido.',
    ],
    explainQuestion: 'La fuerza neta pasó de +100 N a +200 N con la misma masa. ¿Qué pasó con la aceleración?',
    hint: 'Como la fuerza neta se duplicó de 100 N a 200 N y la masa siguió en 50 kg, la aceleración subió de 2,00 a 4,00 m/s².',
    m: 50,
    fa: 150,
    fk: 50,
    v0: 0,
    targetM: 50,
    targetFa: 250,
    targetFk: 50,
    unlock: 'fapp',
  },
  5: {
    level: 5,
    title: 'El doble de masa',
    concept: 'Más masa, menos aceleración',
    idea: 'La masa mide cuánta resistencia opone un objeto al cambio de movimiento.',
    what: 'Con empuje de 250 N y roce de 50 N (fuerza neta = +200 N), sube la masa de 50 kg hasta 100 kg. Calcula cuánto valdrá la aceleración.',
    lead: 'Mover algo pesado cuesta más que mover algo liviano. Con la misma fuerza neta, una caja con el doble de masa acelera exactamente a la mitad.',
    keyTakeaway: 'a = ΣF ÷ m. Con la misma fuerza neta: el doble de masa reduce la aceleración a la mitad.',
    points: [
      'En este nivel debes escribir tu cálculo de aceleración antes de iniciar.',
      'Puedes usar punto o coma decimal.',
    ],
    explainQuestion: 'Con la misma fuerza neta (+200 N) del nivel 4 pero el doble de masa (100 kg), ¿cómo cambió la aceleración?',
    hint: 'Al duplicar la masa de 50 kg a 100 kg, la inercia es el doble y la aceleración baja a la mitad: 200 ÷ 100 = 2,00 m/s².',
    m: 50,
    fa: 250,
    fk: 50,
    v0: 0,
    targetM: 100,
    targetFa: 250,
    targetFk: 50,
    unlock: 'mass',
    needsCalc: true,
  },
};

export function computeFlatPhysics(
  m: number,
  fa: number,
  fk: number,
  v: number,
): FlatPhysicsResult {
  const safeFk = Math.max(0, fk);
  const weight = m * GRAVITY;
  const normal = weight;
  let fr = 0;
  let frType: 'static' | 'kinetic' | 'none' = 'none';
  let isStatic = false;

  if (Math.abs(v) > V_EPS) {
    fr = v > 0 ? -safeFk : safeFk;
    frType = safeFk > 0 ? 'kinetic' : 'none';
  } else if (Math.abs(fa) <= safeFk) {
    fr = Math.abs(fa) > 0 ? -fa : 0;
    frType = safeFk > 0 && Math.abs(fa) > 0 ? 'static' : 'none';
    isStatic = true;
  } else {
    fr = -Math.sign(fa) * safeFk;
    frType = safeFk > 0 ? 'kinetic' : 'none';
  }

  const fnet = fa + fr;
  return {
    m,
    fa,
    fk: safeFk,
    fr,
    frType,
    fnet,
    acc: fnet / m,
    weight,
    normal,
    isStatic,
  };
}

export function evaluateFlatPrediction(acc: number, vel: number): FlatPredKey {
  if (Math.abs(acc) < V_EPS && Math.abs(vel) > V_EPS) return 'const';
  if (Math.abs(acc) < V_EPS && Math.abs(vel) <= V_EPS) return 'rest';
  if (acc > V_EPS) return 'right';
  return 'left';
}
