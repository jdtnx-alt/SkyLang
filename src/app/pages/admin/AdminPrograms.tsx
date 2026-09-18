import { Sidebar } from "../../components/Sidebar";
import { Plus, Book, Edit, Trash2, Loader2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

interface Program {
  id: number;
  title: string;
  modules: number;
  raps: number;
  status: string;
  instructor: string;
  description: string;
}

export function AdminPrograms() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("Draft");
  const [newDescription, setNewDescription] = useState("");

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const programsRes = await fetch('/api/admin/programs', { headers: authHeaders });
      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data);
      }
    } catch (error) {
      console.error("Error fetching programs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setNewTitle("");
    setNewStatus("Draft");
    setNewDescription("");
  };

  const handleEditClick = (prog: Program) => {
    setEditingId(prog.id);
    setNewTitle(prog.title);
    setNewStatus(prog.status);
    setNewDescription(prog.description || "");
    setIsCreating(true);
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm(tr(
      "¿Estás seguro de que deseas eliminar este programa? Se eliminarán todas las Fichas, RAPs y Módulos asociados.",
      "Are you sure you want to delete this program? All associated Fichas, RAPs, and Modules will be deleted."
    ))) return;
    try {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/admin/programs/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        fetchPrograms();
      } else {
        alert(tr("Error al eliminar el programa.", "Error deleting program."));
      }
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const handleSaveProgram = async () => {
    if (!newTitle) return;
    
    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `/api/admin/programs/${editingId}` : '/api/admin/programs';
      const method = isEditing ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: newTitle.toUpperCase(),
          status: newStatus,
          description: newDescription
        })
      });

      if (res.ok) {
        resetForm();
        fetchPrograms();
      } else {
        try {
          const data = await res.json();
          alert(data.message || data.error || tr("Error al guardar el programa.", "Error saving program."));
        } catch(e) {
          alert(tr("Error de conexión. ¿Reiniciaste el servidor backend?", "Connection error. Did you restart the backend server?") + ` (${res.status} ${res.statusText})`);
        }
      }
    } catch (error) {
      console.error("Save error", error);
      alert(tr("Error de red al guardar. Verifica que el servidor backend esté en ejecución.", "Network error while saving. Verify that the backend server is running."));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Gestión de Programas", "Program Management")}</h1>
            <p className="text-gray-600">{tr("Crea y administra programas de formación (ej. ADSO, Enfermería)", "Create and manage training programs (e.g. ADSO, Nursing)")}</p>
          </div>
          {!isCreating && (
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-[#4DA6FF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              {tr("Crear Programa", "Create Program")}
            </button>
          )}
        </div>

        {isCreating && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-[#4DA6FF]/30">
            <h2 className="text-xl font-bold text-[#111111] mb-4">
              {editingId ? tr("Editar Programa", "Edit Program") : tr("Crear Nuevo Programa", "Create New Program")}
            </h2>
            
            {!editingId && (
              <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <Book className="text-blue-500 mt-0.5" size={20} />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">{tr("Estructura Predeterminada", "Default Structure")}</h3>
                  <p className="text-sm text-blue-800">
                    {tr(
                      "Al crear este programa, se generarán automáticamente 4 Módulos y 6 RAPs distribuidos de la siguiente forma:",
                      "When creating this program, 4 Modules and 6 RAPs will be automatically generated and distributed as follows:"
                    )}
                  </p>
                  <ul className="list-disc list-inside text-sm text-blue-800 mt-2 grid grid-cols-2 gap-1">
                    <li>{tr("Módulo 1: 1 RAP", "Module 1: 1 RAP")}</li>
                    <li>{tr("Módulo 2: 2 RAPs", "Module 2: 2 RAPs")}</li>
                    <li>{tr("Módulo 3: 2 RAPs", "Module 3: 2 RAPs")}</li>
                    <li>{tr("Módulo 4: 1 RAP", "Module 4: 1 RAP")}</li>
                  </ul>
                </div>
              </div>
            )}

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tr("Nombre del Programa", "Program Name")}</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]" 
                  placeholder={tr("ej. ADSO, ENFERMERÍA, MECÁNICA", "e.g. ADSO, NURSING, MECHANICS")} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tr("Estado", "Status")}</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
                >
                  <option value="Draft">{tr("Borrador", "Draft")}</option>
                  <option value="Active">{tr("Activo", "Active")}</option>
                </select>
              </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tr("Descripción", "Description")}</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]" 
                  rows={3} 
                  placeholder={tr("Descripción del programa...", "Program description...")}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                ></textarea>
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {tr("Cancelar", "Cancel")}
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveProgram}
                  disabled={!newTitle}
                  className="px-4 py-2 bg-[#4DA6FF] hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {editingId ? tr("Actualizar Programa", "Update Program") : tr("Guardar Programa", "Save Program")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Programs List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Todos los Programas", "All Programs")}</h2>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-8 text-gray-400">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                {tr("No hay programas disponibles. Crea uno nuevo.", "No programs available. Create a new one.")}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Programa", "Program")}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Módulos", "Modules")}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("RAPs", "RAPs")}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Instructor", "Instructor")}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Estado", "Status")}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">{tr("Acciones", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((prog) => (
                    <tr 
                      key={prog.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        navigate(`/admin/programs/${prog.id}`);
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg text-[#4DA6FF]">
                            <Book size={20} />
                          </div>
                          <span className="font-medium text-gray-800">{prog.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{prog.modules}</td>
                      <td className="py-3 px-4 text-gray-600">{prog.raps}</td>
                      <td className="py-3 px-4 text-gray-600">{prog.instructor}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            prog.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {prog.status === "Active" ? tr("Activo", "Active") : tr("Borrador", "Draft")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => navigate(`/admin/programs/${prog.id}`)}
                            className="p-1 text-gray-500 hover:text-[#4DA6FF] transition-colors"
                            title={tr("Ver Detalles", "View Details")}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(prog)}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title={tr("Editar", "Edit")}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProgram(prog.id)}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            title={tr("Eliminar", "Delete")}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
