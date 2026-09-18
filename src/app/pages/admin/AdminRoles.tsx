import { Sidebar } from "../../components/Sidebar";
import { Shield, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export function AdminRoles() {
  const { tr } = useLanguage();
  const [counts, setCounts] = useState({
    student: 156,
    instructor: 10,
    admin: 2
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch('/api/admin/roles', { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then(data => {
        setCounts({
          student: data.studentCount,
          instructor: data.instructorCount,
          admin: data.adminCount
        });
      })
      .catch(err => {
        console.warn('Usando datos de demostración para conteo de roles (backend no disponible):', err);
      });
  }, []);

  const roles = [
    {
      name: tr("Aprendiz", "Student"),
      description: tr("Aprendiz regular con acceso a RAPS y módulos", "Regular learner with access to RAPS and modules"),
      userCount: counts.student,
      permissions: [
        tr("Ver RAPS asignados", "View assigned RAPS"),
        tr("Completar módulos", "Complete modules"),
        tr("Realizar cuestionarios", "Take quizzes"),
        tr("Ver progreso", "View progress"),
        tr("Ganar recompensas", "Earn rewards"),
        tr("Editar perfil", "Edit profile"),
      ],
      color: "from-blue-400 to-blue-600",
    },
    {
      name: tr("Instructor", "Instructor"),
      description: tr("Creador de cursos y gestor de aprendices", "Course creator and student manager"),
      userCount: counts.instructor,
      permissions: [
        tr("Crear y editar RAPS", "Create and edit RAPS"),
        tr("Crear y editar módulos", "Create and edit modules"),
        tr("Ver resultados de aprendices", "View student results"),
        tr("Generar reportes", "Generate reports"),
        tr("Asignar módulos", "Assign modules"),
        tr("Calificar evaluaciones", "Grade assessments"),
      ],
      color: "from-purple-400 to-purple-600",
    },
    {
      name: tr("Administrador", "Admin"),
      description: tr("Acceso y control total de la plataforma", "Full platform access and control"),
      userCount: counts.admin,
      permissions: [
        tr("Gestionar todos los usuarios", "Manage all users"),
        tr("Gestionar roles", "Manage roles"),
        tr("Ver todo el contenido", "View all content"),
        tr("Configuración del sistema", "System settings"),
        tr("Analíticas de la plataforma", "Platform analytics"),
        tr("Control total del contenido", "Full content control"),
      ],
      color: "from-orange-400 to-orange-600",
    },
  ];

  const permissionRows = [
    { permission: tr("Ver Contenido", "View Content"), student: true, instructor: true, admin: true },
    { permission: tr("Crear RAPS", "Create RAPS"), student: false, instructor: true, admin: true },
    { permission: tr("Gestionar Usuarios", "Manage Users"), student: false, instructor: false, admin: true },
    { permission: tr("Ver Reportes", "View Reports"), student: false, instructor: true, admin: true },
    { permission: tr("Configuración del Sistema", "System Settings"), student: false, instructor: false, admin: true },
    { permission: tr("Editar Perfil", "Edit Profile"), student: true, instructor: true, admin: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-16 sm:pt-6 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Gestionar Roles", "Manage Roles")}</h1>
          <p className="text-gray-600">{tr("Ver y configurar los permisos de roles de usuario", "View and configure user role permissions")}</p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {roles.map((role, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Header */}
              <div className={`h-32 bg-gradient-to-r ${role.color} p-6 text-white`}>
                <Shield size={32} className="mb-2" />
                <h3 className="text-2xl font-bold">{role.name}</h3>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">{role.description}</p>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{tr("Total de Usuarios", "Total Users")}</span>
                    <span className="text-lg font-bold text-[#111111]">{role.userCount}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-3">{tr("Permisos", "Permissions")}</h4>
                  <ul className="space-y-2">
                    {role.permissions.map((permission, pIndex) => (
                      <li key={pIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-gray-700">{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Role Comparison */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#111111] mb-6">{tr("Comparación de Permisos", "Permission Comparison")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Permiso", "Permission")}</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">{tr("Aprendiz", "Student")}</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">{tr("Instructor", "Instructor")}</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">{tr("Administrador", "Admin")}</th>
                </tr>
              </thead>
              <tbody>
                {permissionRows.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-800">{row.permission}</td>
                    <td className="py-3 px-4 text-center">
                      {row.student ? (
                        <CheckCircle2 className="inline text-green-600" size={20} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.instructor ? (
                        <CheckCircle2 className="inline text-green-600" size={20} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.admin ? (
                        <CheckCircle2 className="inline text-green-600" size={20} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
