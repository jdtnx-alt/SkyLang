import { Sidebar } from "../../components/Sidebar";
import { Users, BookOpen, UserCheck, Activity } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
const userGrowthData = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 145 },
  { month: "Mar", users: 156 },
];

const activityData = [
  { day: "Mon", logins: 95 },
  { day: "Tue", logins: 102 },
  { day: "Wed", logins: 88 },
  { day: "Thu", logins: 110 },
  { day: "Fri", logins: 94 },
  { day: "Sat", logins: 45 },
  { day: "Sun", logins: 38 },
];

export function AdminDashboard() {
  const [dbStatus, setDbStatus] = useState({ status: 'Checking...', color: 'bg-yellow-500', textClass: 'text-yellow-600' });
  const [stats, setStats] = useState({
    totalUsers: 168,
    activeStudents: 156,
    activeRate: 93,
    totalRaps: 4,
    totalModules: 24,
    dailyActive: 94,
    usersByRole: { students: 156, instructors: 10, admins: 2 }
  });
  const [growthData, setGrowthData] = useState([
    { month: "Jan", users: 120 },
    { month: "Feb", users: 145 },
    { month: "Mar", users: 156 },
  ]);
  const [activityData, setActivityData] = useState([
    { day: "Mon", logins: 95 },
    { day: "Tue", logins: 102 },
    { day: "Wed", logins: 88 },
    { day: "Thu", logins: 110 },
    { day: "Fri", logins: 94 },
    { day: "Sat", logins: 45 },
    { day: "Sun", logins: 38 },
  ]);
  const [recentActivity, setRecentActivity] = useState([
    { text: "New user registered", time: "2 hours ago" },
    { text: "Module published", time: "5 hours ago" },
    { text: "System backup completed", time: "1 day ago" },
  ]);

  useEffect(() => {
    // 1. Fetch DB Status
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDbStatus({ status: 'Connected (PostgreSQL)', color: 'bg-green-600', textClass: 'text-green-600' });
        } else {
          setDbStatus({ status: 'Error DB', color: 'bg-red-600', textClass: 'text-red-600' });
        }
      })
      .catch(() => {
        setDbStatus({ status: 'Server Offline', color: 'bg-red-600', textClass: 'text-red-600' });
      });

    // 2. Fetch Dashboard Real Stats from DB
    const token = localStorage.getItem('token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch('/api/admin/dashboard', { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then(data => {
        setStats({
          totalUsers: data.totalUsers,
          activeStudents: data.activeStudents,
          activeRate: data.activeRate,
          totalRaps: data.totalRaps,
          totalModules: data.totalModules,
          dailyActive: data.dailyActive,
          usersByRole: data.usersByRole
        });
        if (data.userGrowthData && data.userGrowthData.length > 0) {
          setGrowthData(data.userGrowthData);
        }
        if (data.activityData && data.activityData.length > 0) {
          setActivityData(data.activityData);
        }
        if (data.recentActivity && data.recentActivity.length > 0) {
          setRecentActivity(data.recentActivity);
        }
      })
      .catch((err) => {
        console.warn('Usando datos de demostración en el dashboard (backend no disponible):', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and system statistics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-[#4DA6FF]" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-[#111111]">{stats.totalUsers}</p>
            <p className="text-sm text-green-600 mt-1">↑ 8% from last month</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="text-purple-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">Active Students</h3>
            <p className="text-3xl font-bold text-[#111111]">{stats.activeStudents}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.activeRate}% active rate</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="text-green-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">Total RAPS</h3>
            <p className="text-3xl font-bold text-[#111111]">{stats.totalRaps}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.totalModules} modules</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="text-orange-600" size={24} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-2">Daily Active</h3>
            <p className="text-3xl font-bold text-[#111111]">{stats.dailyActive}</p>
            <p className="text-sm text-green-600 mt-1">↑ 12% from yesterday</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">User Growth</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#4DA6FF" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Activity */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-[#111111] mb-4">Daily Activity</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="logins" fill="#4DA6FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-[#111111] mb-4">Users by Role</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700">Students</span>
                <span className="font-bold text-[#4DA6FF]">{stats.usersByRole.students}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-700">Instructors</span>
                <span className="font-bold text-purple-600">{stats.usersByRole.instructors}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-gray-700">Admins</span>
                <span className="font-bold text-orange-600">{stats.usersByRole.admins}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-[#111111] mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Server Status</span>
                <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className={`flex items-center gap-2 ${dbStatus.textClass} text-sm font-medium`}>
                  <span className={`w-2 h-2 ${dbStatus.color} rounded-full`}></span>
                  {dbStatus.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-800 text-sm font-medium">45% used</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-[#111111] mb-4">Recent Activity</h3>
            <div className="space-y-2 text-sm">
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <p className="text-gray-800">{activity.text}</p>
                  <p className="text-gray-500 text-xs">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
