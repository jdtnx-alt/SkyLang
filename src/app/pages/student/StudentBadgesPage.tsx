import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Award, Zap, Lock, CheckCircle2, Trophy, Sparkles, Shield
} from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { TopGamificationBar } from "../../components/student/TopGamificationBar";
import { PageTransition } from "../../components/PageTransition";
import { BeeMascot } from "../../components/BeeMascot";
import { soundEffects } from "../../utils/soundEffects";

// ── Configuración visual por tipo de medalla ──────────────────────────────
// Cada rareza tiene colores DISTINTOS entre sí para que nunca se confundan
// con las tarjetas bloqueadas (que son siempre bg-slate-50 / border-slate-200).
const TIPO_CONFIG: Record<string, {
  label: string;
  cardBg: string;     // gradiente de fondo de la tarjeta desbloqueada
  border: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  glowClass: string;
  emoji: string;      // Médala emoji principal
  accentText: string; // Color del título al desbloquear
}> = {
  bronze: {
    label: "Bronce",
    cardBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-400",
    iconBg: "bg-amber-100",
    pillBg: "bg-amber-100",
    pillText: "text-amber-800",
    glowClass: "shadow-amber-200",
    emoji: "🥉",
    accentText: "text-amber-900",
  },
  silver: {
    label: "Plata",
    cardBg: "bg-gradient-to-br from-sky-50 to-indigo-50",
    border: "border-sky-400",
    iconBg: "bg-sky-100",
    pillBg: "bg-sky-100",
    pillText: "text-sky-800",
    glowClass: "shadow-sky-200",
    emoji: "🥈",
    accentText: "text-sky-900",
  },
  gold: {
    label: "Oro",
    cardBg: "bg-gradient-to-br from-yellow-50 to-amber-50",
    border: "border-yellow-400",
    iconBg: "bg-yellow-100",
    pillBg: "bg-yellow-100",
    pillText: "text-yellow-800",
    glowClass: "shadow-yellow-200",
    emoji: "🥇",
    accentText: "text-yellow-900",
  },
  diamond: {
    label: "Diamante",
    cardBg: "bg-gradient-to-br from-violet-50 to-purple-50",
    border: "border-violet-400",
    iconBg: "bg-violet-100",
    pillBg: "bg-violet-100",
    pillText: "text-violet-800",
    glowClass: "shadow-violet-300",
    emoji: "💎",
    accentText: "text-violet-900",
  },
};


// ── Tarjeta de Insignia (rediseñada) ──────────────────────────────────
function InsigniaCard({ insignia }: { insignia: any }) {
  const cfg = TIPO_CONFIG[insignia.tipo] || TIPO_CONFIG.bronze;
  const desbloqueada = insignia.desbloqueada;
  const pct = insignia.progreso?.porcentaje || 0;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`relative flex flex-col rounded-3xl border-2 border-b-[6px] p-5 space-y-3 transition-all
        ${
          desbloqueada
            ? `${cfg.cardBg} ${cfg.border} shadow-lg ${cfg.glowClass}`
            : "bg-white border-slate-200 border-b-slate-300"
        }`}
      onClick={() => desbloqueada && soundEffects.playPop()}
    >
      <div className="relative z-10 flex items-start justify-between gap-2">
        {/* Médala + Emoji */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
            desbloqueada ? cfg.iconBg : "bg-slate-100"
          }`}
        >
          {desbloqueada ? (
            <span role="img" aria-label={cfg.label}>{cfg.emoji}</span>
          ) : (
            <Lock size={22} className="text-slate-400" />
          )}
        </div>

        {/* Pill de rareza */}
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${
            desbloqueada
              ? `${cfg.pillBg} ${cfg.pillText}`
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {desbloqueada ? cfg.label : "Bloqueado"}
        </span>
      </div>

      {/* Nombre y descripción */}
      <div className="relative z-10">
        <h3
          className={`font-black text-sm leading-tight ${
            desbloqueada ? cfg.accentText : "text-slate-500"
          }`}
        >
          {insignia.nombre}
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
          {insignia.descripcion}
        </p>
      </div>

      {/* Barra de progreso (bloqueada) */}
      {!desbloqueada && (
        <div className="relative z-10 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Progreso</span>
            <span className="text-[10px] font-black text-slate-600">
              {insignia.progreso?.actual ?? 0} / {insignia.progreso?.meta ?? 1}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Fecha de obtención (desbloqueada) */}
      {desbloqueada && insignia.fechaOtorgada && (
        <div className="relative z-10 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500">
            Obtenida el{" "}
            {new Date(insignia.fechaOtorgada).toLocaleDateString("es-ES", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
type FiltroTipo = "todas" | "desbloqueadas" | "en_progreso" | "diamond";

export function StudentBadgesPage() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>("todas");

  useEffect(() => {
    const almacenado = localStorage.getItem("user");
    const usuario = almacenado ? JSON.parse(almacenado) : null;
    const token = localStorage.getItem("token");
    if (!usuario?.id || !token) { navigate("/"); return; }

    fetch(`/api/student/badges?studentId=${usuario.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudieron cargar los logros.");
        return r.json();
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [navigate]);

  // Filtrado de insignias
  const insigniasFiltradas = (() => {
    if (!datos?.insignias) return [];
    switch (filtro) {
      case "desbloqueadas": return datos.insignias.filter((i: any) => i.desbloqueada);
      case "en_progreso":   return datos.insignias.filter((i: any) => !i.desbloqueada && (i.progreso?.porcentaje || 0) > 0);
      case "diamond":       return datos.insignias.filter((i: any) => i.tipo === "diamond");
      default:              return datos.insignias;
    }
  })();

  const nivel = datos?.resumen?.nivel || 1;
  const xp    = datos?.resumen?.puntosTotales || 0;
  const xpNivelActual = xp % 1000;
  const xpPct = Math.round((xpNivelActual / 1000) * 100);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />
        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar xp={xp} level={nivel} levelProgress={xpPct} />

          <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

            {/* Encabezado */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Award className="text-amber-500" size={30} />
                  Mis Logros e Insignias
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                  Colecciona medallas superando desafíos académicos en SkyLang
                </p>
              </div>
              <BeeMascot size="sm" mood="cheering" animate />
            </div>

            {cargando ? (
              <div className="p-16 text-center space-y-4">
                <BeeMascot size="lg" mood="thinking" animate message="Cargando tus logros..." />
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : error ? (
              <div className="max-w-xl p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-center space-y-3">
                <BeeMascot size="sm" mood="encouraging" message="No pudimos cargar tus logros." />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            ) : (
              <>
                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* Total desbloqueadas */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-amber-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Trophy size={20} className="text-amber-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Insignias</p>
                    <h3 className="text-3xl font-black text-slate-900">
                      {datos?.resumen?.desbloqueadas}
                      <span className="text-base text-slate-400 font-bold"> / {datos?.resumen?.totalInsignias}</span>
                    </h3>
                  </motion.div>

                  {/* Nivel */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-purple-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Shield size={20} className="text-purple-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Nivel</p>
                    <h3 className="text-3xl font-black text-slate-900">{nivel}</h3>
                    <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${xpPct}%` }} />
                    </div>
                  </motion.div>

                  {/* XP Total */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-sky-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                      <Zap size={20} className="text-sky-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Puntos de Miel</p>
                    <h3 className="text-3xl font-black text-slate-900">{xp.toLocaleString()}</h3>
                  </motion.div>

                  {/* Insignias diamante */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-violet-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Sparkles size={20} className="text-violet-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Diamantes</p>
                    <h3 className="text-3xl font-black text-slate-900">
                      {datos?.insignias?.filter((i: any) => i.tipo === "diamond" && i.desbloqueada).length || 0}
                      <span className="text-base text-slate-400 font-bold">
                        {" / "}
                        {datos?.insignias?.filter((i: any) => i.tipo === "diamond").length || 0}
                      </span>
                    </h3>
                  </motion.div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(["todas", "desbloqueadas", "en_progreso", "diamond"] as FiltroTipo[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFiltro(f); soundEffects.playPop(); }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border-2 border-b-4
                        ${filtro === f
                          ? "bg-slate-900 text-white border-slate-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        }`}
                    >
                      {f === "todas"         && "🏅 Todas"}
                      {f === "desbloqueadas" && "✅ Obtenidas"}
                      {f === "en_progreso"   && "⏳ En Progreso"}
                      {f === "diamond"       && "💎 Diamante"}
                    </button>
                  ))}
                </div>

                {/* Grid de Insignias */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={filtro}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  >
                    {insigniasFiltradas.map((insignia: any) => (
                      <InsigniaCard key={insignia.id} insignia={insignia} />
                    ))}
                    {insigniasFiltradas.length === 0 && (
                      <div className="col-span-full text-center py-16 space-y-4">
                        <BeeMascot size="md" mood="thinking" message="No hay insignias en esta categoría todavía." />
                        <p className="text-sm font-bold text-slate-400">¡Sigue aprendiendo para desbloquear logros!</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
