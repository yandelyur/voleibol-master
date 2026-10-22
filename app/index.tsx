import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Linking, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  Button,
  Card,
  Input,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@blinkdotnew/mobile-ui';

type SystemId = '4-2' | '5-1' | '6-2';
type RoleId = 'setter' | 'outside' | 'opposite' | 'middle' | 'libero' | 'attacker';
type PhaseId = 'start' | 'receive' | 'attack' | 'defense';
type TabId = 'court' | 'guide' | 'train' | 'saved';
type Player = { role: RoleId; label: string; slot: number; activeSetter: boolean };
type Point = { x: number; y: number };

const C = {
  bg: '#101713', panel: '#19231D', panel2: '#202D25', line: '#34483B',
  text: '#F4F4E9', muted: '#A6B5A8', green: '#B8F36B', orange: '#FF9A5A',
  court: '#274D3B', courtLine: '#DDE8D9',
};
const STORAGE_KEY = 'voleibol-master-local-v1';
const SYSTEMS: Record<SystemId, { name: string; setters: string; summary: string; good: string; tradeoff: string }> = {
  '4-2': { name: '4-2 · dos colocadores', setters: 'El colocador que está en primera línea organiza el juego. Los dos colocadores se ubican opuestos en el orden de rotación.', summary: 'Una estructura sencilla para aprender el orden, la recepción y la coordinación básica.', good: 'Siempre hay un colocador delantero cerca de la red y las responsabilidades son fáciles de recordar.', tradeoff: 'Normalmente ofrece dos atacantes delanteros; el bloqueo rival tiene menos opciones que leer.' },
  '5-1': { name: '5-1 · un colocador', setters: 'El mismo colocador dirige las seis rotaciones. Cuando está delante hay dos atacantes delanteros; cuando está atrás, suelen ser tres.', summary: 'Mantiene el ritmo y la relación entre un mismo colocador y sus atacantes.', good: 'Consistencia en la distribución y en los tiempos de ataque.', tradeoff: 'Exige un colocador completo; sus tres rotaciones delanteras reducen una opción de ataque en primera línea.' },
  '6-2': { name: '6-2 · dos colocadores desde zaga', setters: 'El colocador que está en segunda línea coloca; al pasar a primera línea, normalmente se convierte en atacante y el otro toma la colocación.', summary: 'Dos jugadores comparten la colocación para conservar tres atacantes delanteros.', good: 'Ofrece tres opciones de ataque en primera línea en las seis rotaciones habituales.', tradeoff: 'Requiere dos jugadores capaces de colocar y atacar, y coordinación para evitar confusiones.' },
};
const ROLE_INFO: Record<RoleId, { name: string; alias: string; main: string; before: string; during: string; after: string; skills: string; errors: string; whatIf: string; drill: string }> = {
  setter: { name: 'Colocador', alias: 'Armador · setter', main: 'Con el segundo toque, organiza una pelota atacable y decide a quién distribuir.', before: 'Lee la recepción y se desplaza hacia su zona de colocación, normalmente cerca de 2–3.', during: 'Se orienta al objetivo, llega equilibrado y comunica una opción clara a sus atacantes.', after: 'Cubre al atacante, prepara el bloqueo o se incorpora a defensa y transición.', skills: 'Desplazamiento temprano, control de manos, visión y comunicación.', errors: 'Esperar quieto a que llegue el pase o forzar una colocación rápida con recepción lejos de la red.', whatIf: 'Si la recepción se aleja, prioriza una pelota alta y segura hacia banda; avisa pronto y deja una cobertura amplia.', drill: 'Coloca 10 balones desde pases buenos y 10 desde pases desplazados; alterna zona 4 y zona 2.' },
  outside: { name: 'Atacante exterior', alias: 'Punta · auxiliar · outside hitter', main: 'Aporta recepción, ataque por banda y defensa de zaga.', before: 'Ajusta su lugar en recepción con el líbero y define quién toma cada balón compartido.', during: 'En ataque, coordina carrera, salto y brazo; si el pase es malo, busca una solución controlada.', after: 'Cubre el remate propio y vuelve a defender su zona.', skills: 'Recepción estable, golpeo variado y lectura de bloqueo.', errors: 'Cerrar demasiado la plataforma o saltar sin ajustar los últimos pasos a la colocación.', whatIf: 'Ante un balón alto y fuera de sistema, apunta a una zona libre o usa un golpeo controlado en lugar de forzar la línea.', drill: 'Recibe 12 saques a dos zonas y luego ataca 10 balones altos cambiando diagonal y paralelo.' },
  opposite: { name: 'Opuesto', alias: 'Right-side hitter · opuesto', main: 'Amenaza por zona 2 y puede atacar desde zaga; ayuda a cerrar el bloqueo frente a la punta rival.', before: 'Reconoce si debe recibir en la formación acordada y prepara su transición a zona 2.', during: 'Ataca desde el lado derecho y lee manos y espacios del bloqueo.', after: 'Cubre al atacante y se prepara para defender o contraatacar.', skills: 'Ataque de banda derecha, bloqueo lateral y lectura táctica.', errors: 'Llegar tarde al bloqueo de banda o atacar siempre con la misma dirección.', whatIf: 'Si el bloqueo cierra la diagonal, conserva el control y usa manos, paralelo o balón profundo según el espacio.', drill: 'Desplazamiento lateral de bloqueo y ataque desde zona 2 con tres objetivos de golpeo.' },
  middle: { name: 'Central', alias: 'Bloqueador central · middle', main: 'Lee al colocador contrario, participa en el bloqueo y ofrece ataques rápidos por el centro.', before: 'Observa la recepción rival y busca pistas del colocador y del central contrario.', during: 'Decide si seguir el primer tiempo o desplazarse a ayudar a la banda; en ataque llega con tiempo al pase rápido.', after: 'Aterriza equilibrado, cubre y vuelve al centro para la siguiente acción.', skills: 'Lectura, pasos laterales, salto equilibrado y coordinación con las bandas.', errors: 'Comprometerse demasiado pronto con una finta o cruzar los pies al desplazarse lateralmente.', whatIf: 'Si el colocador rival aún no controla la pelota, mantén lectura; no adivines una dirección sin información.', drill: 'Sombra de bloqueo: lee tres señales del colocador, desplázate y forma el bloqueo junto a una banda.' },
  libero: { name: 'Líbero', alias: 'Especialista defensivo · libero', main: 'Refuerza recepción y defensa en zaga; su sustitución es distinta de los cambios ordinarios.', before: 'Alinea responsabilidades con puntas y habla antes del saque.', during: 'Lee hombro y aproximación del atacante, defiende el espacio acordado y da un pase alto y controlado.', after: 'Comunica la trayectoria y se prepara para cubrir la transición.', skills: 'Lectura, plataforma estable, desplazamiento y comunicación.', errors: 'Callarse en balones compartidos o llegar tarde por partir demasiado erguido.', whatIf: 'Si dos reciben la misma zona, llama el balón temprano y usa una plataforma firme hacia el objetivo.', drill: 'Defiende 10 ataques desde posiciones conocidas y luego 10 con dirección aleatoria.', },
  attacker: { name: 'Atacante', alias: 'Rol general', main: 'Busca convertir una colocación en una acción ofensiva útil: punto, rebote favorable o continuidad.', before: 'Comunica tempo, dirección y disponibilidad al colocador.', during: 'Elige golpeo según altura, distancia y bloqueo; no todo balón exige máxima potencia.', after: 'Cubre el remate y se reincorpora al sistema defensivo.', skills: 'Aproximación, control de brazo, observación y variedad.', errors: 'Mirar solo el balón y decidir el golpeo antes de leer el bloqueo.', whatIf: 'Si la colocación no permite un ataque seguro, mantén la pelota en juego con una solución controlada.', drill: 'Alterna 5 ataques fuertes y 5 golpes controlados a zonas marcadas.' },
};
const POSITIONS: Record<number, { name: string; area: string }> = {
  1: { name: 'Posición 1', area: 'Zaguero derecho · zona de saque' },
  2: { name: 'Posición 2', area: 'Delantero derecho' },
  3: { name: 'Posición 3', area: 'Delantero centro' },
  4: { name: 'Posición 4', area: 'Delantero izquierdo' },
  5: { name: 'Posición 5', area: 'Zaguero izquierdo' },
  6: { name: 'Posición 6', area: 'Zaguero centro' },
};
const BASE: Record<SystemId, Array<{ role: RoleId; label: string }>> = {
  '4-2': [{ role: 'setter', label: 'C1' }, { role: 'attacker', label: 'A1' }, { role: 'attacker', label: 'A2' }, { role: 'setter', label: 'C2' }, { role: 'attacker', label: 'A3' }, { role: 'attacker', label: 'A4' }],
  '5-1': [{ role: 'setter', label: 'C' }, { role: 'outside', label: 'P1' }, { role: 'middle', label: 'Ce1' }, { role: 'opposite', label: 'O' }, { role: 'outside', label: 'P2' }, { role: 'middle', label: 'Ce2' }],
  '6-2': [{ role: 'setter', label: 'C1' }, { role: 'outside', label: 'P1' }, { role: 'middle', label: 'Ce1' }, { role: 'setter', label: 'C2' }, { role: 'outside', label: 'P2' }, { role: 'middle', label: 'Ce2' }],
};
const START_POINTS: Record<number, Point> = {
  1: { x: 296, y: 290 }, 2: { x: 296, y: 95 }, 3: { x: 180, y: 95 },
  4: { x: 64, y: 95 }, 5: { x: 64, y: 290 }, 6: { x: 180, y: 290 },
};
const PHASES: Array<{ id: PhaseId; label: string }> = [
  { id: 'start', label: 'Alineación' }, { id: 'receive', label: 'Recepción' },
  { id: 'attack', label: 'Ataque' }, { id: 'defense', label: 'Defensa' },
];
const QUIZ = [
  { q: '¿Cuándo puede desplazarse libremente el equipo receptor hacia sus posiciones tácticas?', options: ['Antes de que el saque sea golpeado', 'Después del golpe de saque', 'Solo después del tercer toque'], correct: 1, why: 'Al contacto del saque, el equipo receptor debe respetar el orden relativo de rotación. Después del golpe, puede ocupar cualquier posición en su campo y zona libre.' },
  { q: 'En el 5-1, ¿quién coloca durante las seis rotaciones?', options: ['El mismo colocador', 'El central delantero', 'El colocador que esté en zaga'], correct: 0, why: 'El sistema 5-1 usa un colocador principal durante las seis rotaciones, tanto delante como detrás.' },
  { q: '¿Qué está prohibido para el líbero según las reglas FIVB 2025–2028?', options: ['Recibir un saque', 'Completar un bloqueo o intentar bloquear', 'Defender un ataque'], correct: 1, why: 'El líbero no puede completar un ataque con el balón enteramente por encima de la red, ni bloquear o intentar bloquear. Las reglas de saque pueden variar en algunas competiciones.' },
];
const DRILLS = [
  { title: 'Plataforma a objetivo', kind: 'Recepción · inicial', time: '12 min', detail: 'En parejas, una persona lanza o sirve suave. La otra dirige el pase a una zona marcada cerca de 2–3. Cambiad cada 8 balones.', cue: 'Hombros al objetivo; piernas acompañan el pase.' },
  { title: 'Colocar y desplazarse', kind: 'Colocación · inicial', time: '10 min', detail: 'Un compañero envía balones a ambos lados. El colocador llega bajo la pelota, frena y coloca alto a zona 4 o 2.', cue: 'Primero llega equilibrado; después elige el pase.' },
  { title: 'Lectura de banda', kind: 'Bloqueo · intermedio', time: '15 min', detail: 'Central y banda parten separados. A una señal de dirección, se desplazan lateralmente y cierran el espacio sin saltar antes de tiempo.', cue: 'Mira la colocación; desplázate con pasos controlados.' },
  { title: 'Defensa y contraataque', kind: 'Transición · intermedio', time: '18 min', detail: 'Un entrenador envía un ataque controlado. El equipo defiende, busca el segundo toque y termina con un balón alto y seguro.', cue: 'Tras defender, levanta la mirada y pasa a transición.' },
];
const GLOSSARY = [
  ['Colocador', 'Armador · setter', 'Jugador que organiza el ataque con la colocación.'],
  ['Atacante exterior', 'Punta · auxiliar · outside hitter', 'Atacante de banda que suele colaborar en recepción.'],
  ['Opuesto', 'Right-side hitter · opposite', 'Atacante que habitualmente juega por la banda derecha.'],
  ['Central', 'Bloqueador central · middle blocker', 'Especialista en bloqueo y ataque rápido por el centro.'],
  ['Líbero', 'Libero', 'Especialista defensivo con sustituciones y restricciones propias.'],
  ['Primer tiempo', 'Quick / first-tempo attack', 'Ataque rápido coordinado con una colocación cercana al colocador.'],
  ['Cobertura', 'Attack cover', 'Posición de compañeros preparados para recuperar un balón bloqueado.'],
  ['Side-out', 'Recepción-ataque', 'Acción de recepción que busca ganar el rally y obtener el saque.'],
  ['Rally', 'Intercambio', 'Secuencia de juego desde el saque hasta que se detiene la pelota.'],
  ['Zaguero', 'Back-row player', 'Jugador que ocupa una de las posiciones 1, 6 o 5 en la rotación.'],
];

function getLineup(system: SystemId, rotation: number): Player[] {
  let list = BASE[system];
  for (let i = 1; i < rotation; i++) list = [list[1], list[2], list[3], list[4], list[5], list[0]];
  return list.map((p, i) => ({
    ...p, slot: i + 1,
    activeSetter: p.role === 'setter' && (system === '5-1' || (system === '4-2' ? i + 1 >= 2 && i + 1 <= 4 : i + 1 === 1 || i + 1 === 5 || i + 1 === 6)),
  }));
}
function getTacticalPoints(players: Player[], phase: PhaseId): Point[] {
  const points = players.map((p) => START_POINTS[p.slot]);
  if (phase === 'start') return points;
  if (phase === 'defense') return players.map((p) => p.slot >= 2 && p.slot <= 4
    ? { x: p.slot === 2 ? 296 : p.slot === 3 ? 180 : 64, y: 145 }
    : { x: p.slot === 1 ? 296 : p.slot === 6 ? 180 : 64, y: 290 });
  const setter = players.findIndex((p) => p.activeSetter);
  if (setter >= 0) points[setter] = { x: 268, y: 120 };
  if (phase === 'receive') {
    const candidates = players.map((p, i) => ({ p, i })).filter(({ p }) => !p.activeSetter && p.role !== 'middle').slice(0, 3);
    const receiveSpots = [{ x: 64, y: 255 }, { x: 180, y: 280 }, { x: 296, y: 255 }];
    candidates.forEach(({ i }, k) => { points[i] = receiveSpots[k]; });
    return points;
  }
  const attackers = players.map((p, i) => ({ p, i })).filter(({ p }) => p.slot >= 2 && p.slot <= 4 && !p.activeSetter);
  const attackSpots = [{ x: 64, y: 112 }, { x: 180, y: 112 }, { x: 296, y: 112 }];
  attackers.forEach(({ i }, k) => { points[i] = attackSpots[k]; });
  players.forEach((p, i) => { if (p.slot === 1 || p.slot === 5 || p.slot === 6) points[i] = { x: START_POINTS[p.slot].x, y: 265 }; });
  return points;
}
function CourtDiagram({ players, phase, selected, width }: { players: Player[]; phase: PhaseId; selected: number; width: number }) {
  const actual = getTacticalPoints(players, phase);
  return (
    <Svg width={width} height={width} viewBox="0 0 360 360">
      <Rect x="12" y="12" width="336" height="336" rx="18" fill={C.court} stroke={C.courtLine} strokeWidth="2" />
      <Line x1="12" y1="40" x2="348" y2="40" stroke={C.orange} strokeWidth="5" />
      <SvgText x="180" y="30" fill={C.text} fontSize="10" textAnchor="middle">RED</SvgText>
      <Line x1="12" y1="143" x2="348" y2="143" stroke={C.courtLine} strokeWidth="1.5" opacity="0.7" />
      <Line x1="124" y1="40" x2="124" y2="348" stroke={C.courtLine} strokeWidth="1" opacity="0.18" />
      <Line x1="236" y1="40" x2="236" y2="348" stroke={C.courtLine} strokeWidth="1" opacity="0.18" />
      <SvgText x="24" y="112" fill={C.courtLine} fontSize="11" opacity="0.75">DELANTEROS</SvgText>
      <SvgText x="24" y="337" fill={C.courtLine} fontSize="11" opacity="0.75">ZAGUEROS</SvgText>
      {phase !== 'start' && players.map((p, i) => {
        const from = START_POINTS[p.slot]; const to = actual[i];
        if (from.x === to.x && from.y === to.y) return null;
        const angle = Math.atan2(to.y - from.y, to.x - from.x); const size = 7;
        return <Path key={`move-${p.slot}`} d={`M ${from.x} ${from.y} L ${to.x} ${to.y} M ${to.x - size * Math.cos(angle - 0.55)} ${to.y - size * Math.sin(angle - 0.55)} L ${to.x} ${to.y} L ${to.x - size * Math.cos(angle + 0.55)} ${to.y - size * Math.sin(angle + 0.55)}`} stroke={C.green} strokeWidth="2" strokeDasharray="5 5" fill="none" opacity="0.78" />;
      })}
      {phase === 'receive' && <Path d="M 180 55 Q 210 84 268 120" stroke={C.orange} strokeWidth="3" fill="none" strokeDasharray="7 5" />}
      {phase === 'attack' && <Path d="M 180 245 Q 220 180 268 120 L 300 25" stroke={C.orange} strokeWidth="3" fill="none" strokeDasharray="7 5" />}
      {players.map((p, i) => {
        const pos = actual[i]; const active = selected === p.slot;
        return (
          <Fragment key={p.slot}>
            <Circle cx={pos.x} cy={pos.y} r={active ? 25 : 22} fill={p.activeSetter ? C.orange : '#E7EEE2'} stroke={active ? C.green : C.bg} strokeWidth={active ? 4 : 2} />
            <SvgText x={pos.x} y={pos.y + 4} fill={C.bg} fontWeight="700" fontSize="11" textAnchor="middle">{p.label}</SvgText>
            <SvgText x={pos.x} y={pos.y + 34} fill={C.text} fontSize="10" textAnchor="middle">P{p.slot}</SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}
function Tag({ children, active, onPress }: { children: string; active?: boolean; onPress?: () => void }) {
  return <Button onPress={onPress} backgroundColor={active ? C.green : C.panel2} color={active ? C.bg : C.text} borderColor={active ? C.green : C.line} borderWidth={1} borderRadius={20} height={42} paddingHorizontal="$3" pressStyle={{ opacity: 0.78, scale: 0.97 }}>{children}</Button>;
}
function App() {
  const { width: windowWidth } = useWindowDimensions();
  const courtWidth = Math.min(windowWidth - 48, 360);
  const [tab, setTab] = useState<TabId>('court');
  const [system, setSystem] = useState<SystemId>('5-1');
  const [rotation, setRotation] = useState(1);
  const [phase, setPhase] = useState<PhaseId>('start');
  const [playing, setPlaying] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [search, setSearch] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const players = useMemo(() => getLineup(system, rotation), [system, rotation]);
  const selectedPlayer = players.find((p) => p.slot === selectedSlot) ?? players[0];
  const currentQuestion = QUIZ[quizIndex];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const data = JSON.parse(raw) as { favorites?: string[]; note?: string; quizCorrect?: number; quizIndex?: number; quizAnswer?: number | null };
      setFavorites(data.favorites ?? []); setNote(data.note ?? ''); setSavedNote(data.note ?? '');
      setQuizCorrect(data.quizCorrect ?? 0); setQuizIndex(Math.min(data.quizIndex ?? 0, QUIZ.length - 1)); setQuizAnswer(data.quizAnswer ?? null);
    }).catch(() => setNotice('No se pudieron leer los datos guardados. El contenido sigue disponible.')).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const current = PHASES.findIndex((item) => item.id === phase);
      if (current >= PHASES.length - 1) {
        setPlaying(false);
        setPhase('start');
      } else {
        setPhase(PHASES[current + 1].id);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [playing, phase]);

  async function persist(next: { favorites?: string[]; note?: string; quizCorrect?: number; quizIndex?: number; quizAnswer?: number | null }) {
    try {
      const oldRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const oldData = oldRaw ? JSON.parse(oldRaw) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...oldData, ...next }));
      setNotice('Guardado en este dispositivo.');
    } catch { setNotice('No se pudo guardar. Vuelve a intentarlo.'); }
  }
  function toggleFavorite(key: string) {
    const next = favorites.includes(key) ? favorites.filter((item) => item !== key) : [...favorites, key];
    setFavorites(next); void persist({ favorites: next });
  }
  function advancePhase(amount: number) {
    const current = PHASES.findIndex((item) => item.id === phase);
    setPlaying(false);
    setPhase(PHASES[(current + amount + PHASES.length) % PHASES.length].id);
  }
  function openSource(url: string) {
    void Linking.openURL(url).catch(() => setNotice('No se pudo abrir el enlace. Puedes consultarlo cuando tengas conexión.'));
  }
  function favoriteTitle(key: string) {
    if (key.startsWith('system:')) return `Sistema ${key.split(':')[1]}`;
    if (key.startsWith('role:')) return ROLE_INFO[key.split(':')[1] as RoleId]?.name ?? key;
    return key;
  }
  function chooseAnswer(index: number) {
    if (quizAnswer !== null) return;
    setQuizAnswer(index);
    const nextCorrect = quizCorrect + (index === currentQuestion.correct ? 1 : 0);
    setQuizCorrect(nextCorrect);
    void persist({ quizCorrect: nextCorrect, quizIndex, quizAnswer: index });
  }
  function nextQuestion() {
    if (quizIndex === QUIZ.length - 1) { setQuizIndex(0); setQuizAnswer(null); void persist({ quizIndex: 0, quizAnswer: null }); return; }
    const next = quizIndex + 1; setQuizIndex(next); setQuizAnswer(null); void persist({ quizIndex: next, quizAnswer: null });
  }
  const filteredRoles = Object.entries(ROLE_INFO).filter(([, info]) => `${info.name} ${info.alias} ${info.main}`.toLowerCase().includes(search.toLowerCase()));
  const savedSystemKey = `system:${system}`;
  const nav: Array<{ id: TabId; label: string }> = [{ id: 'court', label: 'Cancha' }, { id: 'guide', label: 'Guía' }, { id: 'train', label: 'Entrena' }, { id: 'saved', label: 'Guardados' }];

  return (
    <YStack flex={1} backgroundColor={C.bg}>
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <YStack gap="$1">
            <SizableText color={C.green} size="$2" fontWeight="800" letterSpacing={1.4}>VOLEIBOL MASTER</SizableText>
            <SizableText color={C.text} size="$7" fontWeight="800">Aprende jugando</SizableText>
          </YStack>
          <YStack backgroundColor={C.panel2} paddingHorizontal="$3" paddingVertical="$2" borderRadius="$4" alignItems="center">
            <SizableText color={C.green} size="$4" fontWeight="800">{quizCorrect}</SizableText>
            <SizableText color={C.muted} size="$1">aciertos</SizableText>
          </YStack>
        </XStack>
        <XStack gap="$2" marginBottom="$4" flexWrap="wrap">
          {nav.map((item) => <Tag key={item.id} active={tab === item.id} onPress={() => setTab(item.id)}>{item.label}</Tag>)}
        </XStack>
        {!!notice && <SizableText color={C.muted} size="$2" marginBottom="$3">{notice}</SizableText>}

        {tab === 'court' && <YStack gap="$4">
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$6" padding="$4">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <YStack gap="$1"><SizableText color={C.text} size="$5" fontWeight="800">Tu cancha táctica</SizableText><SizableText color={C.muted} size="$2">Seis posiciones · tres sistemas</SizableText></YStack>
              <Button onPress={() => toggleFavorite(savedSystemKey)} backgroundColor={favorites.includes(savedSystemKey) ? C.green : C.panel2} color={favorites.includes(savedSystemKey) ? C.bg : C.text} borderRadius="$4" minWidth={82} height={48} accessibilityLabel="Guardar sistema">{favorites.includes(savedSystemKey) ? 'Guardado' : 'Guardar'}</Button>
            </XStack>
            <XStack gap="$2" flexWrap="wrap" marginBottom="$3">
              {(Object.keys(SYSTEMS) as SystemId[]).map((id) => <Tag key={id} active={system === id} onPress={() => { setSystem(id); setSelectedSlot(1); }}>{id}</Tag>)}
            </XStack>
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
              <SizableText color={C.muted} size="$3">Rotación</SizableText>
              <XStack alignItems="center" gap="$3">
                <Button onPress={() => setRotation((r) => r === 1 ? 6 : r - 1)} backgroundColor={C.panel2} color={C.text} borderRadius="$4" height={44} width={48} accessibilityLabel="Rotación anterior">‹</Button>
                <SizableText color={C.green} size="$5" fontWeight="800">{rotation} / 6</SizableText>
                <Button onPress={() => setRotation((r) => r === 6 ? 1 : r + 1)} backgroundColor={C.panel2} color={C.text} borderRadius="$4" height={44} width={48} accessibilityLabel="Rotación siguiente">›</Button>
              </XStack>
            </XStack>
            <XStack gap="$2" flexWrap="wrap" marginBottom="$2">
              {PHASES.map((item) => <Tag key={item.id} active={phase === item.id} onPress={() => { setPlaying(false); setPhase(item.id); }}>{item.label}</Tag>)}
            </XStack>
            <XStack gap="$2" marginBottom="$3">
              <Button onPress={() => advancePhase(-1)} backgroundColor={C.panel2} color={C.text} borderRadius="$4" minHeight={46} paddingHorizontal="$3">Anterior</Button>
              <Button onPress={() => setPlaying((value) => !value)} backgroundColor={C.green} color={C.bg} borderRadius="$4" minHeight={46} paddingHorizontal="$3">{playing ? 'Pausar secuencia' : 'Reproducir pasos'}</Button>
              <Button onPress={() => advancePhase(1)} backgroundColor={C.panel2} color={C.text} borderRadius="$4" minHeight={46} paddingHorizontal="$3">Siguiente</Button>
            </XStack>
            <SizableText color={C.muted} size="$2" marginBottom="$2">{phase === 'start' ? 'Alineación inicial: conserva el orden relativo hasta el golpe de saque.' : 'Vista táctica orientativa tras el golpe de saque; cada equipo ajusta sus responsabilidades.'}</SizableText>
            <YStack alignItems="center"><CourtDiagram players={players} phase={phase} selected={selectedSlot} width={courtWidth} /></YStack>
            <SizableText color={C.muted} size="$2" marginTop="$2">Selecciona una posición para consultar el rol que ocupa:</SizableText>
            <XStack gap="$2" flexWrap="wrap" marginTop="$2">
              {players.map((player) => <Tag key={player.slot} active={selectedSlot === player.slot} onPress={() => setSelectedSlot(player.slot)}>{`P${player.slot} · ${player.label}`}</Tag>)}
            </XStack>
            <XStack gap="$2" flexWrap="wrap" marginTop="$2">
              <SizableText color={C.orange} size="$2">● colocador activo</SizableText><SizableText color={C.muted} size="$2">Usa los selectores de posición para consultar cada jugador.</SizableText>
            </XStack>
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$6" padding="$4">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
              <SizableText color={C.text} size="$5" fontWeight="800">{POSITIONS[selectedSlot].name} · {selectedPlayer.label}</SizableText>
              <Button onPress={() => toggleFavorite(`role:${selectedPlayer.role}`)} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} paddingHorizontal="$3">{favorites.includes(`role:${selectedPlayer.role}`) ? 'Guardado' : 'Guardar rol'}</Button>
            </XStack>
            <SizableText color={C.green} size="$3" fontWeight="700">{POSITIONS[selectedSlot].area} · {ROLE_INFO[selectedPlayer.role].name}{selectedPlayer.activeSetter ? ' · coloca en esta rotación' : ''}</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$2">{phase === 'start' ? 'Antes del saque, respeta la relación de posición con tus compañeros.' : ROLE_INFO[selectedPlayer.role][phase === 'receive' ? 'before' : phase === 'attack' ? 'during' : 'after']}</SizableText>
            <SizableText color={C.muted} size="$2" marginTop="$2">El número de posición es el lugar de rotación; el rol es la especialidad del jugador. No son lo mismo.</SizableText>
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$6" padding="$4">
            <SizableText color={C.green} size="$2" fontWeight="800">SISTEMA {system}</SizableText>
            <SizableText color={C.text} size="$5" fontWeight="800" marginTop="$1">{SYSTEMS[system].name}</SizableText>
            <SizableText color={C.muted} size="$3" marginTop="$2">{SYSTEMS[system].summary}</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$3">{SYSTEMS[system].setters}</SizableText>
            <SizableText color={C.green} size="$2" marginTop="$3" fontWeight="700">Ventaja: {SYSTEMS[system].good}</SizableText>
            <SizableText color={C.orange} size="$2" marginTop="$2">A tener en cuenta: {SYSTEMS[system].tradeoff}</SizableText>
          </Card>
        </YStack>}

        {tab === 'guide' && <YStack gap="$4">
          <YStack gap="$1"><SizableText color={C.text} size="$6" fontWeight="800">Guía de juego</SizableText><SizableText color={C.muted} size="$3">Busca un rol o repasa reglas y conceptos clave.</SizableText></YStack>
          <Input value={search} onChangeText={setSearch} placeholder="Buscar líbero, central, colocador…" backgroundColor={C.panel} color={C.text} borderColor={C.line} borderRadius="$4" height={52} />
          <SizableText color={C.green} size="$3" fontWeight="800">SISTEMAS DE JUEGO</SizableText>
          {(Object.entries(SYSTEMS) as Array<[SystemId, typeof SYSTEMS[SystemId]]>).filter(([id, info]) => `${id} ${info.name} ${info.summary}`.toLowerCase().includes(search.toLowerCase())).map(([id, info]) => <Card key={id} backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4"><XStack justifyContent="space-between" alignItems="center"><SizableText color={C.text} size="$4" fontWeight="800">{info.name}</SizableText><Button onPress={() => toggleFavorite(`system:${id}`)} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} paddingHorizontal="$3">{favorites.includes(`system:${id}`) ? 'Guardado' : 'Guardar'}</Button></XStack><SizableText color={C.text} size="$3" marginTop="$2">{info.summary}</SizableText><SizableText color={C.muted} size="$2" marginTop="$2">Colocación: {info.setters}</SizableText><SizableText color={C.green} size="$2" marginTop="$2">Ventaja: {info.good}</SizableText><SizableText color={C.orange} size="$2" marginTop="$2">Limitación: {info.tradeoff}</SizableText><Button onPress={() => { setSystem(id); setRotation(1); setPhase('start'); setTab('court'); }} backgroundColor={C.panel2} color={C.text} borderRadius="$4" height={44} marginTop="$3">Ver sus rotaciones</Button></Card>)}
          <SizableText color={C.green} size="$3" fontWeight="800">ROLES EN LA CANCHA</SizableText>
          {filteredRoles.map(([id, info]) => <Card key={id} backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <XStack justifyContent="space-between" alignItems="center"><YStack><SizableText color={C.text} size="$4" fontWeight="800">{info.name}</SizableText><SizableText color={C.muted} size="$2">{info.alias}</SizableText></YStack><Button onPress={() => toggleFavorite(`role:${id}`)} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} paddingHorizontal="$3">{favorites.includes(`role:${id}`) ? 'Guardado' : 'Guardar'}</Button></XStack>
            <SizableText color={C.text} size="$3" marginTop="$3">{info.main}</SizableText>
            <SizableText color={C.muted} size="$2" marginTop="$2">Habilidades: {info.skills}</SizableText>
            <SizableText color={C.orange} size="$2" marginTop="$2">Error frecuente: {info.errors}</SizableText>
            <SizableText color={C.green} size="$2" marginTop="$2">¿Qué hago si…? {info.whatIf}</SizableText>
            <SizableText color={C.muted} size="$2" marginTop="$2">Ejercicio: {info.drill}</SizableText>
          </Card>)}
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Rotación y reglas</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$2">La rotación es el orden de los seis jugadores y el movimiento horario al recuperar el saque. 4-2, 5-1 y 6-2 son sistemas tácticos para organizar colocación y ataque; no son nombres de rotaciones.</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$2">En el momento del golpe de saque, el equipo receptor debe conservar el orden relativo: delanteros y zagueros, y el orden lateral de cada fila. Después del golpe, puede desplazarse a sus posiciones tácticas. El equipo que saca puede ocupar cualquier posición al golpe del saque según la regla FIVB actual.</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$2">Un zaguero no puede completar un ataque desde la zona delantera con el balón enteramente por encima del borde superior de la red. El líbero no puede bloquear ni intentar bloquear ni completar ese ataque; si hace un pase de dedos en su zona delantera, también limita el ataque posterior por encima de la red.</SizableText>
            <SizableText color={C.text} size="$3" marginTop="$2">El líbero puede reemplazar a un jugador zaguero; esos reemplazos no cuentan como sustituciones ordinarias y, bajo FIVB, debe haber un rally completado entre reemplazos. La zona y el procedimiento se rigen por la competición.</SizableText>
            <SizableText color={C.orange} size="$2" marginTop="$2">Las reglas de saque del líbero pueden variar por competición. Confirma el reglamento local antes de competir; esta guía sigue FIVB 2025–2028.</SizableText>
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Cuestionario · {quizIndex + 1} de {QUIZ.length}</SizableText>
            <SizableText color={C.muted} size="$2" marginTop="$1">Aciertos acumulados: {quizCorrect}</SizableText>
            <SizableText color={C.text} size="$4" fontWeight="700" marginTop="$3">{currentQuestion.q}</SizableText>
            <YStack gap="$2" marginTop="$3">{currentQuestion.options.map((option, index) => <Button key={option} onPress={() => chooseAnswer(index)} backgroundColor={quizAnswer === index ? (index === currentQuestion.correct ? '#355E3D' : '#643E36') : C.panel2} color={C.text} borderColor={C.line} borderWidth={1} borderRadius="$4" minHeight={48} justifyContent="flex-start" paddingHorizontal="$3" pressStyle={{ opacity: 0.78 }}>{option}</Button>)}</YStack>
            {quizAnswer !== null && <YStack gap="$3" marginTop="$3"><SizableText color={quizAnswer === currentQuestion.correct ? C.green : C.orange} size="$3">{quizAnswer === currentQuestion.correct ? 'Correcto. ' : 'Repasa esta idea. '}{currentQuestion.why}</SizableText><Button onPress={nextQuestion} backgroundColor={C.green} color={C.bg} borderRadius="$4" height={48}>{quizIndex === QUIZ.length - 1 ? 'Repetir cuestionario' : 'Siguiente pregunta'}</Button></YStack>}
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Diccionario rápido</SizableText>
            {GLOSSARY.filter((item) => `${item[0]} ${item[1]} ${item[2]}`.toLowerCase().includes(search.toLowerCase())).map((item) => <YStack key={item[0]} paddingVertical="$2" borderBottomWidth={1} borderColor={C.line}><SizableText color={C.green} size="$3" fontWeight="700">{item[0]} · {item[1]}</SizableText><SizableText color={C.muted} size="$2">{item[2]}</SizableText></YStack>)}
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Fuentes y alcance</SizableText>
            <SizableText color={C.muted} size="$2" marginTop="$2">Reglas oficiales: FIVB, Reglas de Voleibol 2025–2028, especialmente reglas 7.4–7.6, 13 y 19.</SizableText>
            <Button onPress={() => openSource('https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-SP-v02.pdf')} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} marginTop="$2">Abrir reglas FIVB 2025–2028 (español)</Button>
            <SizableText color={C.muted} size="$2" marginTop="$2">Formación técnica y táctica: Manual de Entrenadores FIVB, nivel II; y recursos de USA Volleyball sobre sistemas y estructuras ofensivas.</SizableText>
            <Button onPress={() => openSource('https://www.fivb.com/wp-content/uploads/2024/03/Coaches_Manual_Level_II_ES.pdf')} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} marginTop="$2">Abrir manual FIVB para entrenadores</Button>
            <Button onPress={() => openSource('https://usavolleyball.org/resource/why-should-i-run-a-6-3-or-6-6/')} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} marginTop="$2">USA Volleyball · sistemas de juego</Button>
            <SizableText color={C.muted} size="$2" marginTop="$2">Las recomendaciones de formación son orientativas, no reglas oficiales. La recepción, el bloqueo y las posiciones tácticas dependen del equipo y del entrenador.</SizableText>
          </Card>
        </YStack>}

        {tab === 'train' && <YStack gap="$4">
          <YStack gap="$1"><SizableText color={C.text} size="$6" fontWeight="800">Entrena con intención</SizableText><SizableText color={C.muted} size="$3">Ejercicios breves, progresivos y adaptables a tu equipo.</SizableText></YStack>
          {DRILLS.map((drill) => <Card key={drill.title} backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4"><XStack justifyContent="space-between" alignItems="center"><SizableText color={C.text} size="$4" fontWeight="800">{drill.title}</SizableText><SizableText color={C.green} size="$2">{drill.time}</SizableText></XStack><SizableText color={C.orange} size="$2" marginTop="$1">{drill.kind}</SizableText><SizableText color={C.text} size="$3" marginTop="$3">{drill.detail}</SizableText><SizableText color={C.muted} size="$2" marginTop="$2">Consigna: {drill.cue}</SizableText><Button onPress={() => toggleFavorite(`exercise:${drill.title}`)} backgroundColor={C.panel2} color={C.green} borderRadius="$4" height={44} marginTop="$3">{favorites.includes(`exercise:${drill.title}`) ? 'Guardado' : 'Guardar ejercicio'}</Button></Card>)}
          <Card backgroundColor={C.panel2} borderRadius="$5" padding="$4"><SizableText color={C.text} size="$3" fontWeight="700">Seguridad</SizableText><SizableText color={C.muted} size="$2" marginTop="$1">Calienta antes de saltar, adapta el volumen al nivel del grupo y detén el ejercicio si aparece dolor. Para una planificación individual, consulta a un entrenador cualificado.</SizableText></Card>
        </YStack>}

        {tab === 'saved' && <YStack gap="$4">
          <YStack gap="$1"><SizableText color={C.text} size="$6" fontWeight="800">Tu espacio</SizableText><SizableText color={C.muted} size="$3">Guardados, notas y avance se quedan en este dispositivo.</SizableText></YStack>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Favoritos · {favorites.length}</SizableText>
            {favorites.length === 0 ? <SizableText color={C.muted} size="$3" marginTop="$2">Aún no has guardado nada. Usa ☆ en un sistema, rol o ejercicio.</SizableText> : <YStack gap="$2" marginTop="$3">{favorites.map((key) => <XStack key={key} justifyContent="space-between" alignItems="center"><SizableText color={C.text} size="$3">{favoriteTitle(key.replace('exercise:', ''))}</SizableText><Button onPress={() => toggleFavorite(key)} backgroundColor={C.panel2} color={C.orange} borderRadius="$4" height={42}>Quitar</Button></XStack>)}</YStack>}
          </Card>
          <Card backgroundColor={C.panel} borderColor={C.line} borderWidth={1} borderRadius="$5" padding="$4">
            <SizableText color={C.text} size="$5" fontWeight="800">Mis notas</SizableText>
            <Input value={note} onChangeText={setNote} placeholder="Anota una consigna, una duda o un objetivo…" multiline numberOfLines={5} textAlignVertical="top" backgroundColor={C.panel2} color={C.text} borderColor={C.line} borderRadius="$4" minHeight={132} marginTop="$3" />
            <Button onPress={() => { setSavedNote(note); void persist({ note }); }} backgroundColor={C.green} color={C.bg} borderRadius="$4" height={48} marginTop="$3">Guardar nota</Button>
            {ready && !!savedNote && <SizableText color={C.muted} size="$2" marginTop="$2">Última nota guardada: {savedNote}</SizableText>}
          </Card>
          <Card backgroundColor={C.panel2} borderRadius="$5" padding="$4"><SizableText color={C.green} size="$4" fontWeight="800">{quizCorrect} respuestas correctas acumuladas</SizableText><SizableText color={C.muted} size="$2" marginTop="$1">El progreso básico también se conserva localmente.</SizableText></Card>
        </YStack>}
      </ScrollView>
      {!ready && <YStack position="absolute" bottom={8} left={0} right={0} alignItems="center"><SizableText color={C.muted} size="$1">Preparando tus datos guardados…</SizableText></YStack>}
    </YStack>
  );
}

export default App;
