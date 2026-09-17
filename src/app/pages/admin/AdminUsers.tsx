import { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Plus, Edit2, Trash2, Search, UserX, UserCheck } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Gestión de Usuarios", "Manage Users")}</h1>
            <p className="text-gray-600">{tr("Crea, edita y administra los usuarios de la plataforma", "Create, edit, and manage platform users")}</p>
          </div>
          <button
            onClick={() => {
              setIsEditing(false);
              setNewUser({ name: "", email: "", role: "Student", status: "Active", password: "", programa_id: "", ficha_id: "", idNumber: "" });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[#4DA6FF] text-white rounded-lg font-medium hover:bg-[#3d95ef] transition-colors shadow-lg"
          >
            <Plus size={20} />
            {tr("Agregar Nuevo Usuario", "Add New User")}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            >
              <option>All Roles</option>
              <option>Student</option>
              <option>Instructor</option>
              <option>Admin</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Email</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Role</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Join Date</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-800">{user.name}</td>
                  <td className="py-4 px-6 text-gray-600">{user.email}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === "Admin"
                          ? "bg-orange-100 text-orange-700"
                          : user.role === "Instructor"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`flex items-center gap-2 w-fit px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status === "Active" ? (
                        <UserCheck size={14} />
                      ) : (
                        <UserX size={14} />
                      )}
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">{user.joinDate}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="text-[#4DA6FF]" size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="text-red-600" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 font-medium">
                    No users found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create / Edit User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-[#111111] mb-6">
                {isEditing ? "Edit User" : "Add New User"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Identification Number</label>
                  <input
                    type="text"
                    value={newUser.idNumber}
                    onChange={(e) => setNewUser({ ...newUser, idNumber: e.target.value })}
                    placeholder="123456789"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEditing ? "Password (leave blank to keep current)" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder={isEditing ? "••••••••" : "Contraseña (mínimo 8 caracteres)"}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  >
                    <option>Student</option>
                    <option>Instructor</option>
                    <option>Admin</option>
                  </select>
                </div>


                {newUser.role === "Student" && (
                  <>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                      <select
                        value={newUser.programa_id}
                        onChange={(e) => setNewUser({ ...newUser, programa_id: e.target.value, ficha_id: "" })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                      >
                        <option value="">Select Program</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {newUser.programa_id && (
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ficha <span className="text-gray-400 font-normal">(una por aprendiz)</span>
                        </label>
                        {fichasCargando ? (
                          <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-400">
                            Cargando fichas…
                          </div>
                        ) : (
                          <select
                            // La clave depende de las opciones: al llegar la lista el
                            // select se vuelve a montar y respeta el valor elegido.
                            key={fichas.map(f => f.id).join('-')}
                            value={newUser.ficha_id}
                            onChange={(e) => setNewUser({ ...newUser, ficha_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                          >
                            <option value="">Select Ficha</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4DA6FF] focus:border-transparent"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setEditingId(null);
                    setNewUser({ name: "", email: "", role: "Student", status: "Active", password: "", programa_id: "", ficha_id: "", idNumber: "" });
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdateUser}
                  className="flex-1 px-6 py-3 bg-[#4DA6FF] text-white rounded-lg font-medium hover:bg-[#3d95ef] transition-colors"
                >
                  {isEditing ? "Save Changes" : "Create User"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              
              <div className="flex flex-col items-center text-center mt-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <UserX size={32} />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tr('Eliminar Usuario', 'Delete User')}</h3>
                <p className="text-gray-600 mb-8 px-4">
                  {tr(
                    '¿Estás seguro de que deseas eliminar a este usuario de la plataforma? Esta acción no se puede deshacer y borrará permanentemente sus datos.',
                    'Are you sure you want to delete this user from the platform? This action cannot be undone and will permanently erase their data.'
                  )}
                </p>
                
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    {tr('Cancelar', 'Cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
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
