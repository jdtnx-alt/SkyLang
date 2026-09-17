import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sidebar } from '../../components/Sidebar';
import { TopGamificationBar } from '../../components/student/TopGamificationBar';
import { PageTransition } from '../../components/PageTransition';
import { BeeMascot } from '../../components/BeeMascot';
import { BookOpen, Lock, ArrowRight, Check, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { soundEffects } from '../../utils/soundEffects';

export function StudentModulesPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const token = localStorage.getItem('token');

    if (!user?.id || !token) {
      navigate('/');
      return;
    }

    fetch(`/api/student/modules?studentId=${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setModules(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching modules:', err))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />

        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar />

          <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-sky-600">
                  Curriculum
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  Training Modules
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                  Select a unit to unlock lessons and interactive exercises.
                </p>
              </div>

              <BeeMascot size="sm" mood="cheering" animate />
            </div>

            {loading ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">Loading modules...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((mod, index) => {
                  const isCompleted = mod.progress === 100 || mod.completed;
                  const isLocked = mod.locked;

                  // Duolingo unit colors
                  const unitColorSchemes = [
                    { border: 'border-sky-300 border-b-sky-500', bg: 'from-sky-500 to-blue-600', pill: 'bg-sky-50 text-sky-700' },
                    { border: 'border-amber-300 border-b-amber-500', bg: 'from-amber-400 to-amber-500', pill: 'bg-amber-50 text-amber-800' },
                    { border: 'border-emerald-300 border-b-emerald-500', bg: 'from-emerald-500 to-teal-600', pill: 'bg-emerald-50 text-emerald-700' },
                    { border: 'border-purple-300 border-b-purple-500', bg: 'from-purple-500 to-indigo-600', pill: 'bg-purple-50 text-purple-700' },
                  ];
                  const scheme = unitColorSchemes[index % unitColorSchemes.length];

                  return (
                    <motion.div
                      key={mod.id}
                      whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => {
                        if (!isLocked) {
                          soundEffects.playPop();
                          navigate(`/student/modules/${mod.id}`);
                        } else {
                          soundEffects.playIncorrect();
                        }
                      }}
                      className={`rounded-3xl border-2 border-b-6 p-6 transition-all flex flex-col justify-between space-y-5 bg-white ${
                        isLocked
                          ? 'border-slate-200 border-b-slate-300 opacity-60 cursor-not-allowed'
                          : isCompleted
                          ? 'border-emerald-300 border-b-emerald-500 cursor-pointer shadow-xs hover:shadow-md'
                          : `${scheme.border} cursor-pointer shadow-xs hover:shadow-md`
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${scheme.pill}`}>
                            {(() => {
                              const f = (mod.fase || '').toLowerCase();
                              if (f.includes('análisis') || f.includes('analisis')) return 'Analysis Phase';
                              if (f.includes('planeación') || f.includes('planeacion')) return 'Planning Phase';
                              if (f.includes('ejecución') || f.includes('ejecucion')) return 'Execution Phase';
                              if (f.includes('evaluación') || f.includes('evaluacion')) return 'Evaluation Phase';
                              return mod.fase || `Unit ${index + 1}`;
                            })()}
                          </span>

                          {isCompleted ? (
                            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <Check size={14} strokeWidth={3} /> Completed
                            </span>
                          ) : isLocked ? (
                            <Lock size={18} className="text-slate-400" />
                          ) : (
                            <span className="text-xs font-black text-slate-600">
                              {mod.progress || 0}%
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-black text-slate-900 leading-snug">
                          {mod.title}
                        </h2>
                      </div>

                      <div className="space-y-4">
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${mod.progress || 0}%` }}
                          />
                        </div>

                        <button
                          disabled={isLocked}
                          className={`btn-duo-3d w-full py-3 text-xs flex items-center justify-center gap-2 ${
                            isLocked
                              ? 'btn-duo-white opacity-50'
                              : isCompleted
                              ? 'btn-duo-emerald'
                              : 'btn-duo-sky'
                          }`}
                        >
                          <span>{isCompleted ? 'Review Unit' : isLocked ? 'Locked' : 'Continue Unit'}</span>
                          {!isLocked && <ArrowRight size={16} />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
