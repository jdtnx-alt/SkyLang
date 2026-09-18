import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ModalFicha } from "../../components/admin/ModalFicha";
import { Sidebar } from "../../components/Sidebar";
import { useLanguage } from "../../context/LanguageContext";
import { 
  ArrowLeft, 
  Book, 
  Calendar, 
  User as UserIcon, 
  Layout,
  CheckCircle2,
  Plus
} from "lucide-react";

export function AdminProgramDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [programData, setProgramData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarModalFicha, setMostrarModalFicha] = useState(false);
  const [fichaEditada, setFichaEditada] = useState<any>(null);

  const recargar = () => {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    return fetch(`/api/admin/programs/${id}/details`, { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch details");
        return res.json();
      })
      .then(data => {
        setProgramData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => { recargar(); }, [id]);

  const [fichaToDelete, setFichaToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmarEliminarFicha = async () => {
    if (!fichaToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/courses/${fichaToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setFichaToDelete(null);
        recargar();
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.message || err.error || tr('Could not delete ficha.', 'Could not delete ficha.'));
      }
    } catch {
      setDeleteError(tr('Could not delete ficha. Check your connection.', 'Could not delete ficha. Check your connection.'));
    } finally {
      setIsDeleting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role="admin" />
        <div className="lg:ml-64 flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#4DA6FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!programData || !programData.program) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role="admin" />
        <div className="lg:ml-64 p-4 sm:p-6 lg:p-8">
          <button onClick={() => navigate('/admin/programs')} className="flex items-center text-gray-600 hover:text-[#4DA6FF] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> {tr("Volver a Programas", "Back to Programs")}
          </button>
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800">{tr("Programa no encontrado", "Program not found")}</h2>
          </div>
        </div>
      </div>
    );
  }

  const { program, courses } = programData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="lg:ml-64">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <button 
            onClick={() => navigate('/admin/programs')} 
            className="flex items-center text-sm text-gray-500 hover:text-[#4DA6FF] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> {tr("Volver a Programas", "Back to Programs")}
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg text-[#4DA6FF]">
                  <Layout size={24} />
                </div>
                <h1 className="text-3xl font-bold text-[#111111]">{program.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  program.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {program.status === 'Active' ? tr("Activo", "Active") : tr("Borrador", "Draft")}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-4 max-w-2xl">{program.description || tr("Sin descripción para este programa.", "No description provided for this program.")}</p>
              
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{tr("Coordinador Principal:", "Main Coordinator:")} {program.instructor}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-blue-50 text-blue-700 px-6 py-4 rounded-xl text-center">
                <div className="text-2xl font-bold">{courses.length}</div>
                <div className="text-sm font-medium">{tr("Total de Fichas", "Total Courses (Fichas)")}</div>
              </div>
              <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl text-center">
                <div className="text-2xl font-bold">{courses.filter((c:any) => c.status === 'Active').length}</div>
                <div className="text-sm font-medium">{tr("Fichas Activas", "Active Courses")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Courses List Section */}
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{tr("Fichas del programa", "Program Fichas")}</h2>
              <p className="text-sm text-gray-500">
                {tr(
                  "Cada ficha es una cohorte con su propio instructor, aprendices y contenido.",
                  "Each ficha is a cohort with its own instructor, students, and content."
                )}
              </p>
            </div>
            <button
              onClick={() => { setFichaEditada(null); setMostrarModalFicha(true); }}
              className="px-4 py-2.5 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={18} /> {tr("Crear ficha", "Create Ficha")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <div 
                key={course.id} 
                onClick={() => navigate(`/admin/courses/${course.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-[#4DA6FF] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-[#4DA6FF] group-hover:text-white transition-colors">
                      <Book size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#4DA6FF] transition-colors">
                        {tr("Ficha", "Ficha")}: {course.title}
                      </h3>
                      <p className="text-sm text-gray-500">{tr("ID de Ficha:", "Course ID:")} {course.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    course.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {course.status === 'Active' ? tr("Activo", "Active") : tr("Borrador", "Draft")}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{course.startDate || tr('Sin fecha', 'No date')} — {course.endDate || tr('Sin fecha', 'No date')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className={course.instructorId ? '' : 'text-amber-600 font-medium'}>
                      {course.instructor}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>
                      {course.aprendices ?? 0} {course.aprendices === 1 ? tr('aprendiz', 'student') : tr('aprendices', 'students')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setFichaEditada(course); setMostrarModalFicha(true); }}
                      className="flex-1 px-3 py-1.5 border border-gray-200 hover:border-[#4DA6FF] hover:text-[#4DA6FF] rounded-lg text-xs font-semibold text-gray-600"
                    >
                      {tr("Editar", "Edit")}
                    </button>
                    <button
                      onClick={() => { setDeleteError(null); setFichaToDelete(course); }}
                      className="px-3 py-1.5 border border-gray-200 hover:border-rose-400 hover:text-rose-600 rounded-lg text-xs font-semibold text-gray-600"
                    >
                      {tr("Eliminar", "Delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {courses.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
                <Book className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">{tr("Este programa no tiene fichas", "This program has no fichas")}</p>
                <p>{tr("Crea la primera para poder matricular aprendices y publicar contenido.", "Create the first one to enroll students and publish content.")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarModalFicha && (
        <ModalFicha
          programaId={program.id}
          ficha={fichaEditada}
          onCerrar={() => setMostrarModalFicha(false)}
          onGuardado={() => { setMostrarModalFicha(false); recargar(); }}
        />
      )}

      {/* Delete Ficha Confirmation Modal */}
      {fichaToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Red top bar */}
            <div className="h-1.5 bg-rose-500 w-full" />

            <div className="p-6 space-y-4">
              {/* Icon + title */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Book size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {tr("Eliminar ficha", "Delete Ficha")}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-800">{fichaToDelete.title}</span>
                  </p>
                </div>
              </div>

              {/* Warning message */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                {fichaToDelete.aprendices > 0 ? (
                  <>
                    <p className="font-semibold mb-1">
                      {tr(
                        `Esta ficha tiene ${fichaToDelete.aprendices} aprendiz(ces) matriculado(s).`,
                        `This ficha has ${fichaToDelete.aprendices} enrolled student(s).`
                      )}
                    </p>
                    <p>
                      {tr(
                        "Al eliminarla se borrarán todas sus actividades, contenidos y progreso de aprendices. Esta acción no se puede deshacer.",
                        "Deleting it will permanently remove all its activities, content and student progress. This action cannot be undone."
                      )}
                    </p>
                  </>
                ) : (
                  <p>
                    {tr(
                      "Al eliminar esta ficha se borrarán todos sus datos asociados. Esta acción no se puede deshacer.",
                      "Deleting this ficha will permanently remove all its associated data. This action cannot be undone."
                    )}
                  </p>
                )}
              </div>

              {/* Error */}
              {deleteError && (
                <p className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium p-3">
                  {deleteError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setFichaToDelete(null); setDeleteError(null); }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {tr("Cancelar", "Cancel")}
                </button>
                <button
                  onClick={confirmarEliminarFicha}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {tr("Eliminando...", "Deleting...")}
                    </>
                  ) : (
                    tr("Sí, eliminar", "Yes, delete")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
