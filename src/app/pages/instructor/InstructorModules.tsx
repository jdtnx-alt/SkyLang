import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Layers, BookOpen, Plus, Search, Edit2, Trash2, X, Check, FileText, Filter, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RAP {
  id: number;
  titulo: string;
}

interface ModuleItem {
  id: number;
  programaId: number;
  faseId: number;
  titulo: string;
  descripcion: string;
  orden: number;
  programaTitulo: string;
  raps?: RAP[];
}

interface ProgramOption {
  id: number;
  title: string;
}

export function InstructorModules() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [filteredModules, setFilteredModules] = useState<ModuleItem[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("TODOS");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);

  // Form Fields
  const [formProgramaId, setFormProgramaId] = useState<number>(1);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formOrden, setFormOrden] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch("/api/instructor/programs", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPrograms(data.map((p: any) => ({ id: p.id, title: p.title })));
          if (data.length > 0) {
            setFormProgramaId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching programs for dropdown:", err);
    }
  };

  const fetchModules = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch("/api/instructor/modules", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setModules(data);
          setFilteredModules(data);
        }
      }
    } catch (err) {
      console.error("Error loading modules from DB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchModules();
  }, []);

  // Filter logic
  useEffect(() => {
    let result = [...modules];

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.titulo.toLowerCase().includes(term) ||
          m.descripcion.toLowerCase().includes(term) ||
          m.programaTitulo.toLowerCase().includes(term)
      );
    }

    if (selectedProgramFilter !== "TODOS") {
      result = result.filter((m) => m.programaId === Number(selectedProgramFilter));
    }

    setFilteredModules(result);
  }, [searchTerm, selectedProgramFilter, modules]);

  // Open modal for new module
  const handleOpenNewModal = () => {
    setEditingModule(null);
    setFormTitulo("");
    setFormDescripcion("");
    setFormOrden(modules.length + 1);
    if (programs.length > 0) {
      setFormProgramaId(programs[0].id);
    }
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (mod: ModuleItem) => {
    setEditingModule(mod);
    setFormProgramaId(mod.programaId);
    setFormTitulo(mod.titulo);
    setFormDescripcion(mod.descripcion);
    setFormOrden(mod.orden);
    setIsModalOpen(true);
  };

  // Save module (Create or Update)
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const isEditing = editingModule !== null;
      const url = isEditing
        ? `/api/instructor/modules/${editingModule.id}`
        : "/api/instructor/modules";
      const method = isEditing ? "PUT" : "POST";

      const bodyData = {
        programaId: formProgramaId,
        titulo: formTitulo.toUpperCase(),
        descripcion: formDescripcion,
        orden: formOrden,
        faseId: 1,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchModules();
      } else {
        alert("Error guardando el módulo");
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm delete module
  const handleDeleteModule = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/instructor/modules/${id}`, { method: "DELETE", headers: authHeaders });
      if (res.ok) {
        setDeletingId(null);
        fetchModules();
      } else {
        alert("Error al eliminar el módulo");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const totalModulos = modules.length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="instructor" />

      <div className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#111111] mb-2">Module Management</h1>
            <p className="text-gray-600">Manage and organize training modules for your program curriculum and fichas</p>
          </div>

          <button
            onClick={handleOpenNewModal}
            className="px-5 py-2.5 bg-[#4DA6FF] hover:bg-[#2563eb] text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Plus size={20} /> New Module
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-[#4DA6FF]">
              <Layers size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Modules</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalModulos}</h3>
              <p className="text-xs text-blue-600 font-medium">Registered in platform</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <BookOpen size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Assigned Programs</p>
              <h3 className="text-2xl font-bold text-gray-900">{programs.length}</h3>
              <p className="text-xs text-purple-600 font-medium">Assigned to your profile</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">System Status</p>
              <h3 className="text-2xl font-bold text-gray-900">Active</h3>
              <p className="text-xs text-green-600 font-medium">PostgreSQL Database Connected</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search module by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={18} className="text-gray-500" />
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            >
              <option value="TODOS">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modules List */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-md">Loading modules from database...</div>
        ) : filteredModules.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-md">
            No modules found matching your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredModules.map((mod) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-blue-50 text-[#4DA6FF] rounded-lg text-xs font-bold border border-blue-200">
                      Module #{mod.orden}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{mod.programaTitulo}</span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{mod.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-4">{mod.descripcion || "No description assigned."}</p>

                  {/* RAPs chips if any */}
                  {mod.raps && mod.raps.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Linked RAPs:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.raps.map((r) => (
                          <span
                            key={r.id}
                            className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200"
                          >
                            {r.titulo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditModal(mod)}
                    className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(mod.id)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Módulo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {editingModule ? "Edit Module" : "Create New Module"}
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Fill in the module details to update the curriculum information.
              </p>

              <form onSubmit={handleSaveModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Program</label>
                  <select
                    value={formProgramaId}
                    onChange={(e) => setFormProgramaId(Number(e.target.value))}
                    disabled={editingModule !== null}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Module Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MODULO 1 GETTING TO KNOW OTHER PEOPLE"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Module Order</label>
                  <input
                    type="number"
                    min={1}
                    value={formOrden}
                    onChange={(e) => setFormOrden(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Write module description or purpose..."
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#4DA6FF] hover:bg-[#2563eb] text-white rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-1"
                  >
                    {isSaving ? "Saving..." : "Save Module"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Module?</h3>
              <p className="text-xs text-gray-500 mb-6">
                This action will permanently delete the module from the database. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteModule(deletingId)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors shadow-md"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
