import { useState, useEffect } from "react";
import { EditorActividad, AvisoDeCalificacion } from "../../components/instructor/EditorActividad";
import { useParams, useNavigate } from "react-router";
import { Sidebar } from "../../components/Sidebar";
import { useLanguage } from "../../context/LanguageContext";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Mic,
  Video,
  Stethoscope,
  BookMarked,
  Flame,
  Award
} from "lucide-react";

interface Actividad {
  id: number;
  titulo: string;
  tipo: string;
  instrucciones: string;
  obligatoria: boolean;
  orden: number;
}

interface Momento {
  rap_momento_id: number;
  momento_id: number;
  nombre: string;
  codigo: string;
  orden: number;
  actividades: Actividad[];
  total_actividades: number;
}

interface RAP {
  id: number;
  titulo: string;
  orden: number;
  modulo_id: number;
  momentos: Momento[];
}

interface Modulo {
  id: number;
  titulo: string;
  orden: number;
  fase: string;
  raps: RAP[];
}

export function InstructorRapMomentos() {
  const { fichaId, rapId } = useParams();
  const navigate = useNavigate();
  const { tr } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [fichaInfo, setFichaInfo] = useState<any>(null);
  const [currentModulo, setCurrentModulo] = useState<Modulo | null>(null);
  const [currentRap, setCurrentRap] = useState<RAP | null>(null);
  const [activeMomentoIndex, setActiveMomentoIndex] = useState(0);

  // Modal para agregar actividad
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [actTipo, setActTipo] = useState("formulario");
  const [actTitulo, setActTitulo] = useState("");
  const [actInstrucciones, setActInstrucciones] = useState("");
  const [actObligatoria, setActObligatoria] = useState(true);
  const [actDatos, setActDatos] = useState<any>({});
  const [tiposActividad, setTiposActividad] = useState<any[]>([]);
  const [erroresActividad, setErroresActividad] = useState<string[]>([]);

  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [contTitulo, setContTitulo] = useState("");
  const [contTexto, setContTexto] = useState("");
  const [contVideo, setContVideo] = useState("");
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [errorContenido, setErrorContenido] = useState<string | null>(null);
  const [contArchivo, setContArchivo] = useState<any>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [politicaMomento, setPoliticaMomento] = useState<any>(null);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Modal para eliminar actividad
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  const fetchRapEstructura = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/instructor/ficha/${fichaId}/estructura`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFichaInfo(data.ficha);

        let targetRap: RAP | null = null;
        let targetMod: Modulo | null = null;

        if (Array.isArray(data.modulos)) {
          for (const mod of data.modulos) {
            const found = mod.raps.find((r: RAP) => r.id === parseInt(rapId || "0"));
            if (found) {
              targetRap = found;
              targetMod = mod;
              break;
            }
          }
        }

        setCurrentRap(targetRap);
        setCurrentModulo(targetMod);
      }
    } catch (err) {
      console.error("Error loading RAP structure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fichaId && rapId) fetchRapEstructura();
  }, [fichaId, rapId]);

  // Cada momento admite unos tipos distintos: preparación solo material,
  // absorción ejercicios de práctica, práctica cuestionarios y cierre la
  // actividad evaluativa. El catálogo lo decide el servidor.
  useEffect(() => {
    const orden = currentRap?.momentos?.[activeMomentoIndex]?.orden;
    if (!orden) return;
    const token = localStorage.getItem("token");
    fetch(`/api/instructor/tipos-actividad?momento=${orden}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((politica) => {
        setPoliticaMomento(politica);
        const tipos = politica?.tipos || [];
        setTiposActividad(tipos);
        if (tipos.length) setActTipo(tipos[0].tipo);
      })
      .catch(() => { setPoliticaMomento(null); setTiposActividad([]); });
  }, [currentRap, activeMomentoIndex]);

  const tipoElegido = tiposActividad.find((t: any) => t.tipo === actTipo);

  const activeMomento = currentRap?.momentos?.[activeMomentoIndex] || null;

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitulo.trim() || !activeMomento) return;

    try {
      setIsSavingActivity(true);
      setErroresActividad([]);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(
        `/api/instructor/ficha/${fichaId}/rap-momento/${activeMomento.rap_momento_id}/actividades`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            tipo: actTipo,
            titulo: actTitulo.trim(),
            instrucciones: actInstrucciones.trim(),
            obligatoria: actObligatoria,
            datos_json: actDatos
          })
        }
      );

      if (res.ok) {
        setShowAddActivityModal(false);
        setActTitulo("");
        setActInstrucciones("");
        setActDatos({});
        setErroresActividad([]);
        fetchRapEstructura();
      } else {
        // El servidor dice exactamente qué falta; se muestra en el formulario
        // en lugar de un alert genérico.
        const errData = await res.json().catch(() => ({}));
        setErroresActividad(
          errData.detalles?.length ? errData.detalles : [errData.error || "No se pudo crear la actividad."]
        );
      }
    } catch (err) {
      console.error("Error saving activity:", err);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleSubirArchivo = async (file: File) => {
    setSubiendoArchivo(true);
    setErrorContenido(null);
    try {
      const token = localStorage.getItem("token");
      const datos = new FormData();
      datos.append("archivo", file);
      const res = await fetch("/api/instructor/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: datos
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.error || "No se pudo subir el archivo.");
      setContArchivo(cuerpo);
    } catch (err: any) {
      setErrorContenido(err?.message || "No se pudo subir el archivo.");
      setContArchivo(null);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contTitulo.trim() || !activeMomento) return;

    try {
      setIsSavingContent(true);
      setErrorContenido(null);
      const token = localStorage.getItem("token");

      const res = await fetch(
        `/api/instructor/ficha/${fichaId}/rap-momento/${activeMomento.rap_momento_id}/contenidos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            titulo: contTitulo.trim(),
            cuerpo_texto: contTexto.trim() || null,
            recurso_id: contArchivo?.recurso_id || null,
            datos_json: contVideo.trim() ? { videoUrl: contVideo.trim() } : null
          })
        }
      );

      if (res.ok) {
        setShowAddContentModal(false);
        setContTitulo(""); setContTexto(""); setContVideo(""); setContArchivo(null);
        fetchRapEstructura();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorContenido(err.error || "No se pudo guardar el material.");
      }
    } catch (err) {
      setErrorContenido("No se pudo guardar el material. Revisa tu conexión.");
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleDeleteContent = async (contenidoId: number) => {
    if (!window.confirm(tr('¿Eliminar este material de estudio?', 'Delete this study material?'))) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/instructor/contenidos/${contenidoId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) fetchRapEstructura();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || tr("No se pudo eliminar el material.", "Could not delete the material."));
      }
    } catch {
      alert(tr("No se pudo eliminar el material. Revisa tu conexión.", "Could not delete the material. Check your connection."));
    }
  };

  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    try {
      setIsDeletingActivity(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/instructor/actividades/${activityToDelete}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        setActivityToDelete(null);
        fetchRapEstructura();
      } else {
        alert(tr("Error al eliminar la actividad.", "Error deleting activity."));
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const getActivityTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "grabacion_audio": return <Mic size={16} className="text-amber-500" />;
      case "grabacion_video": return <Video size={16} className="text-purple-500" />;
      case "caso_clinico": return <Stethoscope size={16} className="text-emerald-500" />;
      case "vocabulario": return <BookMarked size={16} className="text-indigo-500" />;
      case "warm_up": return <Flame size={16} className="text-orange-500" />;
      default: return <FileText size={16} className="text-[#4DA6FF]" />;
    }
  };

  const getMomentoTitle = (orden: number, nombre: string) => {
    switch (orden) {
      case 1: return tr("Momento 1: Preparación y Contextualización", "Moment 1: Preparation & Context");
      case 2: return tr("Momento 2: Absorción de Conocimientos", "Moment 2: Knowledge Absorption");
      case 3: return tr("Momento 3: Práctica y Aplicación", "Moment 3: Practice & Application");
      case 4: return tr("Momento 4: Evaluación y Cierre", "Moment 4: Assessment & Wrap-up");
      default: return `${tr("Momento", "Moment")} ${orden}: ${nombre}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role="instructor" />
        <div className="ml-64 flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#4DA6FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="instructor" />

      <div className="ml-64 flex-1 p-8">
        {/* Navigation Back */}
        <button
          onClick={() => navigate(`/instructor/ficha/${fichaId}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4DA6FF] mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> {tr(`Volver a la Ficha #${fichaInfo?.numero_ficha || fichaId}`, `Back to Ficha #${fichaInfo?.numero_ficha || fichaId}`)}
        </button>

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4DA6FF]/10 text-[#4DA6FF] flex items-center justify-center font-bold">
                <BookOpen size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-[#4DA6FF] uppercase tracking-wider">
                  {currentModulo?.titulo || tr("Módulo Académico", "Academic Module")}
                </span>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentRap?.titulo || tr("Resultado de Aprendizaje (RAP)", "Learning Outcome (RAP)")}
                </h1>
              </div>
            </div>

            <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-[#4DA6FF] rounded-full text-xs font-semibold">
              {tr("Ficha", "Ficha")} #{fichaInfo?.numero_ficha}
            </span>
          </div>

          {/* Momentos Tabs Header */}
          {currentRap && currentRap.momentos && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              {currentRap.momentos.map((mom, idx) => {
                const isActive = activeMomentoIndex === idx;
                const isEvaluated = mom.orden === 3 || mom.orden === 4;

                return (
                  <button
                    key={mom.rap_momento_id}
                    onClick={() => setActiveMomentoIndex(idx)}
                    className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between relative overflow-hidden ${
                      isActive
                        ? "bg-[#4DA6FF] text-white border-[#4DA6FF] shadow-md scale-[1.02]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tr("Momento", "Moment")} {mom.orden}
                        </span>

                        <span
                          className={`text-xs font-semibold ${
                            isActive ? "text-white/90" : "text-gray-400"
                          }`}
                        >
                          {mom.actividades.length} {tr("Actividades", "Activities")}
                        </span>
                      </div>

                      <h3 className="font-bold text-xs leading-snug">
                        {getMomentoTitle(mom.orden, mom.nombre)}
                      </h3>
                    </div>

                    {isEvaluated && (
                      <div
                        className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-[10px] font-medium ${
                          isActive
                            ? "border-white/20 text-white/90"
                            : "border-gray-100 text-amber-600"
                        }`}
                      >
                        <Award size={12} /> {tr("Afecta Nota del RAP", "Affects RAP Grade")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Area for Selected Momento Tab */}
        {activeMomento && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-md uppercase">
                      {tr("Momento", "Moment")} {activeMomento.orden}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900">
                      {getMomentoTitle(activeMomento.orden, activeMomento.nombre)}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500">
                    {activeMomento.orden === 1 && tr("Fase inicial de sensibilización y contextualización del tema.", "Initial topic awareness and contextualization phase.")}
                    {activeMomento.orden === 2 && tr("Fase de teoría, lecturas y absorción del inglés.", "English theory, readings, and knowledge absorption phase.")}
                    {activeMomento.orden === 3 && tr("Aplicación práctica de conceptos en inglés clínico (Afecta Nota RAP).", "Practical application of clinical English concepts (Affects RAP Grade).")}
                    {activeMomento.orden === 4 && tr("Evaluación final y fase de cierre de aprendizaje (Afecta Nota RAP).", "Final evaluation and learning wrap-up phase (Affects RAP Grade).")}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActTipo(tiposActividad[0]?.tipo || "quiz");
                    setActTitulo("");
                    setActInstrucciones("");
                    setActObligatoria(true);
                    setActDatos({});
                    setErroresActividad([]);
                    setShowAddActivityModal(true);
                  }}
                  disabled={politicaMomento && !politicaMomento.permiteActividades}
                  title={politicaMomento && !politicaMomento.permiteActividades ? politicaMomento.proposito : undefined}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs ${
                    politicaMomento && !politicaMomento.permiteActividades
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#4DA6FF] hover:bg-blue-600 text-white"
                  }`}
                >
                  <Plus size={16} /> {tr(`Crear actividad en el Momento ${activeMomento.orden}`, `Create activity in Moment ${activeMomento.orden}`)}
                </button>

                <button
                  onClick={() => {
                    setContTitulo(""); setContTexto(""); setContVideo(""); setContArchivo(null);
                    setErrorContenido(null);
                    setShowAddContentModal(true);
                  }}
                  className="px-4 py-2 border border-[#4DA6FF] text-[#4DA6FF] hover:bg-blue-50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Plus size={16} /> {tr("Subir material de estudio", "Upload study material")}
                </button>

                {politicaMomento && (
                  <p className="w-full text-[11px] text-gray-500 font-medium mt-1">
                    <span className="font-bold text-gray-700">{politicaMomento.momento}:</span>{" "}
                    {politicaMomento.proposito}
                  </p>
                )}
              </div>

              {/* Material de estudio subido a este momento */}
              {(activeMomento.contenidos?.length ?? 0) > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {tr(`Material de estudio (${activeMomento.contenidos.length})`, `Study material (${activeMomento.contenidos.length})`)}
                  </h4>
                  {activeMomento.contenidos.map((cont: any) => (
                    <div key={cont.id} className="bg-white rounded-xl border border-blue-100 p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#4DA6FF] flex items-center justify-center shrink-0">
                        <BookOpen size={18} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-bold text-sm text-gray-900">{cont.titulo}</p>
                        {cont.cuerpo_texto && (
                          <p className="text-xs text-gray-600 whitespace-pre-line">{cont.cuerpo_texto}</p>
                        )}
                        {cont.recurso_url && (
                          cont.recurso_mime?.startsWith('image/') ? (
                            <img src={cont.recurso_url} alt={cont.titulo}
                              className="mt-2 max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50" />
                          ) : (
                            <a href={cont.recurso_url} target="_blank" rel="noopener noreferrer"
                              className="inline-block mt-1 text-xs font-semibold text-[#4DA6FF] hover:underline">
                              {cont.recurso_nombre || tr('Ver archivo adjunto', 'View attached file')}
                            </a>
                          )
                        )}
                        {cont.datos_json?.videoUrl && (
                          <a href={cont.datos_json.videoUrl} target="_blank" rel="noopener noreferrer"
                            className="block text-xs font-semibold text-[#4DA6FF] hover:underline truncate">
                            ▶ {cont.datos_json.videoUrl}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteContent(cont.id)}
                        title={tr("Eliminar material", "Delete material")}
                        className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de Actividades en este Momento */}
              {activeMomento.actividades.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <BookOpen className="mx-auto text-gray-300 mb-3" size={36} />
                  <p className="text-sm font-semibold text-gray-600">
                    {politicaMomento && !politicaMomento.permiteActividades
                      ? tr('Este momento no lleva actividades', 'This moment does not have activities')
                      : tr('Sin actividades en este momento', 'No activities in this moment')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    {politicaMomento?.proposito || tr(`Añade actividades para la ficha #${fichaInfo?.numero_ficha}.`, `Add activities for ficha #${fichaInfo?.numero_ficha}.`)}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMomento.actividades.map((act) => (
                    <div
                      key={act.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getActivityTypeIcon(act.tipo)}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded uppercase">
                              {act.tipo}
                            </span>
                          </div>

                          <button
                            onClick={() => setActivityToDelete(act.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title={tr("Eliminar actividad", "Delete activity")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <h4 className="font-bold text-gray-900 text-sm">{act.titulo}</h4>

                        {act.instrucciones && (
                          <p className="text-xs text-gray-500 line-clamp-2">{act.instrucciones}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span>{tr("Orden", "Order")}: #{act.orden || 1}</span>
                        {act.obligatoria ? (
                          <span className="text-green-600 flex items-center gap-1 font-semibold">
                            <CheckCircle2 size={12} /> {tr("Obligatoria", "Mandatory")}
                          </span>
                        ) : (
                          <span className="text-gray-400">{tr("Opcional", "Optional")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Subir Material de Estudio */}
      {showAddContentModal && activeMomento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-3">
              <span className="text-[10px] font-bold text-[#4DA6FF] uppercase tracking-wider">
                {tr("Momento", "Moment")} {activeMomento.orden}: {getMomentoTitle(activeMomento.orden, activeMomento.nombre)}
              </span>
              <h3 className="text-lg font-bold text-gray-900">{tr("Nuevo material de estudio", "New study material")}</h3>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                {tr("El material se consulta: no se califica ni cuenta para el porcentaje del RAP.", "The material is for study: it is not graded and does not count toward the RAP percentage.")}
              </p>
            </div>

            <form onSubmit={handleSaveContent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{tr("Título *", "Title *")}</label>
                <input
                  type="text" required value={contTitulo}
                  placeholder={tr("p. ej. Vocabulario de signos vitales", "e.g. Vital signs vocabulary")}
                  onChange={(e) => setContTitulo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{tr("Texto", "Text")}</label>
                <textarea
                  rows={6} value={contTexto}
                  placeholder={tr("Explicación, apuntes, instrucciones de estudio…", "Explanation, notes, study instructions…")}
                  onChange={(e) => setContTexto(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Archivo (PDF, imagen o audio)", "File (PDF, image or audio)")}
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*,audio/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSubirArchivo(f); }}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#4DA6FF] file:text-white file:text-xs file:font-semibold"
                />
                {subiendoArchivo && <p className="text-[11px] text-gray-500 mt-1">{tr("Subiendo…", "Uploading…")}</p>}
                {contArchivo && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {tr("Adjuntado:", "Attached:")} {contArchivo.nombre} ({Math.round((contArchivo.tamano || 0) / 1024)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{tr("Enlace de vídeo", "Video link")}</label>
                <input
                  type="url" value={contVideo}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) => setContVideo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {tr("Pega el enlace normal de YouTube. El aprendiz lo verá como enlace y lo abrirá allí.", "Paste the regular YouTube link. The student will see it as a link and open it there.")}
                </p>
              </div>

              {errorContenido && (
                <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
                  {errorContenido}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowAddContentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                  {tr("Cancelar", "Cancel")}
                </button>
                <button type="submit" disabled={isSavingContent}
                  className="px-4 py-2 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-xs font-medium">
                  {isSavingContent ? tr("Guardando…", "Saving…") : tr("Guardar material", "Save material")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear Actividad en Momento */}
      {showAddActivityModal && activeMomento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-3">
              <span className="text-[10px] font-bold text-[#4DA6FF] uppercase tracking-wider">
                {tr("Momento", "Moment")} {activeMomento.orden}: {getMomentoTitle(activeMomento.orden, activeMomento.nombre)}
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                {tr(`Nueva Actividad para Ficha #${fichaInfo?.numero_ficha}`, `New Activity for Ficha #${fichaInfo?.numero_ficha}`)}
              </h3>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Tipo de Actividad", "Activity Type")}
                </label>
                <select
                  value={actTipo}
                  onChange={(e) => { setActTipo(e.target.value); setActDatos({}); setErroresActividad([]); }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#4DA6FF] outline-none"
                >
                  {tiposActividad.map((t: any) => (
                    <option key={t.tipo} value={t.tipo}>{t.etiqueta}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <AvisoDeCalificacion modo={tipoElegido?.modo} descripcion={tipoElegido?.descripcion} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Título de la Actividad *", "Activity Title *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tr("p. ej., Cuestionario de evaluación clínica", "e.g., Clinical Evaluation Quiz")}
                  value={actTitulo}
                  onChange={(e) => setActTitulo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#4DA6FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Instrucciones", "Instructions")}
                </label>
                <textarea
                  rows={3}
                  placeholder={tr("Instrucciones para el estudiante...", "Student instructions...")}
                  value={actInstrucciones}
                  onChange={(e) => setActInstrucciones(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#4DA6FF] outline-none"
                />
              </div>

              <div className="border-t pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {tr("Contenido de la actividad", "Activity Content")}
                </label>
                <EditorActividad tipo={actTipo} datos={actDatos} onChange={setActDatos} />
              </div>

              {erroresActividad.length > 0 && (
                <ul className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium space-y-1">
                  {erroresActividad.map((e, i) => <li key={i}>· {e}</li>)}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="obligatoria"
                  checked={actObligatoria}
                  onChange={(e) => setActObligatoria(e.target.checked)}
                  className="rounded text-[#4DA6FF]"
                />
                <label htmlFor="obligatoria" className="text-xs text-gray-700">
                  {tr("Actividad Obligatoria (Afecta Progreso del RAP)", "Mandatory Activity (Affects RAP Progress)")}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  {tr("Cancelar", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSavingActivity}
                  className="px-4 py-2 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-xs font-medium"
                >
                  {isSavingActivity ? tr("Guardando...", "Saving...") : tr("Crear Actividad", "Create Activity")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Estilizado de Confirmación de Eliminación */}
      {activityToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Trash2 size={26} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">{tr("¿Eliminar esta actividad?", "Delete this activity?")}</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {tr(
                  "Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos e historial asociados a esta actividad.",
                  "This action is permanent and cannot be undone. All data and history associated with this activity will be removed."
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {tr("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                disabled={isDeletingActivity}
                onClick={confirmDeleteActivity}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeletingActivity ? tr("Eliminando...", "Deleting...") : tr("Sí, eliminar", "Yes, delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
