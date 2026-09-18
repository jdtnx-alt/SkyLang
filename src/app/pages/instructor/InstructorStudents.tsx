import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Search, Users, UserCheck, TrendingUp, Filter, Mail, Award, BookOpen, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../context/LanguageContext";

interface Student {
  id: number;
  nombre: string;
  email: string;
  estado: string;
  numeroFicha: string;
  programaTitulo: string;
  avance: number;
  rapsTotales?: number;
  rapsCompletados?: number;
  rapActual?: number | null;
  ultimaActividad?: string | null;
}

export function InstructorStudents() {
  const { tr } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFicha, setSelectedFicha] = useState("TODAS");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const url = currentInstructor 
        ? `/api/instructor/students?instructor=${encodeURIComponent(currentInstructor)}`
        : '/api/instructor/students';
      
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStudents(data);
          setFilteredStudents(data);
        }
      }
    } catch (err) {
      console.error("Error fetching students from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentInstructor]);

  // Handle Search & Filter
  useEffect(() => {
    let result = [...students];

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.nombre.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          s.numeroFicha.toLowerCase().includes(term) ||
          s.programaTitulo.toLowerCase().includes(term)
      );
    }

    if (selectedFicha !== "TODAS") {
      result = result.filter((s) => s.numeroFicha === selectedFicha);
    }

    setFilteredStudents(result);
  }, [searchTerm, selectedFicha, students]);

  // Unique fichas list for dropdown filter
  const fichas = Array.from(new Set(students.map((s) => s.numeroFicha).filter(Boolean)));

  // Calculate metrics
  const totalAprendices = students.length;
  const activos = students.filter((s) => s.estado === "Activo").length;
  const promedioAvance = Math.round(
    students.reduce((acc, s) => acc + (s.avance || 0), 0) / (totalAprendices || 1)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="instructor" />

      <div className="lg:ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-16 sm:pt-6 lg:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">{tr("Mis Aprendices", "My Students")}</h1>
          <p className="text-xs sm:text-sm text-slate-600">{tr("Listado y seguimiento del rendimiento de aprendices asignados a tus fichas y programas", "List and performance tracking of students assigned to your fichas and programs")}</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-100 rounded-xl flex items-center justify-center text-[#4DA6FF] shrink-0">
              <Users size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500">{tr("Total Aprendices", "Total Students")}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{totalAprendices}</h3>
              <p className="text-[11px] sm:text-xs text-sky-600 font-medium truncate">{tr("Asignados a tu perfil", "Assigned to your profile")}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500">{tr("Aprendices Activos", "Active Students")}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{activos}</h3>
              <p className="text-[11px] sm:text-xs text-emerald-600 font-medium truncate">{tr("En formación activa", "In active training")}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200/80 flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
              <TrendingUp size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500">{tr("Progreso Promedio", "Avg Progress")}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{promedioAvance}%</h3>
              <p className="text-[11px] sm:text-xs text-purple-600 font-medium truncate">{tr("Rendimiento acumulado", "Cumulative performance")}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={tr("Buscar por nombre, correo o ficha...", "Search by name, email, or ficha...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Filter size={18} className="text-slate-400 shrink-0" />
            <select
              value={selectedFicha}
              onChange={(e) => setSelectedFicha(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] cursor-pointer"
            >
              <option value="TODAS">{tr("Todas las Fichas", "All Fichas")}</option>
              {fichas.map((f) => (
                <option key={f} value={f}>
                  Ficha #{f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content View: Loading / Empty / Data */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm">
            {tr("Cargando aprendices...", "Loading students...")}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm">
            {tr("No se encontraron aprendices con ese criterio de búsqueda.", "No students found matching your search criteria.")}
          </div>
        ) : (
          <>
            {/* Mobile Cards (visible on phones & small screens) */}
            <div className="block md:hidden space-y-3.5 mb-6">
              {filteredStudents.map((student) => {
                const initials = student.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isActive = student.estado === "Activo" || student.estado === "Active";

                return (
                  <div 
                    key={student.id} 
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3"
                  >
                    {/* Top: Avatar + Name + Status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA6FF] to-[#2563eb] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{student.nombre}</h3>
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{student.email}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {isActive ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}
                      </span>
                    </div>

                    {/* Ficha & Program Info */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        #{student.numeroFicha}
                      </span>
                      <span className="text-slate-600 font-medium truncate flex-1">
                        {student.programaTitulo}
                      </span>
                    </div>

                    {/* Progress Bar & RAP */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-600">{tr("Progreso", "Progress")}</span>
                        <span className="text-[#4DA6FF] font-bold">{student.avance}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-[#4DA6FF] rounded-full transition-all"
                          style={{ width: `${student.avance}%` }}
                        />
                      </div>
                      <span className="block text-[11px] text-slate-400">
                        {(student as any).rapActual
                          ? tr(`Cursando el RAP ${(student as any).rapActual}`, `Taking RAP ${(student as any).rapActual}`)
                          : (student as any).rapsTotales > 0
                            ? tr('Programa completo', 'Program completed')
                            : tr('Sin progreso registrado', 'No registered progress')}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-full py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <span>{tr("Ver Perfil y Rendimiento", "View Profile & Details")}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-4 px-6">{tr("Aprendiz", "Student")}</th>
                      <th className="py-4 px-6">{tr("Ficha", "Ficha")}</th>
                      <th className="py-4 px-6">{tr("Programa", "Program")}</th>
                      <th className="py-4 px-6">{tr("Progreso", "Progress")}</th>
                      <th className="py-4 px-6">{tr("Estado", "Status")}</th>
                      <th className="py-4 px-6 text-right">{tr("Acción", "Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const initials = student.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA6FF] to-[#2563eb] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{student.nombre}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail size={12} className="text-slate-400" /> {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              #{student.numeroFicha}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <p className="text-sm font-medium text-slate-800">{student.programaTitulo}</p>
                          </td>

                          <td className="py-4 px-6">
                            <div className="w-44">
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-slate-800 font-bold">{student.avance}%</span>
                                {(student as any).rapsTotales > 0 && (
                                  <span className="text-slate-500">
                                    {(student as any).rapsCompletados}/{(student as any).rapsTotales} RAP
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-[#4DA6FF] rounded-full transition-all"
                                  style={{ width: `${student.avance}%` }}
                                />
                              </div>
                              <span className="block text-[10px] text-slate-400 mt-1">
                                {(student as any).rapActual
                                  ? tr(`Cursando el RAP ${(student as any).rapActual}`, `Taking RAP ${(student as any).rapActual}`)
                                  : (student as any).rapsTotales > 0
                                    ? tr('Programa completo', 'Program completed')
                                    : tr('Sin progreso registrado', 'No registered progress')}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                student.estado === "Activo" || student.estado === "Active"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  student.estado === "Activo" || student.estado === "Active" ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {student.estado === "Activo" || student.estado === "Active" ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-[#4DA6FF] hover:text-white rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                            >
                              {tr("Ver Perfil", "View Profile")} <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[92vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4DA6FF] to-[#2563eb] text-white font-bold text-xl flex items-center justify-center shadow-lg mb-3">
                  {selectedStudent.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedStudent.nombre}</h3>
                <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#4DA6FF] border border-blue-200">
                  {tr("Aprendiz", "Student")} - Ficha #{selectedStudent.numeroFicha}
                </span>
              </div>

              <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-xl mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <BookOpen size={16} /> {tr("Programa:", "Program:")}
                  </span>
                  <span className="font-semibold text-gray-800 text-right">{selectedStudent.programaTitulo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Award size={16} /> {tr("Estado de Formación:", "Training Status:")}
                  </span>
                  <span className="font-semibold text-green-600">
                    {selectedStudent.estado === "Activo" || selectedStudent.estado === "Active" ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{tr("Progreso General", "Overall Progress")}</span>
                    <span>{selectedStudent.avance}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4DA6FF]" style={{ width: `${selectedStudent.avance}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                >
                  {tr("Cerrar", "Close")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
