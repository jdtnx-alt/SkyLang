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
  cardBg: string;
  border: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  glowClass: string;
  emoji: string;
  accentText: string;
}> = {
  bronze: {
    label: "Bronze",
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
    label: "Silver",
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
    label: "Gold",
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
    label: "Diamond",
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

// ── English Badge Translations Dictionary ────────────────────────────────
const BADGE_TRANSLATIONS: Record<string, { name: string; desc: string }> = {
  PRIMER_PASO: {
    name: "First Flight",
    desc: "Successfully passed your first interactive activity in SkyLang. The journey begins here!",
  },
  PERFIL_COMPLETO: {
    name: "Complete Record",
    desc: "Completed all fields of your profile: name, ID, and phone number. Now we know you well!",
  },
  PRIMER_MOMENTO: {
    name: "First Learning Moment",
    desc: "Completed all activities in a full learning moment (Preparation, Absorption, Practice, or Closure).",
  },
  MEMORY_MASTER: {
    name: "Medical Memory",
    desc: "Passed 3 hospital vocabulary matching games in clinical English.",
  },
  LISTENING_NURSE: {
    name: "Clinical Ear",
    desc: "Passed 3 listening comprehension quizzes of nurse-patient dialogues with a score ≥ 80%.",
  },
  VOCABULARIO_PRO: {
    name: "Hospital Glossary",
    desc: "Completed 5 nursing technical vocabulary activities (equipment, supplies, vital signs).",
  },
  NOTA_PERFECTA: {
    name: "Flawless Score",
    desc: "Achieved a perfect score of 100% on any evaluation or closing moment quiz.",
  },
  EMERGENCY_READY: {
    name: "Emergency Code",
    desc: "Passed all activities of RAP 6: Emergency Procedures & Critical Care.",
  },
  RACHA_3_DIAS: {
    name: "Study Spark",
    desc: "Maintained an active study streak for 3 consecutive days. The habit is taking shape!",
  },
  RACHA_7_DIAS: {
    name: "Shift Streak",
    desc: "Kept your streak active for 7 consecutive days. Nursing discipline!",
  },
  TIEMPO_ESTUDIO_2H: {
    name: "Extended Shift",
    desc: "Accumulated more than 2 hours (120 minutes) of active time completing activities on the platform.",
  },
  RAP_1_COMPLETO: {
    name: "Nursing Initiation",
    desc: "Completed RAP 1: Basic Nursing English at 100%. Fundamentals are rock solid!",
  },
  RAP_2_3_COMPLETO: {
    name: "Clinical Communication",
    desc: "Completed RAPs 2 and 3: Patient Interaction and Clinical Communication at 100%.",
  },
  RAP_4_5_COMPLETO: {
    name: "Documentation & Reports",
    desc: "Completed RAPs 4 and 5: Medical Documentation and Advanced Terminology at 100%.",
  },
  PROGRAMA_COMPLETO: {
    name: "SkyLang Bilingual Nurse",
    desc: "Completed all 6 RAPs of the Nursing Technical English program! You are a certified bilingual professional.",
  },
  XP_500: {
    name: "Honey Collector",
    desc: "Accumulated 500 Honey Points (XP). The hive is starting to fill up!",
  },
  XP_1500: {
    name: "Golden Honeycomb",
    desc: "Accumulated 1,500 Honey Points (XP). The queen bee is proud!",
  },
  XP_3000: {
    name: "Hive Master",
    desc: "Accumulated 3,000 Honey Points (XP). You are the guardian of the SkyLang hive!",
  },
};

const SPANISH_NAME_MAP: Record<string, { name: string; desc: string }> = {
  "primer vuelo": BADGE_TRANSLATIONS.PRIMER_PASO,
  "expediente completo": BADGE_TRANSLATIONS.PERFIL_COMPLETO,
  "primer momento": BADGE_TRANSLATIONS.PRIMER_MOMENTO,
  "memoria médica": BADGE_TRANSLATIONS.MEMORY_MASTER,
  "memoria medica": BADGE_TRANSLATIONS.MEMORY_MASTER,
  "oído clínico": BADGE_TRANSLATIONS.LISTENING_NURSE,
  "oido clinico": BADGE_TRANSLATIONS.LISTENING_NURSE,
  "glosario hospitalario": BADGE_TRANSLATIONS.VOCABULARIO_PRO,
  "puntería impecable": BADGE_TRANSLATIONS.NOTA_PERFECTA,
  "punteria impecable": BADGE_TRANSLATIONS.NOTA_PERFECTA,
  "código de emergencias": BADGE_TRANSLATIONS.EMERGENCY_READY,
  "codigo de emergencias": BADGE_TRANSLATIONS.EMERGENCY_READY,
  "chispa de estudio": BADGE_TRANSLATIONS.RACHA_3_DIAS,
  "racha de guardia": BADGE_TRANSLATIONS.RACHA_7_DIAS,
  "guardia extensa": BADGE_TRANSLATIONS.TIEMPO_ESTUDIO_2H,
  "iniciación de enfermería": BADGE_TRANSLATIONS.RAP_1_COMPLETO,
  "iniciacion de enfermeria": BADGE_TRANSLATIONS.RAP_1_COMPLETO,
  "comunicación asistencial": BADGE_TRANSLATIONS.RAP_2_3_COMPLETO,
  "comunicacion asistencial": BADGE_TRANSLATIONS.RAP_2_3_COMPLETO,
  "documentación y reportes": BADGE_TRANSLATIONS.RAP_4_5_COMPLETO,
  "documentacion y reportes": BADGE_TRANSLATIONS.RAP_4_5_COMPLETO,
  "enfermero bilingüe skylang": BADGE_TRANSLATIONS.PROGRAMA_COMPLETO,
  "enfermero bilingue skylang": BADGE_TRANSLATIONS.PROGRAMA_COMPLETO,
  "recolector de miel": BADGE_TRANSLATIONS.XP_500,
  "panal dorado": BADGE_TRANSLATIONS.XP_1500,
  "maestro de la colmena": BADGE_TRANSLATIONS.XP_3000,
};

// ── Badge Card ──────────────────────────────────
function InsigniaCard({ insignia }: { insignia: any }) {
  const cfg = TIPO_CONFIG[insignia.tipo] || TIPO_CONFIG.bronze;
  const desbloqueada = insignia.desbloqueada;
  const pct = insignia.progreso?.porcentaje || 0;

  const translation =
    BADGE_TRANSLATIONS[insignia.codigo_criterio] ||
    SPANISH_NAME_MAP[insignia.nombre?.toLowerCase()?.trim()];
  const badgeTitle = translation?.name || insignia.nombre;
  const badgeDescription = translation?.desc || insignia.descripcion;

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
        {/* Medal + Emoji */}
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

        {/* Rarity pill */}
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${
            desbloqueada
              ? `${cfg.pillBg} ${cfg.pillText}`
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {desbloqueada ? cfg.label : "Locked"}
        </span>
      </div>

      {/* Name and description */}
      <div className="relative z-10">
        <h3
          className={`font-black text-sm leading-tight ${
            desbloqueada ? cfg.accentText : "text-slate-500"
          }`}
        >
          {badgeTitle}
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-2">
          {badgeDescription}
        </p>
      </div>

      {/* Progress bar (locked) */}
      {!desbloqueada && (
        <div className="relative z-10 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Progress</span>
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

      {/* Earned date (unlocked) */}
      {desbloqueada && insignia.fechaOtorgada && (
        <div className="relative z-10 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500">
            Earned on{" "}
            {new Date(insignia.fechaOtorgada).toLocaleDateString("en-US", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
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
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Could not load achievements.");
        return r.json();
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [navigate]);

  // Filter badges
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

            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Award className="text-amber-500" size={30} />
                  My Achievements & Badges
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                  Collect medals by completing academic challenges in SkyLang
                </p>
              </div>
              <BeeMascot size="sm" mood="cheering" animate />
            </div>

            {cargando ? (
              <div className="p-16 text-center space-y-4">
                <BeeMascot size="lg" mood="thinking" animate message="Loading your achievements..." />
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : error ? (
              <div className="max-w-xl p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-center space-y-3">
                <BeeMascot size="sm" mood="encouraging" message="Could not load your achievements." />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* Total Unlocked */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-amber-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Trophy size={20} className="text-amber-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Badges</p>
                    <h3 className="text-3xl font-black text-slate-900">
                      {datos?.resumen?.desbloqueadas}
                      <span className="text-base text-slate-400 font-bold"> / {datos?.resumen?.totalInsignias}</span>
                    </h3>
                  </motion.div>

                  {/* Level */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-purple-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Shield size={20} className="text-purple-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Level</p>
                    <h3 className="text-3xl font-black text-slate-900">{nivel}</h3>
                    <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${xpPct}%` }} />
                    </div>
                  </motion.div>

                  {/* Total XP */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-sky-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                      <Zap size={20} className="text-sky-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Honey Points</p>
                    <h3 className="text-3xl font-black text-slate-900">{xp.toLocaleString()}</h3>
                  </motion.div>

                  {/* Diamond Badges */}
                  <motion.div whileHover={{ y: -2 }}
                    className="bg-white rounded-3xl border-2 border-b-[6px] border-violet-200 p-5 space-y-2 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Sparkles size={20} className="text-violet-600" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Diamonds</p>
                    <h3 className="text-3xl font-black text-slate-900">
                      {datos?.insignias?.filter((i: any) => i.tipo === "diamond" && i.desbloqueada).length || 0}
                      <span className="text-base text-slate-400 font-bold">
                        {" / "}
                        {datos?.insignias?.filter((i: any) => i.tipo === "diamond").length || 0}
                      </span>
                    </h3>
                  </motion.div>
                </div>

                {/* Filters */}
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
                      {f === "todas"         && "🏅 All"}
                      {f === "desbloqueadas" && "✅ Earned"}
                      {f === "en_progreso"   && "⏳ In Progress"}
                      {f === "diamond"       && "💎 Diamond"}
                    </button>
                  ))}
                </div>

                {/* Badges Grid */}
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
                        <BeeMascot size="md" mood="thinking" message="No badges in this category yet." />
                        <p className="text-sm font-bold text-slate-400">Keep learning to unlock achievements!</p>
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
