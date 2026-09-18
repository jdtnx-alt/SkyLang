import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Sidebar } from "../../components/Sidebar";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Search,
  Layers,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

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

interface Student {
  id: number;
  nombre: string;
  email: string;
  estado: string;
  numeroFicha: string;
  programaTitulo: string;
  avance?: number;
}

export function InstructorFichaDetail() {
  const { tr, trPhase, trModule, trProgram } = useLanguage();
  const { fichaId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"estructura" | "estudiantes">("estructura");
  const [loading, setLoading] = useState(true);
  const [fichaInfo, setFichaInfo] = useState<any>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  // Modal para agregar actividad
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [targetRapMomentoId, setTargetRapMomentoId] = useState<number | null>(null);
  const [actTipo, setActTipo] = useState("formulario");
  const [actTitulo, setActTitulo] = useState("");
  const [actInstrucciones, setActInstrucciones] = useState("");
  const [actObligatoria, setActObligatoria] = useState(true);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Modal de confirmación para eliminar actividad
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  const fetchEstructura = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [estRes, studRes] = await Promise.all([
        fetch(`/api/instructor/ficha/${fichaId}/estructura`, { headers }),
        fetch(`/api/instructor/students?ficha=${fichaId}`, { headers })
      ]);

      if (estRes.ok) {
        const data = await estRes.json();
        setFichaInfo(data.ficha);
        setModulos(data.modulos || []);
      }
      if (studRes.ok) {
        const sData = await studRes.json();
        if (Array.isArray(sData)) setStudents(sData);
      }
    } catch (err) {
      console.error("Error loading ficha:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fichaId) fetchEstructura();
  }, [fichaId]);

  const handleOpenAddActivity = (rapMomentoId: number) => {
    setTargetRapMomentoId(rapMomentoId);
    setActTipo("formulario");
    setActTitulo("");
    setActInstrucciones("");
    setActObligatoria(true);
    setShowAddActivityModal(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitulo.trim() || !targetRapMomentoId) return;

    try {
      setIsSavingActivity(true);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`/api/instructor/ficha/${fichaId}/rap-momento/${targetRapMomentoId}/actividades`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tipo: actTipo,
          titulo: actTitulo.trim(),
          instrucciones: actInstrucciones.trim(),
          obligatoria: actObligatoria
        })
      });

      if (res.ok) {
        setShowAddActivityModal(false);
        fetchEstructura();
      } else {
        const errData = await res.json();
        alert(errData.error || tr("Error al crear la actividad.", "Error creating activity."));
      }
    } catch (err) {
      console.error("Error saving activity:", err);
    } finally {
      setIsSavingActivity(false);
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
        fetchEstructura();
      } else {
        alert(tr("Error al eliminar la actividad.", "Error deleting activity."));
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.nombre.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

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
        {/* Top bar & Header */}
        <button
          onClick={() => navigate("/instructor/programs")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4DA6FF] mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> {tr("Volver a Programas y Fichas", "Back to Programs & Fichas")}
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#4DA6FF]/10 text-[#4DA6FF] flex items-center justify-center font-bold text-xl">
                <Layers size={28} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Ficha #{fichaInfo?.numero_ficha || fichaId}
                  </h1>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    {tr("Activa", "Active")}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {tr("Programa:", "Program:")} <strong>{trProgram(fichaInfo?.programa_nombre) || "Nursing English"}</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-center">
                <span className="block text-xs text-gray-500 font-medium">{tr("Aprendices", "Students")}</span>
                <span className="text-lg font-bold text-[#4DA6FF]">{students.length}</span>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2 text-center">
                <span className="block text-xs text-gray-500 font-medium">{tr("Módulos", "Modules")}</span>
                <span className="text-lg font-bold text-purple-600">{modulos.length}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mt-6 gap-6">
            <button
              onClick={() => setActiveTab("estructura")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "estructura"
                  ? "border-[#4DA6FF] text-[#4DA6FF]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen size={18} /> {tr("Currículo y Actividades de la Ficha", "Curriculum & Ficha Activities")}
            </button>
            <button
              onClick={() => setActiveTab("estudiantes")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === "estudiantes"
                  ? "border-[#4DA6FF] text-[#4DA6FF]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users size={18} /> {tr("Aprendices Matriculados", "Enrolled Students")} ({students.length})
            </button>
          </div>
        </div>

        {/* TAB 1: ESTRUCTURA & ACTIVIDADES */}
        {activeTab === "estructura" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 bg-[#4DA6FF]/8 border border-[#4DA6FF]/20 rounded-xl px-4 py-2.5">
              <Sparkles className="text-[#4DA6FF] shrink-0" size={18} />
              <div>
                <h3 className="font-bold text-gray-900 text-xs">
                  {tr("Gestión Académica Aislada por Ficha", "Isolated Academic Management by Ficha")}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {tr(`Las actividades creadas aquí pertenecen exclusivamente a la Ficha #${fichaInfo?.numero_ficha}.`, `Activities created here belong exclusively to Ficha #${fichaInfo?.numero_ficha}.`)}
                </p>
              </div>
            </div>

            {modulos.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <p className="text-gray-500 text-sm">{tr("No hay módulos registrados en esta Ficha.", "No modules registered in this Ficha.")}</p>
              </div>
            ) : (
              modulos.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="bg-[#4DA6FF]/10 border-b border-[#4DA6FF]/20 px-5 py-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4DA6FF]">
                        {trPhase(mod.fase)}
                      </span>
                      <h2 className="text-base font-bold text-gray-900">{trModule(mod.titulo)}</h2>
                    </div>
                    <span className="px-2.5 py-0.5 bg-white border border-[#4DA6FF]/30 text-[#4DA6FF] rounded-full text-xs font-bold shadow-2xs">
                      {mod.raps.length} RAPs
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    {mod.raps.map((rap) => {
                      const totalActividadesRap = rap.momentos.reduce(
                        (acc, mom) => acc + (mom.actividades?.length || 0),
                        0
                      );

                      return (
                        <div
                          key={rap.id}
                          className="bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-200 transition-all shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#4DA6FF] text-white flex items-center justify-center text-xs font-bold">
                                {rap.orden}
                              </span>
                              <h3 className="text-base font-bold text-gray-900">{rap.titulo}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 pl-8">
                              <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                <Layers size={12} /> {tr("4 Momentos Pedagógicos", "4 Pedagogical Moments")}
                              </span>
                              <span>
                                <strong>{totalActividadesRap}</strong> {tr("Actividades creadas", "Activities Created")}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/instructor/ficha/${fichaId}/rap/${rap.id}`)}
                            className="px-5 py-2.5 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs shrink-0"
                          >
                            {tr("Gestionar Momentos y Actividades", "Manage Moments & Activities")} <ChevronRight size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ESTUDIANTES */}
        {activeTab === "estudiantes" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {tr("Aprendices Matriculados en Ficha", "Students Enrolled in Ficha")} #{fichaInfo?.numero_ficha}
              </h2>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={tr("Buscar aprendiz...", "Search student...")}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                {tr("No hay aprendices matriculados en esta Ficha.", "No students enrolled in this Ficha.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase">
                    <tr>
                      <th className="py-3 px-4">{tr("Aprendiz", "Student")}</th>
                      <th className="py-3 px-4">{tr("Correo", "Email")}</th>
                      <th className="py-3 px-4">{tr("Estado", "Status")}</th>
                      <th className="py-3 px-4 text-center">{tr("Acciones", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{s.nombre}</td>
                        <td className="py-3.5 px-4 text-gray-500">{s.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            {s.estado === "Activo" || s.estado === "Active" ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-gray-400">{tr("Activo", "Active")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para Crear Nueva Actividad */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
              {tr("Nueva Actividad para Ficha", "New Activity for Ficha")} #{fichaInfo?.numero_ficha}
            </h3>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Tipo de Actividad", "Activity Type")}
                </label>
                <select
                  value={actTipo}
                  onChange={(e) => setActTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#4DA6FF] outline-none"
                >
                  <option value="formulario">{tr("Cuestionario / Formulario", "Quiz / Form")}</option>
                  <option value="grabacion_audio">{tr("Grabación de Audio", "Audio Recording")}</option>
                  <option value="grabacion_video">{tr("Grabación de Video", "Video Recording")}</option>
                  <option value="caso_clinico">{tr("Caso Clínico", "Clinical Case")}</option>
                  <option value="vocabulario">{tr("Vocabulario / Tarjetas", "Vocabulary / Flashcards")}</option>
                  <option value="spelling">{tr("Ortografía (Spelling)", "Spelling")}</option>
                  <option value="grammar_pill">{tr("Píldora Gramatical", "Grammar Pill")}</option>
                  <option value="storybook">{tr("Lectura / Cuento", "Storybook / Reading")}</option>
                  <option value="warm_up">{tr("Actividad de Calentamiento", "Warm-up Activity")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {tr("Título de la Actividad *", "Activity Title *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tr("ej., Cuestionario de Evaluación Clínica", "e.g., Clinical Evaluation Quiz")}
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
                  placeholder={tr("Instrucciones para el aprendiz...", "Student instructions...")}
                  value={actInstrucciones}
                  onChange={(e) => setActInstrucciones(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#4DA6FF] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="obligatoria"
                  checked={actObligatoria}
                  onChange={(e) => setActObligatoria(e.target.checked)}
                  className="rounded text-[#4DA6FF]"
                />
                <label htmlFor="obligatoria" className="text-xs text-gray-700">
                  {tr("Actividad Obligatoria (Afecta el progreso del RAP)", "Mandatory Activity (Affects RAP Progress)")}
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
                {tr("Esta acción es permanente y no se puede deshacer. Todos los datos e historial asociados se eliminarán.", "This action is permanent and cannot be undone. All data and history associated with this activity will be removed.")}
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
