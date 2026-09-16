import { Sidebar } from "../../components/Sidebar";
import { Shield, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminRoles() {
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
      name: "Student",
      description: "Regular learner with access to RAPS and modules",
      userCount: counts.student,
      permissions: [
        "View assigned RAPS",
        "Complete modules",
        "Take quizzes",
        "View progress",
        "Earn rewards",
        "Edit profile",
      ],
      color: "from-blue-400 to-blue-600",
    },
    {
      name: "Instructor",
      description: "Course creator and student manager",
      userCount: counts.instructor,
      permissions: [
        "Create and edit RAPS",
        "Create and edit modules",
        "View student results",
        "Generate reports",
        "Assign modules",
        "Grade assessments",
      ],
      color: "from-purple-400 to-purple-600",
    },
    {
      name: "Admin",
      description: "Full platform access and control",
      userCount: counts.admin,
      permissions: [
        "Manage all users",
        "Manage roles",
        "View all content",
        "System settings",
        "Platform analytics",
        "Full content control",
      ],
      color: "from-orange-400 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">Manage Roles</h1>
          <p className="text-gray-600">View and configure user role permissions</p>
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
                    <span className="text-sm text-gray-600">Total Users</span>
                    <span className="text-lg font-bold text-[#111111]">{role.userCount}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Permissions</h4>
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
          <h2 className="text-xl font-bold text-[#111111] mb-6">Permission Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Permission</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Instructor</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Admin</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { permission: "View Content", student: true, instructor: true, admin: true },
                  { permission: "Create RAPS", student: false, instructor: true, admin: true },
                  { permission: "Manage Users", student: false, instructor: false, admin: true },
                  { permission: "View Reports", student: false, instructor: true, admin: true },
                  { permission: "System Settings", student: false, instructor: false, admin: true },
                  { permission: "Edit Profile", student: true, instructor: true, admin: true },
                ].map((row, index) => (
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
