import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Sidebar } from "../../components/Sidebar";
import { BookOpen, Layers, Users, Search, Calendar, CheckCircle2, ChevronRight, X, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../context/LanguageContext";

interface Ficha {
  id: number;
  numeroFicha: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  totalAprendices: number;
}

interface InstructorProgram {
  id: number;
  title: string;
  description: string;
  fichas: Ficha[];
}

export function InstructorPrograms() {
  const { tr, trPhase, trModule, trProgram } = useLanguage();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<InstructorProgram[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<InstructorProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFichaModal, setSelectedFichaModal] = useState<Ficha | null>(null);
  const [currentInstructor, setCurrentInstructor] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.nombre) {
          setCurrentInstructor(user.nombre);
        }
      }
    } catch (e) {
      console.error("Error reading localStorage", e);
    }
  }, []);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const url = currentInstructor
        ? `/api/instructor/programs?instructor=${encodeURIComponent(currentInstructor)}`
        : "/api/instructor/programs";

      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPrograms(data);
          setFilteredPrograms(data);
        }
      }
    } catch (err) {
      console.error("Error fetching programs from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [currentInstructor]);

  // Search filter
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPrograms(programs);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = programs
      .map((p) => {
        const matchTitle = p.title.toLowerCase().includes(term);
        const matchDesc = p.description.toLowerCase().includes(term);
        const matchingFichas = p.fichas.filter((f) => f.numeroFicha.toLowerCase().includes(term));

        if (matchTitle || matchDesc || matchingFichas.length > 0) {
          return {
            ...p,
            fichas: matchTitle || matchDesc ? p.fichas : matchingFichas,
          };
        }
        return null;
      })
      .filter((p): p is InstructorProgram => p !== null);

    setFilteredPrograms(filtered);
  }, [searchTerm, programs]);

  // Metrics
  const totalProgramas = programs.length;
  const totalFichas = programs.reduce((acc, p) => acc + p.fichas.length, 0);
  const totalAprendicesEnFichas = programs.reduce(
    (acc, p) => acc + p.fichas.reduce((fAcc, f) => fAcc + f.totalAprendices, 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="instructor" />

      <div className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Programas y Fichas Asignadas", "Programs & Assigned Fichas")}</h1>
          <p className="text-gray-600">{tr("Resumen de programas de formación y fichas activas bajo tu liderazgo", "Overview of assigned training programs and active cohorts under your leadership")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-[#4DA6FF]">
              <BookOpen size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{tr("Programas Asignados", "Assigned Programs")}</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalProgramas}</h3>
              <p className="text-xs text-blue-600 font-medium">{tr("Áreas de especialidad", "Specialty areas")}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Layers size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{tr("Fichas Activas", "Active Fichas")}</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalFichas}</h3>
              <p className="text-xs text-purple-600 font-medium">{tr("Cohortes activas", "Active cohorts")}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{tr("Total Aprendices", "Total Students")}</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalAprendicesEnFichas}</h3>
              <p className="text-xs text-green-600 font-medium">{tr("Inscritos en tus fichas", "Enrolled in your fichas")}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={tr("Buscar por programa o número de ficha...", "Search by program or ficha number...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            />
          </div>
        </div>

        {/* Programs List */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-md">{tr("Cargando programas y fichas...", "Loading programs and fichas...")}</div>
        ) : filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-md">{tr("No se encontraron programas o fichas asignadas.", "No assigned programs or fichas found.")}</div>
        ) : (
          <div className="space-y-8">
            {filteredPrograms.map((program) => (
              <div key={program.id} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4DA6FF]" />
                      <h2 className="text-xl font-bold text-gray-900">{trProgram(program.title)}</h2>
                    </div>
                    <p className="text-sm text-gray-600 max-w-3xl">{program.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-[#4DA6FF] text-xs font-semibold rounded-full border border-blue-200">
                    {program.fichas.length} {program.fichas.length === 1 ? "Ficha" : "Fichas"}
                  </span>
                </div>

                {/* Fichas Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {program.fichas.map((ficha) => (
                    <motion.div
                      key={ficha.id}
                      whileHover={{ y: -3 }}
                      className="bg-gray-50 rounded-xl p-5 border border-gray-200/80 hover:border-[#4DA6FF] hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-800 shadow-2xs">
                            Ficha #{ficha.numeroFicha}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              ficha.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {ficha.activo ? tr("Activa", "Active") : tr("Completada", "Completed")}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-gray-400" />
                            <span>
                              <strong>{ficha.totalAprendices}</strong> {tr("Aprendices inscritos", "Enrolled students")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span>
                              {tr("Inicio:", "Start:")} <strong>{ficha.fechaInicio}</strong> | {tr("Fin:", "End:")} <strong>{ficha.fechaFin}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/instructor/ficha/${ficha.id}`)}
                        className="w-full py-2 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        {tr("Gestionar Ficha y Actividades", "Manage Ficha & Activities")} <ChevronRight size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ficha Details Modal */}
      <AnimatePresence>
        {selectedFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedFichaModal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#4DA6FF]/10 text-[#4DA6FF] flex items-center justify-center">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Ficha #{selectedFichaModal.numeroFicha}</h3>
                  <p className="text-xs text-gray-500">{tr("Información del grupo de aprendices", "Cohort student group information")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl text-sm">
                <div>
                  <p className="text-xs text-gray-500">{tr("Estado de la Ficha", "Ficha Status")}</p>
                  <p className="font-semibold text-green-600">{selectedFichaModal.activo ? tr("Activa", "Active") : tr("Inactiva", "Inactive")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tr("Total Aprendices", "Total Students")}</p>
                  <p className="font-semibold text-gray-800">{selectedFichaModal.totalAprendices} {tr("aprendices", "students")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tr("Fecha de Inicio", "Start Date")}</p>
                  <p className="font-semibold text-gray-800">{selectedFichaModal.fechaInicio}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tr("Fecha de Fin", "End Date")}</p>
                  <p className="font-semibold text-gray-800">{selectedFichaModal.fechaFin}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-[#4DA6FF] font-semibold text-sm mb-1">
                  <CheckCircle2 size={16} /> {tr("Estado de la Fase de Formación", "Training Phase Status")}
                </div>
                <p className="text-xs text-gray-600">
                  {tr(`La Ficha #${selectedFichaModal.numeroFicha} se encuentra en una fase activa de formación dentro del currículo del programa.`, `Ficha #${selectedFichaModal.numeroFicha} is currently in an active training phase under the program curriculum.`)}
                </p>
              </div>

              <button
                onClick={() => setSelectedFichaModal(null)}
                className="w-full py-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-semibold text-sm transition-colors"
              >
                {tr("Cerrar", "Close")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
