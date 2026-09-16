import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Sidebar } from "../../components/Sidebar";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  Calendar, 
  User as UserIcon, 
  Layout,
  Activity,
  CheckCircle2,
  Clock
} from "lucide-react";

export function AdminCourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [courseData, setCourseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(`/api/admin/courses/${id}/details`, { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch details");
        return res.json();
      })
      .then(data => {
        setCourseData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role="admin" />
        <div className="ml-64 flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#4DA6FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!courseData || !courseData.course) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar role="admin" />
        <div className="ml-64 p-8">
          <button onClick={() => navigate('/admin/programs')} className="flex items-center text-gray-600 hover:text-[#4DA6FF] mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a programas
          </button>
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800">Course not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const { course, students, curriculum } = courseData;

  const tabs = [
    { id: "overview", label: "Overview", icon: Layout },
    { id: "students", label: "Enrolled Students", icon: Users },
    { id: "curriculum", label: "Curriculum", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <button
            onClick={() => navigate(course.program_id ? `/admin/programs/${course.program_id}` : '/admin/programs')}
            className="flex items-center text-sm text-gray-500 hover:text-[#4DA6FF] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al programa
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[#111111]">Ficha: {course.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  course.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {course.status}
                </span>
              </div>
              <p className="text-lg text-gray-600 mb-4">{course.program_name}</p>
              
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Instructor: {course.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{course.startDate} to {course.endDate}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-blue-50 text-blue-700 px-6 py-4 rounded-xl text-center">
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-sm font-medium">Students</div>
              </div>
              <div className="bg-purple-50 text-purple-700 px-6 py-4 rounded-xl text-center">
                <div className="text-2xl font-bold">{curriculum.length}</div>
                <div className="text-sm font-medium">RAPs</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 mt-8 -mb-6 border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'border-[#4DA6FF] text-[#4DA6FF]' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Course Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {course.description || "No description provided for this course."}
                </p>
                
                <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active Students</p>
                      <p className="text-xl font-bold text-gray-800">
                        {students.filter((s:any) => s.status === 'Active').length}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Activities</p>
                      <p className="text-xl font-bold text-gray-800">12</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Instructor details</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4DA6FF] text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {course.instructor.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{course.instructor}</p>
                      <p className="text-sm text-gray-500">Main Facilitator</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Student Name</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Enrollment Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student: any) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6 font-medium text-gray-800">{student.name}</td>
                      <td className="py-4 px-6 text-gray-600">{student.email}</td>
                      <td className="py-4 px-6 text-gray-500">{student.joinDate}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">No students enrolled in this course yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Curriculum Tab */}
          {activeTab === "curriculum" && (
            <div className="space-y-4">
              {curriculum.map((rap: any) => (
                <div key={rap.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{rap.title}</h3>
                      <p className="text-sm text-gray-500">RAP {rap.orden}</p>
                    </div>
                  </div>
                  
                  <div className="pl-14 space-y-3">
                    {rap.modules && rap.modules.length > 0 ? (
                      rap.modules.map((mod: any) => (
                        <div key={mod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-3">
                            <Activity className="text-gray-400 w-4 h-4" />
                            <span className="font-medium text-gray-700">{mod.title}</span>
                          </div>
                          {mod.fase && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {mod.fase}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic">No modules assigned to this RAP yet.</p>
                    )}
                  </div>
                </div>
              ))}
              {curriculum.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500">
                  This program has no curriculum defined.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
