import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Sidebar } from "../../components/Sidebar";
import { TopGamificationBar } from "../../components/student/TopGamificationBar";
import { PageTransition } from "../../components/PageTransition";
import { BeeMascot } from "../../components/BeeMascot";
import {
  BookOpen,
  Award,
  Zap,
  Flame,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  Target,
  Trophy,
  Star,
  Check
} from "lucide-react";
import { motion } from "motion/react";
import { soundEffects } from "../../utils/soundEffects";

export function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; nombre: string; correo: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      fetch(`/api/student/dashboard?studentId=${parsedUser.id}`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setDashboardData(data);
          }
        })
        .catch((err) => console.error("Error fetching dashboard:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-4">
        <BeeMascot size="lg" mood="thinking" animate message="Loading your learning path..." />
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const studentInfo = dashboardData?.student || {};
  const levelInfo = dashboardData?.levelInfo || { level: 1, pointsInCurrentLevel: 0, nextLevelPoints: 1000, totalPoints: 0 };
  const overallProgress = dashboardData?.progress || 0;
  const currentRap = dashboardData?.currentRap || {};
  const recentModules = dashboardData?.recentModules || [];
  const streak = dashboardData?.diasActivos || 0;

  const xpProgressPercent = Math.min(
    100,
    Math.round((levelInfo.pointsInCurrentLevel / (levelInfo.nextLevelPoints || 1000)) * 100)
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />

        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar
            streak={streak}
            xp={levelInfo.totalPoints}
            level={levelInfo.level}
            levelProgress={xpProgressPercent}
            ficha={studentInfo.numero_ficha || "3142784"}
            program={studentInfo.programa_nombre || "Nursing English"}
            userName={user?.nombre}
          />

          <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Learning Stream */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 rounded-3xl p-6 sm:p-8 text-slate-950 border-b-4 border-amber-600 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6"
              >
                <div className="space-y-3 z-10 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/40 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-amber-950">
                    <Flame size={14} className="text-amber-800" /> {streak} day active streak
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Welcome, {user?.nombre ? user.nombre.split(" ")[0] : "Student"}
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-amber-950/80 max-w-md">
                    Your daily goal is ready. Continue your clinical English training and level up.
                  </p>
                </div>

                <div className="shrink-0 z-10">
                  <BeeMascot
                    size="lg"
                    mood="cheering"
                    animate
                    onClick={() => soundEffects.playCelebration()}
                  />
                </div>
              </motion.div>

              {/* Continue Active Module */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl border-2 border-slate-200 border-b-4 p-6 shadow-xs space-y-5"
              >
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-black">
                      <Target size={18} />
                    </div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      Continue Learning
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                    Next Lesson
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-sky-50/60 border-2 border-sky-200 rounded-2xl p-5">
                  <div className="space-y-1.5 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-white px-2.5 py-0.5 rounded-md border border-sky-200">
                      Current Module
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {currentRap.moduleTitle || "MODULE 1: GETTING TO KNOW OTHER PEOPLE"}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600">
                      Current outcome: <strong>{currentRap.rapTitle || "RAP 1"}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      soundEffects.playPop();
                      if (currentRap.moduleId) {
                        navigate(`/student/modules/${currentRap.moduleId}`);
                      } else {
                        navigate(`/student/modules`);
                      }
                    }}
                    className="btn-duo-3d btn-duo-sky px-6 py-3 text-xs shrink-0 flex items-center justify-center gap-2"
                  >
                    <span>Enter Lesson</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>

              {/* Modules List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BookOpen size={20} className="text-sky-600" /> Program Units
                  </h2>
                  <button
                    onClick={() => {
                      soundEffects.playPop();
                      navigate("/student/modules");
                    }}
                    className="text-xs font-black uppercase tracking-wider text-sky-600 hover:text-sky-800"
                  >
                    View all units
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentModules.map((mod: any, idx: number) => {
                    const isModCompleted = mod.completed || mod.progress === 100;
                    return (
                      <motion.div
                        key={mod.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          soundEffects.playPop();
                          navigate(`/student/modules/${mod.id}`);
                        }}
                        className={`p-5 rounded-3xl border-2 border-b-4 cursor-pointer transition-all flex flex-col justify-between space-y-4 bg-white ${
                          isModCompleted
                            ? 'border-emerald-300 border-b-emerald-500 hover:bg-emerald-50/30'
                            : 'border-slate-200 border-b-slate-300 hover:border-sky-300 hover:bg-sky-50/20'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                              {mod.fase || `Unit ${idx + 1}`}
                            </span>
                            {isModCompleted ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full flex items-center gap-1">
                                <Check size={12} strokeWidth={3} /> Completed
                              </span>
                            ) : (
                              <span className="text-xs font-black text-slate-400">
                                {mod.progress || 0}%
                              </span>
                            )}
                          </div>

                          <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2">
                            {mod.title}
                          </h3>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isModCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${mod.progress || 0}%` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar Widgets */}
            <div className="space-y-6">
              {/* Daily Quests */}
              <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-4 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" /> Daily Quests
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Today</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Earn 30 Honey XP</span>
                      <span className="text-amber-600 font-black">{Math.min(30, levelInfo.pointsInCurrentLevel)}/30</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (levelInfo.pointsInCurrentLevel / 30) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Complete 1 Activity</span>
                      <span className="text-sky-600 font-black">1/1</span>
                    </div>
                    <div className="w-full bg-sky-200/60 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Card */}
              <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50 rounded-3xl border-2 border-sky-200 border-b-4 p-6 shadow-xs space-y-3 text-center">
                <BeeMascot
                  size="md"
                  mood="happy"
                  animate
                  message="Practicing 10 minutes a day helps lock in clinical vocabulary forever."
                  messagePosition="bottom"
                />
              </div>

              {/* Summary Stats */}
              <div className="bg-white rounded-3xl border-2 border-slate-200 border-b-4 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp size={18} className="text-sky-600" /> Achievement Summary
                </h3>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Current Level</span>
                    <span className="text-xl font-black text-purple-600">Level {levelInfo.level}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Overall Progress</span>
                    <span className="text-xl font-black text-emerald-600">{overallProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}