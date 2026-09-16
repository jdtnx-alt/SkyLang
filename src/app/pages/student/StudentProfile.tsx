import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { User, Mail, IdCard, Phone, Save, Sparkles, CheckCircle2 } from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { TopGamificationBar } from "../../components/student/TopGamificationBar";
import { PageTransition } from "../../components/PageTransition";
import { BeeMascot } from "../../components/BeeMascot";
import { soundEffects } from "../../utils/soundEffects";

/** Datos de la cuenta del aprendiz. */
export function StudentProfile() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    const almacenado = localStorage.getItem("user");
    const usuario = almacenado ? JSON.parse(almacenado) : null;
    const token = localStorage.getItem("token");
    if (!usuario?.id || !token) { navigate("/"); return; }

    fetch(`/api/users/${usuario.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar tu perfil.");
        return r.json();
      })
      .then((d) => {
        setPerfil(d);
        setNombre(d.nombre || "");
        setCorreo(d.correo || "");
        setIdentificacion(d.identificacion || "");
        setTelefono(d.telefono || "");
      })
      .catch((e) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [navigate]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    soundEffects.playPop();

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${perfil.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: nombre, email: correo, idNumber: identificacion, phone: telefono })
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.error || "No se pudo guardar.");

      const almacenado = localStorage.getItem("user");
      if (almacenado) {
        const usuario = JSON.parse(almacenado);
        localStorage.setItem("user", JSON.stringify({ ...usuario, nombre, correo }));
      }

      // ── Evaluar insignia "Expediente Completo" ──────────────────────────
      try {
        const badgeRes = await fetch(
          `/api/student/badges/check-profile?studentId=${perfil.id}`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` } }
        );
        if (badgeRes.ok) {
          const badgeData = await badgeRes.json();
          if (badgeData.otorgada) {
            soundEffects.playCorrect();
            setMensaje({
              tipo: "ok",
              texto: "¡Datos actualizados! 🏅 ¡Desbloqueaste la insignia «Expediente Completo»!"
            });
            return; // el mensaje ya está puesto
          }
        }
      } catch (_) {
        // Si falla la evaluación de insignia no bloqueamos el flujo principal
      }
      // ────────────────────────────────────────────────────────────────────

      soundEffects.playCorrect();
      setMensaje({ tipo: "ok", texto: "¡Tus datos se actualizaron con éxito!" });
    } catch (err: any) {
      soundEffects.playIncorrect();
      setMensaje({ tipo: "error", texto: err?.message || "No se pudo guardar." });
    } finally {
      setGuardando(false);
    }
  };

  const campo = (etiqueta: string, icono: any, valor: string, cambiar: (v: string) => void, tipo = "text", requerido = false) => (
    <div className="space-y-1">
      <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
        {etiqueta}{requerido && " *"}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icono}</span>
        <input
          type={tipo}
          value={valor}
          required={requerido}
          onChange={(e) => cambiar(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />
        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar />
          <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Mi Perfil de Aprendiz</h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">Consulta y actualiza tus datos personales en SkyLang</p>
              </div>
              <BeeMascot size="sm" mood="happy" animate />
            </div>

            {cargando ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Cargando perfil...</p>
              </div>
            ) : perfil ? (
              <div className="space-y-6 max-w-xl">
                {/* Tarjetas de Información Institucional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-sky-50 border-2 border-sky-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">Ficha SENA</span>
                    <p className="text-sm font-black text-slate-900">{perfil.numero_ficha || "3142784"}</p>
                  </div>
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Programa de Formación</span>
                    <p className="text-sm font-black text-slate-900 truncate">{perfil.programa_nombre || "English for Nursing"}</p>
                  </div>
                </div>

                <form onSubmit={guardar} className="bg-white rounded-3xl border-2 border-slate-200 border-b-6 shadow-xs p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
                    <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 border-b-4 border-amber-600 flex items-center justify-center text-2xl font-black shadow-xs">
                      {(perfil.nombre || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{perfil.nombre}</h3>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                        {perfil.rol || "Aprendiz"}
                      </span>
                    </div>
                  </div>

                  {campo("Nombre completo", <User size={18} />, nombre, setNombre, "text", true)}
                  {campo("Correo electrónico", <Mail size={18} />, correo, setCorreo, "email", true)}
                  {campo("Número de identificación", <IdCard size={18} />, identificacion, setIdentificacion)}
                  {campo("Teléfono", <Phone size={18} />, telefono, setTelefono)}

                  {mensaje && (
                    <p className={`p-3.5 rounded-2xl text-xs font-bold ${
                      mensaje.tipo === "ok"
                        ? "bg-emerald-50 border-2 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-2 border-rose-200 text-rose-900"
                    }`}>
                      {mensaje.texto}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={guardando}
                    className="btn-duo-3d btn-duo-amber w-full py-3 text-xs flex items-center justify-center gap-2 mt-2"
                  >
                    <Save size={16} />
                    <span>{guardando ? "Guardando cambios…" : "Guardar Cambios"}</span>
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No pudimos cargar tu perfil.</p>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
