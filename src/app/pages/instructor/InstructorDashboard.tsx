import React from "react";
import { Sidebar } from "../../components/Sidebar";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, BookOpen, TrendingUp, Award } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = ["#4DA6FF", "#22c55e", "#9333ea", "#f97316"];

export function InstructorDashboard() {
  const { tr } = useLanguage();
  const [metrics, setMetrics] = React.useState({ totalStudents: 0, totalModules: 0, totalRaps: 0 });
  const [currentInstructor, setCurrentInstructor] = React.useState("");

  const studentProgressData = [
    { name: tr("Semana 1", "Week 1"), students: 45 },
    { name: tr("Semana 2", "Week 2"), students: 52 },
    { name: tr("Semana 3", "Week 3"), students: 48 },
    { name: tr("Semana 4", "Week 4"), students: 60 },
  ];

  const rapCompletionData = [
    { name: "RAP 1", value: 85 },
    { name: "RAP 2", value: 60 },
    { name: "RAP 3", value: 30 },
    { name: "RAP 4", value: 10 },
  ];

  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.nombre) {
          setCurrentInstructor(user.nombre);
        }
      }
    } catch (e) {
      console.error("Error loading user from localStorage", e);
    }
  }, []);

  React.useEffect(() => {
    const url = currentInstructor ? `/api/instructor/dashboard?instructor=${encodeURIComponent(currentInstructor)}` : '/api/instructor/dashboard';
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(url, { headers: authHeaders })
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Failed to load dashboard metrics', err));
  }, [currentInstructor]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="instructor" />
      
      <div className="ml-64 p-8">
          
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Panel del Instructor", "Instructor Dashboard")}</h1>
          <p className="text-gray-600">{tr("Resumen del rendimiento de aprendices y analíticas del curso", "Overview of student performance and course analytics")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-[#4DA6FF]" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">{tr("Total Aprendices", "Total Students")}</h3>
            <p className="text-3xl font-bold text-[#111111]">{metrics.totalStudents}</p>
            <p className="text-sm text-green-600 mt-1">{tr("↑ 12% desde el mes pasado", "↑ 12% from last month")}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="text-purple-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">{tr("Módulos Activos", "Active Modules")}</h3>
            <p className="text-3xl font-bold text-[#111111]">{metrics.totalModules}</p>
            <p className="text-sm text-gray-500 mt-1">{tr(`A lo largo de ${metrics.totalRaps} RAPs`, `Across ${metrics.totalRaps} RAPS`)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">{tr("Tasa Promedio de Finalización", "Avg Completion Rate")}</h3>
            <p className="text-3xl font-bold text-[#111111]">78%</p>
            <p className="text-sm text-green-600 mt-1">{tr("↑ 5% desde el mes pasado", "↑ 5% from last month")}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="text-yellow-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">{tr("Puntaje Promedio de Aprendiz", "Avg Student Score")}</h3>
            <p className="text-3xl font-bold text-[#111111]">87%</p>
            <p className="text-sm text-green-600 mt-1">{tr("↑ 3% desde el mes pasado", "↑ 3% from last month")}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Student Engagement */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Participación de Aprendices", "Student Engagement")}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={studentProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="students" stroke="#4DA6FF" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RAP Completion Rates */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Tasas de Finalización de RAPs", "RAP Completion Rates")}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={rapCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rapCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Student Activity */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Actividad Reciente de Aprendices", "Recent Student Activity")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Aprendiz", "Student")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Actividad", "Activity")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">RAP</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Puntaje", "Score")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Fecha", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Maria Garcia", activity: tr("Completó Módulo 3", "Completed Module 3"), rap: "RAP 2", score: "95%", date: tr("Hace 2 horas", "2 hours ago") },
                  { name: "John Smith", activity: tr("Inició Módulo 5", "Started Module 5"), rap: "RAP 1", score: "N/A", date: tr("Hace 3 horas", "3 hours ago") },
                  { name: "Ana Lopez", activity: tr("Completó Cuestionario", "Completed Quiz"), rap: "RAP 2", score: "88%", date: tr("Hace 5 horas", "5 hours ago") },
                  { name: "Carlos Ruiz", activity: tr("Completó Módulo 2", "Completed Module 2"), rap: "RAP 1", score: "92%", date: tr("Hace 1 día", "1 day ago") },
                ].map((student, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{student.name}</td>
                    <td className="py-3 px-4 text-gray-600">{student.activity}</td>
                    <td className="py-3 px-4 text-gray-600">{student.rap}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.score === "N/A" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                      }`}>
                        {student.score}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{student.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Mejores Desempeños Este Mes", "Top Performers This Month")}</h2>
          <div className="space-y-3">
            {[
              { name: "Maria Garcia", score: 98, modules: 15 },
              { name: "Ana Lopez", score: 96, modules: 14 },
              { name: "Carlos Ruiz", score: 94, modules: 13 },
            ].map((student, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#111111]">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.modules} {tr("módulos completados", "modules completed")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#4DA6FF]">{student.score}%</p>
                  <p className="text-xs text-gray-500">{tr("puntaje prom.", "avg score")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
