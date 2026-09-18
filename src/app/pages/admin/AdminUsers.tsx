import { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Plus, Edit2, Trash2, Search, UserX, UserCheck, Mail, Calendar } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export function AdminUsers() {
  const { tr } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isEditing, setIsEditing] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [fichas, setFichas] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    role: "Student", 
    status: "Active",
    password: "",
    programa_id: "",
    ficha_id: "",
    idNumber: ""
  });

  const resetForm = () => {
    setNewUser({ name: "", email: "", role: "Student", status: "Active", password: "", programa_id: "", ficha_id: "", idNumber: "" });
  };

  const fetchUsers = () => {
    const params = new URLSearchParams();
    if (roleFilter !== "All Roles") params.append("role", roleFilter);
    if (statusFilter !== "All Status") params.append("status", statusFilter);
    if (search) params.append("search", search);

    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(`/api/admin/users?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);


  useEffect(() => {
    fetch('/api/programas')
      .then(res => res.json())
      .then(data => setPrograms(data))
      .catch(err => console.error(err));
  }, []);

  const [fichasCargando, setFichasCargando] = useState(false);

  useEffect(() => {
    if (!newUser.programa_id) {
      setFichas([]);
      return;
    }
    setFichasCargando(true);
    fetch(`/api/fichas?program_id=${newUser.programa_id}`)
      .then(res => res.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : [];
        setFichas(lista);
        // Si la ficha del aprendiz no está en la lista recién cargada, se limpia
        // en lugar de dejar que el navegador elija otra por su cuenta: así nadie
        // cambia de ficha sin querer al guardar cualquier otro campo.
        setNewUser(prev => (
          prev.ficha_id && !lista.some(f => String(f.id) === String(prev.ficha_id))
            ? { ...prev, ficha_id: "" }
            : prev
        ));
      })
      .catch(err => console.error(err))
      .finally(() => setFichasCargando(false));
  }, [newUser.programa_id]);

  const handleCreateOrUpdateUser = () => {
    const url = isEditing ? `/api/admin/users/${editingId}` : '/api/admin/users';
    const method = isEditing ? 'PUT' : 'POST';

    if (fichasCargando) {
      alert(tr("Espera a que terminen de cargar las fichas.", "Please wait for fichas to finish loading."));
      return;
    }
    if (newUser.role === "Student" && (!newUser.programa_id || !newUser.ficha_id)) {
      alert(tr("Por favor seleccione el Programa y la Ficha para el estudiante.", "Please select the Program and Ficha for the student."));
      return;
    }

    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(newUser),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchUsers();
          setShowModal(false);
          resetForm();
        } else {
          alert(data.message || tr('Error al guardar el usuario.', 'Error saving user.'));
        }
      })
      .catch(err => {
        console.error('Error saving user:', err);
      });
  };

  const handleEditClick = (user: any) => {
    setIsEditing(true);
    setEditingId(user.id);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: "",
      programa_id: user.programa_id || "",
      ficha_id: user.ficha_id || "",
      idNumber: user.idNumber || ""
    });
    setShowModal(true);
  };

  const handleDeleteUser = (id: number) => {
    setUserToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      fetch(`/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: authHeaders
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchUsers();
          } else {
            alert(data.message || tr('Error al eliminar el usuario.', 'Error deleting user.'));
          }
        })
        .catch(err => {
          console.error('Error deleting user:', err);
        })
        .finally(() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      
      <div className="lg:ml-64 min-w-0 p-4 sm:p-6 lg:p-8 pt-16 sm:pt-6 lg:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1 sm:mb-2">
              {tr("Gestión de Usuarios", "Manage Users")}
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {tr("Crea, edita y administra los usuarios de la plataforma", "Create, edit, and manage platform users")}
            </p>
          </div>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#4DA6FF] hover:bg-[#3d95ef] text-white rounded-xl font-bold text-sm sm:text-base transition-all shadow-md active:scale-95 shrink-0 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>{tr("Agregar Nuevo Usuario", "Add New User")}</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("Buscar por nombre, email o documento...", "Search by name, email or ID...")}
                className="w-full pl-10 pr-4 py-2.5 text-sm sm:text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent transition-all"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3">
              <div className="w-full sm:w-auto">
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] bg-white text-slate-700 font-medium cursor-pointer"
                >
                  <option value="All Roles">{tr("Todos los Roles", "All Roles")}</option>
                  <option value="Student">{tr("Aprendiz", "Student")}</option>
                  <option value="Instructor">{tr("Instructor", "Instructor")}</option>
                  <option value="Admin">{tr("Administrador", "Admin")}</option>
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] bg-white text-slate-700 font-medium cursor-pointer"
                >
                  <option value="All Status">{tr("Todos los Estados", "All Status")}</option>
                  <option value="Active">{tr("Activo", "Active")}</option>
                  <option value="Inactive">{tr("Inactivo", "Inactive")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards View (Phones & Small Screens) */}
        <div className="block md:hidden space-y-3 mb-6">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-sm">
                    {(user.name || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{user.name}</h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>
                
                {/* Role Badge */}
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    user.role === "Admin"
                      ? "bg-orange-100 text-orange-700 border border-orange-200"
                      : user.role === "Instructor"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Details Row: Status + ID / Ficha + Date */}
              <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-t border-slate-100 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                    user.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {user.status === "Active" ? <UserCheck size={13} /> : <UserX size={13} />}
                  <span>{user.status === "Active" ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}</span>
                </span>

                {user.idNumber && (
                  <span className="text-slate-500 font-medium">
                    CC: <span className="text-slate-700 font-bold">{user.idNumber}</span>
                  </span>
                )}

                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {user.joinDate || "N/A"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                <button
                  onClick={() => handleEditClick(user)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl font-bold text-xs transition-colors active:scale-95"
                >
                  <Edit2 size={14} />
                  <span>{tr("Editar", "Edit")}</span>
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-colors active:scale-95"
                >
                  <Trash2 size={14} />
                  <span>{tr("Eliminar", "Delete")}</span>
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
              <UserX size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">{tr("No se encontraron usuarios", "No users found matching filters.")}</p>
            </div>
          )}
        </div>

        {/* Desktop / Tablet Users Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">{tr("Nombre", "Name")}</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">{tr("Email", "Email")}</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">{tr("Rol", "Role")}</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">{tr("Estado", "Status")}</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">{tr("Fecha de Ingreso", "Join Date")}</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 text-right">{tr("Acciones", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{user.name}</td>
                    <td className="py-4 px-6 text-slate-600">{user.email}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === "Admin"
                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                            : user.role === "Instructor"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === "Active"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-rose-100 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {user.status === "Active" ? (
                          <UserCheck size={14} />
                        ) : (
                          <UserX size={14} />
                        )}
                        <span>{user.status === "Active" ? tr("Activo", "Active") : tr("Inactivo", "Inactive")}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">{user.joinDate || "N/A"}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-2 hover:bg-sky-50 text-slate-400 hover:text-[#4DA6FF] rounded-lg transition-colors"
                          title={tr("Editar", "Edit")}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title={tr("Eliminar", "Delete")}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                      {tr("No se encontraron usuarios que coincidan con los filtros.", "No users found matching filters.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
                {isEditing ? tr("Editar Usuario", "Edit User") : tr("Agregar Nuevo Usuario", "Add New User")}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    {tr("Nombre Completo", "Full Name")}
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder={tr("Ingresa el nombre completo", "Enter full name")}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent transition-all"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent transition-all"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    {tr("Número de Documento", "Identification Number")}
                  </label>
                  <input
                    type="text"
                    value={newUser.idNumber}
                    onChange={(e) => setNewUser({ ...newUser, idNumber: e.target.value })}
                    placeholder="123456789"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent transition-all"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    {isEditing ? tr("Contraseña (dejar en blanco para mantener)", "Password (leave blank to keep current)") : tr("Contraseña", "Password")}
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder={isEditing ? "••••••••" : tr("Mínimo 8 caracteres", "Minimum 8 characters")}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent transition-all"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    {tr("Rol", "Role")}
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent bg-white text-slate-700 font-medium"
                  >
                    <option value="Student">{tr("Aprendiz", "Student")}</option>
                    <option value="Instructor">{tr("Instructor", "Instructor")}</option>
                    <option value="Admin">{tr("Administrador", "Admin")}</option>
                  </select>
                </div>

                {newUser.role === "Student" && (
                  <>
                    <div className="md:col-span-1">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                        {tr("Programa", "Program")}
                      </label>
                      <select
                        value={newUser.programa_id}
                        onChange={(e) => setNewUser({ ...newUser, programa_id: e.target.value, ficha_id: "" })}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent bg-white text-slate-700 font-medium"
                      >
                        <option value="">{tr("Seleccionar Programa", "Select Program")}</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {newUser.programa_id && (
                      <div className="md:col-span-1">
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                          {tr("Ficha", "Ficha")} <span className="text-slate-400 font-normal">({tr("una por aprendiz", "one per student")})</span>
                        </label>
                        {fichasCargando ? (
                          <div className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-400">
                            {tr("Cargando fichas…", "Loading fichas…")}
                          </div>
                        ) : (
                          <select
                            key={fichas.map(f => f.id).join('-')}
                            value={newUser.ficha_id}
                            onChange={(e) => setNewUser({ ...newUser, ficha_id: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent bg-white text-slate-700 font-medium"
                          >
                            <option value="">{tr("Seleccionar Ficha", "Select Ficha")}</option>
                            {fichas.map(f => (
                              <option key={f.id} value={f.id}>{f.title || f.numero_ficha}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="md:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                    {tr("Estado", "Status")}
                  </label>
                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent bg-white text-slate-700 font-medium"
                  >
                    <option value="Active">{tr("Activo", "Active")}</option>
                    <option value="Inactive">{tr("Inactivo", "Inactive")}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="w-full sm:flex-1 px-5 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  {tr("Cancelar", "Cancel")}
                </button>
                <button
                  onClick={handleCreateOrUpdateUser}
                  className="w-full sm:flex-1 px-5 py-3 bg-[#4DA6FF] text-white rounded-xl font-bold hover:bg-[#3d95ef] transition-colors shadow-md text-sm"
                >
                  {isEditing ? tr("Guardar Cambios", "Save Changes") : tr("Crear Usuario", "Create User")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="flex flex-col items-center text-center mt-2 sm:mt-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                  <UserX size={30} />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {tr('Eliminar Usuario', 'Delete User')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 px-2">
                  {tr(
                    '¿Estás seguro de que deseas eliminar a este usuario de la plataforma? Esta acción no se puede deshacer y borrará permanentemente sus datos.',
                    'Are you sure you want to delete this user from the platform? This action cannot be undone and will permanently erase their data.'
                  )}
                </p>
                
                <div className="flex flex-col-reverse sm:flex-row w-full gap-2.5 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                    }}
                    className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                  >
                    {tr('Cancelar', 'Cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 text-sm"
                  >
                    {tr('Sí, eliminar', 'Yes, delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
