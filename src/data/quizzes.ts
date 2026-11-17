import type { QuizQuestion, TopicId } from '../types/physics';

export interface TopicMeta {
  id: TopicId;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  phenomenonTitle: string;
  phenomenonSummary: string;
  phenomenonExample: string;
  accentHex: string;
  softBg: string;
}

export const TOPIC_LIST: TopicMeta[] = [
  {
    id: 'flat',
    title: 'Superficie plana',
    shortTitle: 'Empuje y roce',
    subtitle: 'Fuerzas horizontales, roce e inercia',
    description: 'Empuja una caja sobre el suelo, compara la fuerza con el roce y descubre por qué acelera o mantiene su velocidad.',
    phenomenonTitle: '¿Por qué a veces empujas algo y no se mueve?',
    phenomenonSummary:
      'Cuando empujas una caja en el suelo, el piso también la frena hacia atrás (eso es el roce). Si tu empujón es más débil que el agarre del suelo, las fuerzas se empatan y la caja no se mueve. Si empujas más fuerte, sobra fuerza y empieza a acelerar. Y si ya venía andando y las fuerzas se empatan, sigue avanzando parejo.',
    phenomenonExample: 'Ejemplo diario: empujar un mueble pesado sobre una alfombra frente a deslizarlo sobre hielo.',
    accentHex: '#0B6A8F',
    softBg: '#E7F3F8',
  },
  {
    id: 'incline',
    title: 'Plano inclinado',
    shortTitle: 'Rampas y ángulo',
    subtitle: 'Cómo se reparte el peso en una pendiente',
    description: 'Inclina una rampa, observa cómo cambia la fuerza hacia abajo y encuentra el ángulo exacto donde comienza a resbalar.',
    phenomenonTitle: '¿Por qué en una rampa más empinada todo resbala más rápido?',
    phenomenonSummary:
      'En una superficie inclinada, la gravedad sigue jalando hacia abajo, pero su efecto se parte en dos: una parte aprieta el objeto contra la rampa y otra parte lo empuja cuesta abajo. Mientras más levantas la rampa, más fuerza jala hacia abajo y menos aprieta contra el suelo, así que llega un ángulo límite donde el agarre ya no aguanta.',
    phenomenonExample: 'Ejemplo diario: inclinar una tabla o una bandeja con un vaso hasta que empieza a deslizarse.',
    accentHex: '#B45309',
    softBg: '#FEF3E2',
  },
  {
    id: 'pulley',
    title: 'Sistema de poleas',
    shortTitle: 'Poleas y tensión',
    subtitle: 'Contrapesos, cuerdas y ventaja mecánica',
    description: 'Equilibra dos masas colgando de una cuerda o usa una polea móvil para levantar cargas pesadas con la mitad de fuerza.',
    phenomenonTitle: '¿Cómo ayuda una polea a levantar objetos pesados?',
    phenomenonSummary:
      'Una polea simple con una rueda fija solo cambia hacia dónde jalas (es más cómodo jalar hacia abajo para subir algo), pero requiere la misma fuerza que el peso. En cambio, si cuelgas la carga de una polea móvil sostenida por dos tramos de cuerda, el techo carga la mitad del peso y tú solo haces la otra mitad del esfuerzo.',
    phenomenonExample: 'Ejemplo diario: grúas de construcción, ascensores con contrapeso o persianas.',
    accentHex: '#0F766E',
    softBg: '#E6F5F3',
  },
];

export const TOPIC_MAP: Record<TopicId, TopicMeta> = {
  flat: TOPIC_LIST[0],
  incline: TOPIC_LIST[1],
  pulley: TOPIC_LIST[2],
};

export const QUIZZES_BY_TOPIC: Record<TopicId, QuizQuestion[]> = {
  flat: [
    {
      id: 'f1',
      tag: 'Concepto',
      q: '¿Qué es la fuerza neta?',
      ok: 'La suma de todas las fuerzas que actúan sobre la caja, contando su dirección',
      bad: ['La fuerza más grande de todas', 'Solo el peso de la caja', 'Solo el roce del suelo'],
      why: 'La fuerza neta combina todas las fuerzas: las que van hacia la derecha suman (+) y las que van hacia la izquierda restan (−).',
    },
    {
      id: 'f2',
      tag: 'Nivel 1',
      q: 'Empujas con 75 N una caja cuyo roce máximo es 100 N. ¿Qué pasa?',
      ok: 'La caja se queda quieta y el roce vale 75 N',
      bad: ['La caja acelera hacia la derecha', 'La caja se mueve a velocidad constante', 'La caja retrocede'],
      why: 'Como tu empuje no supera los 100 N de agarre máximo, el suelo responde exactamente con 75 N hacia atrás. La fuerza neta es 0 N.',
    },
    {
      id: 'f3',
      tag: 'Nivel 2',
      q: 'Empujas con 150 N y el roce en movimiento es de 50 N. ¿Cuánto vale la fuerza neta?',
      ok: '100 N hacia la derecha',
      bad: ['200 N hacia la derecha', '150 N hacia la derecha', '0 N'],
      why: 'Fuerza neta = empuje − roce = 150 N − 50 N = 100 N hacia la derecha.',
    },
    {
      id: 'f4',
      tag: 'Nivel 2',
      q: 'Una caja de 50 kg tiene una fuerza neta de 100 N. ¿Cuál es su aceleración?',
      ok: '2 m/s²',
      bad: ['0,5 m/s²', '5 m/s²', '150 m/s²'],
      why: 'La aceleración se calcula dividiendo la fuerza neta entre la masa: 100 N ÷ 50 kg = 2 m/s².',
    },
    {
      id: 'f5',
      tag: 'Nivel 3',
      q: 'Una caja ya viaja a 4 m/s y la fuerza neta pasa a ser 0 N. ¿Qué ocurre con su velocidad?',
      ok: 'Se mantiene en 4 m/s',
      bad: ['Se frena poco a poco hasta detenerse', 'Aumenta cada vez más', 'Cae a 0 m/s al instante'],
      why: 'Si la fuerza neta es 0 N, no hay aceleración ni frenado: por inercia, la caja conserva la velocidad que ya traía.',
    },
    {
      id: 'f6',
      tag: 'Concepto',
      q: '¿Qué es la inercia?',
      ok: 'La tendencia de un objeto a mantener su reposo o su movimiento tal como está',
      bad: ['Una fuerza que empuja siempre hacia arriba', 'Un tipo de roce del suelo', 'La velocidad máxima de una caja'],
      why: 'La inercia es la resistencia natural de los cuerpos a cambiar su velocidad. Cuanta más masa tienen, más inercia poseen.',
    },
    {
      id: 'f7',
      tag: 'Nivel 4',
      q: 'Con la misma masa, duplicas la fuerza neta. ¿Qué pasa con la aceleración?',
      ok: 'Se duplica',
      bad: ['Se reduce a la mitad', 'Queda igual', 'Se vuelve cero'],
      why: 'Con igual masa, la aceleración es directamente proporcional a la fuerza neta (a = ΣF ÷ m).',
    },
    {
      id: 'f8',
      tag: 'Nivel 5',
      q: 'Con la misma fuerza neta, duplicas la masa de la caja. ¿Qué pasa con la aceleración?',
      ok: 'Se reduce a la mitad',
      bad: ['Se duplica', 'Queda igual', 'Se hace cero'],
      why: 'Al tener el doble de masa (el doble de inercia), cuesta el doble cambiar su velocidad, así que la aceleración baja a la mitad.',
    },
    {
      id: 'f9',
      tag: 'Gráfica',
      q: 'En la gráfica de velocidad contra tiempo, la línea sube en diagonal recta. ¿Qué significa?',
      ok: 'La caja está acelerando de forma constante',
      bad: ['La caja está quieta', 'La velocidad es constante', 'La fuerza neta es 0 N'],
      why: 'Una línea diagonal hacia arriba muestra que la velocidad aumenta cada segundo, es decir, hay aceleración.',
    },
    {
      id: 'f10',
      tag: 'Concepto',
      q: 'Una caja de 50 kg está apoyada en el suelo (g = 9,8 m/s²). ¿Cuánto vale la fuerza Normal que hace el piso?',
      ok: '490 N hacia arriba',
      bad: ['50 N hacia arriba', '4 900 N hacia arriba', '0 N'],
      why: 'En suelo horizontal, la fuerza Normal sostiene todo el peso de la caja: 50 kg × 9,8 m/s² = 490 N hacia arriba.',
    },
  ],
  incline: [
    {
      id: 'i1',
      tag: 'Descomposición',
      q: 'En un plano inclinado, ¿hacia dónde apunta siempre la fuerza del peso (mg)?',
      ok: 'Verticalmente hacia abajo, hacia el centro de la Tierra',
      bad: ['Paralela a la rampa', 'Perpendicular a la rampa', 'Hacia arriba de la rampa'],
      why: 'La gravedad siempre tira verticalmente hacia abajo, sin importar qué tan inclinada esté la rampa.',
    },
    {
      id: 'i2',
      tag: 'Componentes',
      q: '¿Qué parte del peso intenta hacer que el bloque resbale rampa abajo?',
      ok: 'La componente paralela a la rampa (mg·sinθ)',
      bad: ['La componente perpendicular (mg·cosθ)', 'La fuerza Normal', 'El roce estático'],
      why: 'Al descomponer el peso respecto a la rampa, mg·sinθ apunta cuesta abajo paralela a la superficie.',
    },
    {
      id: 'i3',
      tag: 'Normal',
      q: 'Si aumentas el ángulo de la rampa, ¿qué ocurre con la fuerza Normal (N)?',
      ok: 'Disminuye, porque el bloque aprieta menos contra la rampa',
      bad: ['Aumenta cada vez más', 'Se mantiene siempre igual al peso total', 'Se vuelve cero apenas inclinas 5°'],
      why: 'Como N = mg·cosθ y cosθ disminuye al aumentar el ángulo entre 0° y 90°, la fuerza Normal disminuye.',
    },
    {
      id: 'i4',
      tag: 'Sin roce',
      q: 'Sobre una rampa sin roce (μ = 0), ¿qué necesitas para que el bloque empiece a deslizar?',
      ok: 'Cualquier ángulo mayor que 0°',
      bad: ['Llegar al menos a 45°', 'Empujarlo primero con la mano', 'Que tenga mucha masa'],
      why: 'Sin roce no hay nada que detenga la componente mg·sinθ, por lo que desliza con cualquier inclinación mayor a 0°.',
    },
    {
      id: 'i5',
      tag: 'Equilibrio',
      q: 'Un bloque está quieto sobre una rampa inclinada a 15°. ¿Qué fuerza equilibra a mg·sinθ?',
      ok: 'El roce estático apuntando rampa arriba',
      bad: ['La fuerza Normal apuntando perpendicular', 'El propio peso completo', 'No actúa ninguna fuerza rampa arriba'],
      why: 'El roce estático se opone al deslizamiento potencial, tirando hacia arriba de la rampa con el mismo valor que mg·sinθ.',
    },
    {
      id: 'i6',
      tag: 'Ángulo crítico',
      q: '¿Qué ocurre justo cuando el ángulo supera al ángulo crítico?',
      ok: 'La componente mg·sinθ supera al roce estático máximo y el bloque resbala',
      bad: ['La fuerza Normal supera al peso', 'El roce estático se vuelve infinito', 'El bloque sube por la rampa'],
      why: 'Al crecer θ, crece mg·sinθ y cae μs·N. En el punto en que mg·sinθ > μs·N, el agarre falla y comienza el deslizamiento.',
    },
    {
      id: 'i7',
      tag: 'Masa y rampa',
      q: 'Un bloque de 5 kg resbala justo a los 27° en cierta rampa. Si pones uno de 15 kg del mismo material, ¿a qué ángulo resbalará?',
      ok: 'Al mismo ángulo (27°)',
      bad: ['A un ángulo mucho menor, por ser más pesado', 'A un ángulo mucho mayor', 'A 90°'],
      why: 'Tanto la fuerza cuesta abajo (mg·sinθ) como el roce máximo (μs·mg·cosθ) dependen de la masa m, así que m se cancela en tan(θ_crítico) = μs.',
    },
    {
      id: 'i8',
      tag: 'Roce cinético',
      q: 'Una vez que el bloque empieza a deslizar cuesta abajo, ¿qué tipo de roce actúa?',
      ok: 'El roce cinético (μk·N), que suele ser menor que el estático máximo',
      bad: ['El roce estático máximo', 'Ninguno, siempre desaparece por completo', 'Un roce que apunta cuesta abajo'],
      why: 'Al haber movimiento relativo entre superficies, actúa el roce cinético μk·N en sentido opuesto al movimiento (rampa arriba).',
    },
    {
      id: 'i9',
      tag: 'Rampa sin roce',
      q: 'En una rampa sin roce de 30° (sin 30° = 0,5; g = 9,8 m/s²), ¿cuál es la aceleración del bloque?',
      ok: '4,9 m/s²',
      bad: ['9,8 m/s²', '0 m/s²', '19,6 m/s²'],
      why: 'Sin roce, a = g·sin(30°) = 9,8 × 0,5 = 4,9 m/s², independientemente de la masa del bloque.',
    },
    {
      id: 'i10',
      tag: 'Comparación',
      q: '¿Qué ocurre con la aceleración cuesta abajo cuando comparas una rampa de 20° con una de 45° (mismo roce)?',
      ok: 'Es mayor en la de 45° porque aumenta mg·sinθ y disminuye el roce',
      bad: ['Es mayor en la de 20°', 'Es idéntica en ambos ángulos', 'Es cero en 45°'],
      why: 'A mayor ángulo aumenta la componente paralela que impulsa el descenso y baja la Normal (y con ella el roce), por lo que acelera más.',
    },
  ],
  pulley: [
    {
      id: 'p1',
      tag: 'Polea fija',
      q: '¿Para qué sirve principalmente una sola polea fija colgada del techo?',
      ok: 'Para cambiar la dirección de la fuerza y jalar hacia abajo con mayor comodidad',
      bad: ['Para reducir a la mitad el peso de la carga', 'Para multiplicar la fuerza por cuatro', 'Para eliminar la gravedad'],
      why: 'Una polea fija ideal no reduce la fuerza necesaria (sigues haciendo fuerza igual al peso), pero te permite jalar hacia abajo en lugar de levantar hacia arriba.',
    },
    {
      id: 'p2',
      tag: 'Equilibrio',
      q: 'En una polea fija cuelgan dos masas iguales de 5 kg cada una (g = 9,8 m/s²). ¿Qué ocurre?',
      ok: 'Quedan en equilibrio sin acelerar y la tensión de la cuerda es 49 N',
      bad: ['Ambas caen juntas', 'La tensión es 98 N', 'La de la derecha baja siempre'],
      why: 'Cada masa pesa 49 N y tiran en sentidos opuestos de la cuerda: la fuerza neta es 0 N y la tensión iguala al peso de cada una (49 N).',
    },
    {
      id: 'p3',
      tag: 'Máquina de Atwood',
      q: 'Si m₁ = 4 kg y m₂ = 8 kg cuelgan de una polea ideal, ¿qué pasa al soltarlas?',
      ok: 'm₂ baja acelerando y m₁ sube acelerando con la misma rapidez',
      bad: ['Solo m₂ se mueve y m₁ se queda quieta', 'm₂ cae con aceleración de 9,8 m/s²', 'Permanecen en equilibrio'],
      why: 'Como están unidas por la misma cuerda, si m₂ baja 1 metro, m₁ sube 1 metro al mismo tiempo; ambas aceleran juntas.',
    },
    {
      id: 'p4',
      tag: 'Masa total',
      q: 'En el sistema de dos masas (4 kg y 8 kg), ¿qué masa debe acelerar la fuerza neta?',
      ok: 'La suma de ambas masas: 12 kg',
      bad: ['Solo la más pesada: 8 kg', 'Solo la más liviana: 4 kg', 'La resta: 4 kg'],
      why: 'La diferencia de pesos impulsa todo el conjunto, por eso la 2.ª ley de Newton se aplica a la masa total (m₁ + m₂ = 12 kg).',
    },
    {
      id: 'p5',
      tag: 'Aceleración',
      q: 'Con m₁ = 5 kg y m₂ = 10 kg (g = 9,8 m/s²), ¿por qué m₂ acelera a menos de 9,8 m/s²?',
      ok: 'Porque la cuerda tira de m₂ hacia arriba mientras arrastra a m₁ hacia arriba',
      bad: ['Porque la gravedad disminuye cerca de las poleas', 'Porque la polea elimina el peso de m₂', 'Porque m₁ empuja hacia abajo a m₂'],
      why: 'La tensión de la cuerda frena parcialmente la caída de m₂; parte de su peso se usa para levantar y acelerar a m₁.',
    },
    {
      id: 'p6',
      tag: 'Polea móvil',
      q: 'Cuelgas una carga de 10 kg (98 N) de una polea móvil sostenida por 2 tramos verticales de cuerda. ¿Qué fuerza necesitas para sostenerla?',
      ok: '49 N (la mitad del peso)',
      bad: ['98 N (todo el peso)', '196 N (el doble)', '10 N'],
      why: 'Los 2 tramos de cuerda se reparten la carga por igual: el techo sostiene 49 N y tú haces los otros 49 N.',
    },
    {
      id: 'p7',
      tag: 'Ventaja mecánica',
      q: '¿Cuál es la ventaja mecánica ideal de una polea móvil simple con dos tramos de cuerda?',
      ok: '2:1 (aplicas la mitad de fuerza)',
      bad: ['1:1 (misma fuerza)', '4:1 (un cuarto de fuerza)', '10:1'],
      why: 'Al distribuir el peso entre 2 segmentos verticales de cuerda, la fuerza necesaria se divide entre 2.',
    },
    {
      id: 'p8',
      tag: 'Cuerda y distancia',
      q: 'Si usas una polea móvil (ventaja 2:1) para subir una caja 1 metro, ¿cuánta cuerda debes recoger con tus manos?',
      ok: '2 metros de cuerda',
      bad: ['0,5 metros de cuerda', '1 metro de cuerda', '4 metros de cuerda'],
      why: 'En física nada es gratis: ahorras la mitad de la fuerza, pero a cambio debes jalar el doble de longitud de cuerda.',
    },
    {
      id: 'p9',
      tag: 'Polea móvil',
      q: 'Una carga pesa 98 N en una polea móvil (2 tramos) y tiras de la cuerda con 64 N. ¿Cuál es la fuerza neta sobre la carga?',
      ok: '30 N hacia arriba',
      bad: ['34 N hacia abajo', '162 N hacia arriba', '0 N'],
      why: 'Los dos tramos tiran hacia arriba con 2 × 64 N = 128 N. Restando el peso (98 N), sobran 30 N hacia arriba.',
    },
    {
      id: 'p10',
      tag: 'Tensión',
      q: 'En una polea móvil en equilibrio cargando un bloque de 200 N, ¿cuánto vale la tensión en cada tramo de cuerda?',
      ok: '100 N en cada tramo',
      bad: ['200 N en cada tramo', '50 N en cada tramo', '400 N en cada tramo'],
      why: 'Como dos tramos verticales sostienen los 200 N en equilibrio, cada tramo soporta la mitad: 200 ÷ 2 = 100 N.',
    },
  ],
};
