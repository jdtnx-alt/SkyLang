import React, { useCallback, useEffect, useState } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  BookOpen, 
  Headphones, 
  Target, 
  Trophy, 
  ChevronLeft, 
  Award, 
  Star, 
  Sparkles, 
  Play, 
  Check, 
  Compass,
  ArrowRight,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Momento3ActivityRunner } from './Momento3ActivityRunner';
import { ContenidoDeEstudio } from './ContenidoDeEstudio';
import { BeeMascot } from '../BeeMascot';
import { soundEffects } from '../../utils/soundEffects';

interface RapResumen {
  id: number;
  titulo: string;
  orden: number;
  progreso: number | string;
  estado: 'bloqueado' | 'disponible' | 'en_progreso' | 'completado' | 'excelencia';
  actividadesTotal: number;
  actividadesCompletadas: number;
}

interface Props {
  moduleId: string | number;
  studentId: string | number;
}

const iconoMomento = (orden: number) => {
  switch (orden) {
    case 1: return <BookOpen size={20} />;
    case 2: return <Headphones size={20} />;
    case 3: return <Target size={20} />;
    default: return <Trophy size={20} />;
  }
};

const MOMENTO_NOMBRES: Record<number, string> = {
  1: 'Momento 1: Comprensión y Teoría',
  2: 'Momento 2: Escucha y Práctica',
  3: 'Momento 3: Ejercicios Interactivos',
  4: 'Momento 4: Consolidación y Logro'
};

export const StudentRapPath: React.FC<Props> = ({ moduleId, studentId }) => {
  const [modulo, setModulo] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rapSeleccionado, setRapSeleccionado] = useState<RapResumen | null>(null);
  const [actividades, setActividades] = useState<any[]>([]);
  const [contenidos, setContenidos] = useState<any[]>([]);
  const [momentoAbierto, setMomentoAbierto] = useState<number | null>(null);
  const [errorRap, setErrorRap] = useState<string | null>(null);
  const [modalRapNode, setModalRapNode] = useState<RapResumen | null>(null);

  const cabeceras = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const cargarModulo = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/student/modules?studentId=${studentId}`, { headers: cabeceras() });
      if (!res.ok) throw new Error('No se pudo cargar tu ruta de aprendizaje.');
      const modulos = await res.json();
      const encontrado = Array.isArray(modulos)
        ? modulos.find((m: any) => String(m.id) === String(moduleId))
        : null;
      if (!encontrado) throw new Error('Este módulo no está disponible para tu ficha.');
      setModulo(encontrado);
      return encontrado;
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar tu ruta de aprendizaje.');
    } finally {
      setCargando(false);
    }
  }, [moduleId, studentId, cabeceras]);

  useEffect(() => { cargarModulo(); }, [cargarModulo]);

  const abrirRap = async (rap: RapResumen) => {
    setErrorRap(null);
    setMomentoAbierto(null);
    setRapSeleccionado(rap);
    setModalRapNode(null);
    soundEffects.playPop();

    try {
      const res = await fetch(`/api/student/rap/${rap.id}/actividades`, { headers: cabeceras() });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.error || 'No se pudieron cargar las actividades.');
      setActividades(cuerpo.actividades || []);
      setContenidos(cuerpo.contenidos || []);
    } catch (e: any) {
      setActividades([]);
      setContenidos([]);
      setErrorRap(e?.message || 'No se pudieron cargar las actividades.');
    }
  };

  const recargar = async () => {
    const actualizado = await cargarModulo();
    if (!rapSeleccionado) return;

    const fresco = (actualizado?.raps || []).find((r: any) => r.id === rapSeleccionado.id);
    if (fresco) setRapSeleccionado(fresco);

    const res = await fetch(`/api/student/rap/${rapSeleccionado.id}/actividades`, { headers: cabeceras() });
    if (res.ok) {
      const cuerpo = await res.json();
      setActividades(cuerpo.actividades || []);
      setContenidos(cuerpo.contenidos || []);
    }
  };

  if (cargando) {
    return (
      <div className="p-16 text-center space-y-4">
        <BeeMascot size="lg" mood="thinking" animate message="Preparando tu ruta de aprendizaje..." />
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-center space-y-4 shadow-sm">
        <BeeMascot size="md" mood="encouraging" animate message="¡Ups! Hubo un problema al conectar con tu ruta." />
        <p className="text-xs font-bold text-rose-700">{error}</p>
        <button
          onClick={() => { setCargando(true); cargarModulo(); }}
          className="btn-duo-3d btn-duo-rose px-6 py-2.5 text-xs"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const raps: RapResumen[] = (modulo?.raps || []).slice().sort((a: any, b: any) => a.orden - b.orden);
  const activeRapIndex = raps.findIndex((r) => r.estado === 'en_progreso' || r.estado === 'disponible');

  // ── Vista de un RAP concreto: sus cuatro momentos ────────────────────
  if (rapSeleccionado) {
    const porMomento = new Map<number, { nombre: string; actividades: any[]; contenidos: any[] }>();
    const asegurar = (orden: number, nombre: string) => {
      if (!porMomento.has(orden)) porMomento.set(orden, { nombre: nombre || MOMENTO_NOMBRES[orden] || `Momento ${orden}`, actividades: [], contenidos: [] });
      return porMomento.get(orden)!;
    };
    contenidos.forEach((c: any) => asegurar(Number(c.momento_orden), c.momento_nombre).contenidos.push(c));
    actividades.forEach((a: any) => asegurar(Number(a.momento_orden), a.momento_nombre).actividades.push(a));
    const momentos = Array.from(porMomento.entries()).sort((a, b) => a[0] - b[0]);
    const abierto = momentoAbierto !== null ? porMomento.get(momentoAbierto) : null;

    return (
      <div className="space-y-6 max-w-3xl mx-auto py-2">
        <button
          onClick={() => { 
            soundEffects.playPop();
            setRapSeleccionado(null); 
            setMomentoAbierto(null); 
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-white border-2 border-slate-200 border-b-4 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <ChevronLeft size={16} /> Volver a la Ruta
        </button>

        {/* Header Unit Banner */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider">
                RAP {rapSeleccionado.orden}
              </span>
              <span className="text-xs font-bold text-sky-100">
                {rapSeleccionado.actividadesCompletadas} de {rapSeleccionado.actividadesTotal} actividades aprobadas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">{rapSeleccionado.titulo}</h2>

            {/* Glossy Progress Bar */}
            <div className="w-full bg-black/20 h-4 rounded-full p-0.5 overflow-hidden border border-white/20 mt-2">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-700 shadow-inner"
                style={{ width: `${Math.min(100, Number(rapSeleccionado.progreso) || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {errorRap && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 flex items-center gap-3">
            <BeeMascot size="sm" mood="thinking" />
            <div>
              <p className="font-extrabold text-sm">No puedes acceder a este contenido todavía</p>
              <p className="text-xs font-medium text-amber-700">{errorRap}</p>
            </div>
          </div>
        )}

        {/* Moments List (Duolingo Style) */}
        {!abierto && (
          <div className="space-y-4">
            {momentos.map(([orden, datos]) => {
              const aprobadas = datos.actividades.filter((a: any) => a.aprobada).length;
              const completo = datos.actividades.length > 0 && aprobadas === datos.actividades.length;
              const tieneActividades = datos.actividades.length > 0;

              return (
                <motion.div
                  key={orden}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    soundEffects.playPop();
                    setMomentoAbierto(orden);
                  }}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    completo
                      ? 'bg-emerald-50/70 border-emerald-300 border-b-4 hover:bg-emerald-50'
                      : 'bg-white border-slate-200 border-b-4 hover:border-sky-300 hover:bg-sky-50/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                        completo
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-amber-400 text-slate-950 border-b-4 border-amber-600'
                      }`}
                    >
                      {completo ? <Check size={28} /> : iconoMomento(orden)}
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Momento {orden}
                      </span>
                      <h3 className="font-black text-base text-slate-900">{datos.nombre}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {tieneActividades
                          ? `${aprobadas}/${datos.actividades.length} actividades completadas`
                          : `${datos.contenidos.length} materiales de estudio`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className={`btn-duo-3d px-4 py-2.5 text-xs ${completo ? 'btn-duo-emerald' : 'btn-duo-sky'}`}>
                      {completo ? 'Repasar' : 'Iniciar'}
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {momentos.length === 0 && !errorRap && (
              <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3">
                <BeeMascot size="md" mood="thinking" message="Tu instructor pronto publicará las actividades de este RAP." />
              </div>
            )}
          </div>
        )}

        {/* Momento Open: Contenido o Runner */}
        {abierto && (
          <div className="space-y-6">
            <button
              onClick={() => {
                soundEffects.playPop();
                setMomentoAbierto(null);
              }}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-white border-2 border-slate-200 border-b-4 px-4 py-2 rounded-xl"
            >
              <ChevronLeft size={16} /> Volver a los Momentos del RAP
            </button>

            {abierto.contenidos.map((c: any) => (
              <ContenidoDeEstudio key={c.id} contenido={c} />
            ))}

            {abierto.actividades.length > 0 ? (
              <Momento3ActivityRunner
                activities={abierto.actividades}
                rapId={rapSeleccionado.id}
                onResultado={recargar}
                onCompleteAll={() => {
                  soundEffects.playCelebration();
                  recargar();
                  setMomentoAbierto(null);
                }}
              />
            ) : (
              <div className="p-6 bg-sky-50 border-2 border-sky-200 rounded-3xl text-center space-y-3">
                <BeeMascot size="sm" mood="happy" message="¡Excelente! Este momento es de lectura y estudio reflexivo." />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Vista General: La Ruta Serpenteante (Duolingo Stepping Stones Map) ──
  return (
    <div className="space-y-8 max-w-2xl mx-auto py-2 select-none">
      {/* 🚀 Unit Header Banner */}
      <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden border-b-4 border-sky-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider">
              {modulo?.fase || 'Fase de Formación'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2 leading-tight">
              {modulo?.title || 'Módulo de Inglés'}
            </h2>
            <p className="text-xs text-sky-100 font-semibold mt-1">
              {raps.filter((r) => r.estado === 'completado' || r.estado === 'excelencia').length} de {raps.length} RAPs dominados
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-200 block">Progreso</span>
            <span className="text-2xl font-black text-amber-300">
              {Math.round(Number(modulo?.progress) || 0)}%
            </span>
          </div>
        </div>
      </div>

      {/* 🗺️ SERPENTINE STEPPING STONES PATH */}
      <div className="py-6 flex flex-col items-center relative space-y-12">
        {raps.map((rap, index) => {
          const isCompleted = rap.estado === 'completado' || rap.estado === 'excelencia';
          const isLocked = rap.estado === 'bloqueado';
          const isCurrent = index === activeRapIndex || (!isCompleted && !isLocked);

          // Alternating horizontal offsets like Duolingo road (0, -45px, 45px, -45px...)
          const offset = index % 3 === 0 ? 0 : index % 3 === 1 ? -48 : 48;

          return (
            <div
              key={rap.id}
              className="relative flex flex-col items-center"
              style={{ transform: `translateX(${offset}px)` }}
            >
              {/* Floating Mascot on Current Active Node */}
              {isCurrent && (
                <div className="absolute -top-24 z-20 pointer-events-none">
                  <BeeMascot
                    size="sm"
                    mood="cheering"
                    animate
                    message="¡Es tu turno! Toca aquí para avanzar."
                    messagePosition="top"
                  />
                </div>
              )}

              {/* Node Button */}
              <motion.button
                whileHover={!isLocked ? { scale: 1.1 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (isLocked) {
                    soundEffects.playIncorrect();
                  } else {
                    soundEffects.playPop();
                    setModalRapNode(rap);
                  }
                }}
                className={`w-20 h-20 rounded-full flex items-center justify-center font-black relative transition-all duration-200 shadow-md ${
                  isCompleted
                    ? 'bg-emerald-500 text-white border-b-[6px] border-emerald-700 hover:bg-emerald-400'
                    : isLocked
                    ? 'bg-slate-200 text-slate-400 border-b-[6px] border-slate-300 cursor-not-allowed'
                    : 'bg-amber-400 text-slate-900 border-b-[6px] border-amber-600 animate-glow-pulse hover:bg-amber-300'
                }`}
              >
                {isCompleted ? (
                  <Check size={32} strokeWidth={3.5} />
                ) : isLocked ? (
                  <Lock size={26} />
                ) : (
                  <Star size={32} className="fill-slate-900" />
                )}

                {/* Level badge pill below node */}
                <div className="absolute -bottom-3 bg-white px-2.5 py-0.5 rounded-full border-2 border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-xs">
                  RAP {rap.orden}
                </div>
              </motion.button>

              {/* Title label below node */}
              <div className="mt-4 text-center max-w-[200px]">
                <p className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-tight">
                  {rap.titulo}
                </p>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  {isCompleted
                    ? '100% Completado'
                    : isLocked
                    ? 'Bloqueado'
                    : `${Math.round(Number(rap.progreso) || 0)}% en progreso`}
                </span>
              </div>
            </div>
          );
        })}

        {raps.length === 0 && (
          <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <BeeMascot size="md" mood="thinking" message="No hay RAPs registrados para este módulo." />
          </div>
        )}
      </div>

      {/* 🌟 DUOLINGO-STYLE MODAL POPOVER FOR CLICKED NODE */}
      <AnimatePresence>
        {modalRapNode && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl border-2 border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-5 text-center relative"
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner border-2 border-amber-200">
                <Star size={32} className="fill-amber-500 text-amber-500" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-sky-600">
                  RAP {modalRapNode.orden}
                </span>
                <h3 className="text-lg font-black text-slate-900">{modalRapNode.titulo}</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {modalRapNode.actividadesCompletadas} de {modalRapNode.actividadesTotal} actividades obligatorias aprobadas
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => abrirRap(modalRapNode)}
                  className="btn-duo-3d btn-duo-amber w-full py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  <Play size={18} className="fill-white" />
                  <span>{modalRapNode.estado === 'completado' ? 'Repasar RAP' : 'Comenzar Lección'}</span>
                </button>
                <button
                  onClick={() => setModalRapNode(null)}
                  className="btn-duo-3d btn-duo-white w-full py-2.5 text-xs text-slate-500"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
