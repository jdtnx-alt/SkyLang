import { Sidebar } from "../../components/Sidebar";
import { BookOpen, FileText, Video, Headphones, Image } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export function AdminContent() {
  const { tr } = useLanguage();
  const [stats, setStats] = useState({
    contentStats: [
      { type: "RAPS", count: 4, icon: BookOpen, color: "from-blue-400 to-blue-600" },
      { type: "Modules", count: 24, icon: FileText, color: "from-purple-400 to-purple-600" },
      { type: "Videos", count: 48, icon: Video, color: "from-green-400 to-green-600" },
      { type: "Audio Files", count: 156, icon: Headphones, color: "from-orange-400 to-orange-600" },
      { type: "Images", count: 234, icon: Image, color: "from-pink-400 to-pink-600" },
    ],
    programsOverview: [
      { name: "ADSO", raps: 6, modules: 24, status: "Active" },
      { name: "Nursing", raps: 6, modules: 24, status: "Active" },
    ],
    storageUsage: {
      totalUsed: 4.5,
      totalLimit: 10,
      percentage: 45,
      videos: "2.1 GB",
      audio: "1.2 GB",
      images: "850 MB",
      documents: "350 MB"
    },
    recentContent: [
      { title: "Module: Emergency Procedures", type: "Module", author: "Dr. Sarah Johnson", date: "March 10, 2026", status: "Published" },
      { title: "Video: Patient Communication", type: "Video", author: "Dr. Sarah Johnson", date: "March 8, 2026", status: "Published" },
      { title: "RAP 5: Pediatric Care", type: "RAP", author: "Dr. Michael Brown", date: "March 5, 2026", status: "Draft" },
      { title: "Audio: Medical Terms Pronunciation", type: "Audio", author: "Dr. Sarah Johnson", date: "March 3, 2026", status: "Published" },
    ]
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch('/api/admin/content', { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then(data => {
        const iconMapping = {
          "RAPS": BookOpen,
          "Modules": FileText,
          "Videos": Video,
          "Audio Files": Headphones,
          "Images": Image
        };
        const colorMapping = {
          "RAPS": "from-blue-400 to-blue-600",
          "Modules": "from-purple-400 to-purple-600",
          "Videos": "from-green-400 to-green-600",
          "Audio Files": "from-orange-400 to-orange-600",
          "Images": "from-pink-400 to-pink-600"
        };

        const contentStatsMapped = data.contentStats.map(stat => ({
          type: stat.type,
          count: stat.count,
          icon: iconMapping[stat.type] || BookOpen,
          color: colorMapping[stat.type] || "from-blue-400 to-blue-600"
        }));

        setStats({
          contentStats: contentStatsMapped,
          programsOverview: data.programsOverview || [],
          storageUsage: data.storageUsage,
          recentContent: data.recentContent
        });
      })
      .catch(err => {
        console.warn('Usando datos de demostración en contenido (backend no disponible):', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">{tr("Gestión de Contenido", "Content Management")}</h1>
          <p className="text-gray-600">{tr("Administra el contenido y recursos de la plataforma", "Manage platform content and resources")}</p>
        </div>

        {/* Content Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.contentStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-md p-6 text-white`}>
                <Icon className="mb-3" size={28} />
                <p className="text-sm opacity-90 mb-1">
                  {stat.type === "RAPS" ? "RAPS" :
                   stat.type === "Modules" ? tr("Módulos", "Modules") :
                   stat.type === "Videos" ? tr("Videos", "Videos") :
                   stat.type === "Audio Files" ? tr("Archivos de Audio", "Audio Files") :
                   stat.type === "Images" ? tr("Imágenes", "Images") : stat.type}
                </p>
                <p className="text-3xl font-bold">{stat.count}</p>
              </div>
            );
          })}
        </div>

        {/* Content Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Programs Overview */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Resumen de Programas", "Programs Overview")}</h2>
            <div className="space-y-3">
              {stats.programsOverview.map((prog, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-800">{prog.name}</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {prog.status === "Active" ? tr("Activo", "Active") : prog.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{prog.raps} RAPs • {prog.modules} {tr("Módulos", "Modules")}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Usage */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Uso del Almacenamiento", "Storage Usage")}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{tr("Almacenamiento Total", "Total Storage")}</span>
                  <span className="text-sm font-medium text-gray-700">{stats.storageUsage.totalUsed} MB / {stats.storageUsage.totalLimit} GB</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#4DA6FF] rounded-full" style={{ width: `${stats.storageUsage.percentage}%` }} />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{tr("Videos", "Videos")}</span>
                  <span className="font-medium text-gray-700">{stats.storageUsage.videos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{tr("Archivos de Audio", "Audio Files")}</span>
                  <span className="font-medium text-gray-700">{stats.storageUsage.audio}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{tr("Imágenes", "Images")}</span>
                  <span className="font-medium text-gray-700">{stats.storageUsage.images}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{tr("Documentos", "Documents")}</span>
                  <span className="font-medium text-gray-700">{stats.storageUsage.documents}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Content */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-[#111111] mb-4">{tr("Contenido Reciente", "Recent Content")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Título", "Title")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Tipo", "Type")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Autor", "Author")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Fecha", "Date")}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{tr("Estado", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentContent.map((content, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{content.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {content.type === "Module" ? tr("Módulo", "Module") :
                         content.type === "Video" ? tr("Video", "Video") :
                         content.type === "RAP" ? "RAP" :
                         content.type === "Audio" ? tr("Audio", "Audio") : content.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{content.author}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{content.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          content.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {content.status === "Published" ? tr("Publicado", "Published") : tr("Borrador", "Draft")}
                      </span>
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
