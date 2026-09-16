import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, BookOpen, Clock, Award, CheckCircle2, Lock, Unlock, Flame, Zap, Trophy, Star, Sparkles } from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { TopGamificationBar } from "../../components/student/TopGamificationBar";
import { PageTransition } from "../../components/PageTransition";
import { BeeMascot } from "../../components/BeeMascot";
import { motion } from "motion/react";
import { soundEffects } from "../../utils/soundEffects";

const ETIQUETA_ESTADO: Record<string, { texto: string; badge: string; border: string }> = {
  bloqueado:   { texto: "Bloqueado",   badge: "bg-slate-100 text-slate-500", border: "border-slate-200" },
  disponible:  { texto: "Disponible",  badge: "bg-sky-100 text-sky-700",   border: "border-sky-200" },
  en_progreso: { texto: "En progreso", badge: "bg-amber-100 text-amber-800", border: "border-amber-200" },
  completado:  { texto: "Completado",  badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200" },
  excelencia:  { texto: "Excelencia",  badge: "bg-purple-100 text-purple-800", border: "border-purple-200" }
};

const colorBarra = (estado: string) =>
  estado === "excelencia" ? "bg-purple-500"
  : estado === "completado" ? "bg-emerald-500"
  : estado === "en_progreso" ? "bg-amber-400"
  : "bg-slate-300";

function Tarjeta({ icono, fondo, etiqueta, valor, nota, border = "border-slate-200" }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white rounded-3xl border-2 border-b-6 ${border} shadow-xs p-6 space-y-3`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${fondo}`}>
        {icono}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{etiqueta}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-0.5">{valor}</h3>
        {nota && <p className="text-xs text-slate-500 font-semibold mt-1">{nota}</p>}
      </div>
    </motion.div>
  );
}

export function StudentProgress() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const almacenado = localStorage.getItem("user");
    const usuario = almacenado ? JSON.parse(almacenado) : null;
    const token = localStorage.getItem("token");
    if (!usuario?.id || !token) { navigate("/"); return; }

    fetch(`/api/student/progreso?studentId=${usuario.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudo cargar tu progreso.");
        return r.json();
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [navigate]);

  const contenido = () => {
    if (cargando) {
      return (
        <div className="p-16 text-center space-y-4">
          <BeeMascot size="lg" mood="thinking" animate message="Calculando tus estadísticas y logros..." />
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-xl p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-center space-y-3">
          <BeeMascot size="sm" mood="encouraging" message="No pudimos cargar tu progreso." />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      );
    }

    const { resumen, tiempoSemanal, evolucion, raps, actividadReciente } = datos;
    const hayTiempo = tiempoSemanal.some((d: any) => d.horas > 0);

    return (
      <div className="space-y-8">
        {/* Tarjetas de resumen (Duolingo Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Tarjeta
            icono={<TrendingUp className="text-sky-600" size={24} />} fondo="bg-sky-100"
            border="border-sky-200 border-b-sky-400"
            etiqueta="Avance general" valor={`${resumen.avanceGeneral}%`}
            nota="Promedio de todos tus RAP"
          />
          <Tarjeta
            icono={<BookOpen className="text-emerald-700" size={24} />} fondo="bg-emerald-100"
            border="border-emerald-200 border-b-emerald-400"
            etiqueta="Módulos completados" valor={`${resumen.modulosCompletados}/${resumen.modulosTotales}`}
            nota="Unidades de aprendizaje"
          />
          <Tarjeta
            icono={<Clock className="text-purple-700" size={24} />} fondo="bg-purple-100"
            border="border-purple-200 border-b-purple-400"
            etiqueta="Horas esta semana" valor={resumen.horasEstaSemana}
            nota="Tiempo en actividades"
          />
          <Tarjeta
            icono={<Trophy className="text-amber-700" size={24} />} fondo="bg-amber-100"
            border="border-amber-200 border-b-amber-400"
            etiqueta="Nota media"
            valor={resumen.notaMedia !== null ? `${resumen.notaMedia}%` : "—"}
            nota={resumen.notaMedia === null ? "Sin calificaciones aún" : "De tus mejores notas"}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-sky-600" /> Tiempo de estudio semanal
            </h2>
            {hayTiempo ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tiempoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="dia" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(v: any) => [`${v} h`, "Tiempo"]} />
                  <Bar dataKey="horas" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center px-6 space-y-2">
                <Clock className="text-slate-300" size={36} />
                <p className="text-sm font-extrabold text-slate-700">Sin tiempo registrado esta semana</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Se contabiliza automáticamente mientras resuelves tus actividades.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" /> Evolución de tu avance
            </h2>
            {evolucion.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolucion}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Avance"]} />
                  <Line type="monotone" dataKey="avance" stroke="#10B981" strokeWidth={3.5}
                    dot={{ r: 5, fill: "#10B981" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center px-6 space-y-2">
                <TrendingUp className="text-slate-300" size={36} />
                <p className="text-sm font-extrabold text-slate-700">
                  {evolucion.length === 1 ? "Llevas un mes de recorrido" : "Aún no hay recorrido histórico"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  La curva de crecimiento se mostrará a medida que apruebes lecciones en diferentes fechas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progreso por RAP */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 sm:p-8 shadow-xs space-y-5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Award size={20} className="text-amber-500" /> Desglose de RAPs del Programa
          </h2>
          <div className="space-y-4">
            {raps.map((rap: any) => {
              const etiqueta = ETIQUETA_ESTADO[rap.estado] || ETIQUETA_ESTADO.disponible;
              return (
                <div key={rap.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {rap.estado === "bloqueado" ? (
                        <Lock size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      )}
                      <span className="font-black text-sm text-slate-900 truncate">{rap.titulo}</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${etiqueta.badge}`}>
                        {etiqueta.texto}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-700 shrink-0">{rap.porcentaje}%</span>
                  </div>

                  {/* Glossy Progress Bar */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorBarra(rap.estado)}`}
                      style={{ width: `${rap.porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {raps.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Tu ficha todavía no tiene RAP publicados.</p>
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-sky-500" /> Registro de Actividad Reciente
          </h2>
          <div className="space-y-2.5">
            {actividadReciente.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  {a.tipo === "rap_desbloqueado" ? (
                    <Unlock size={18} className="text-sky-500 shrink-0" />
                  ) : a.tipo === "aprobada" || a.tipo === "rap_completado" ? (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Clock size={18} className="text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-slate-800 truncate">{a.texto}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(a.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {a.nota !== null && (
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${a.nota >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {a.nota}%
                  </span>
                )}
              </div>
            ))}
            {actividadReciente.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Todavía no has realizado ninguna actividad.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />
        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar />
          <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Mi Progreso y Estadísticas</h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">Sigue tu avance, constancia y logros académicos en SkyLang</p>
              </div>
              <BeeMascot size="sm" mood="cheering" animate />
            </div>
            {contenido()}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
