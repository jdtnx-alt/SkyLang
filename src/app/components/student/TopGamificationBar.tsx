import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Zap, Award, Volume2, VolumeX, Shield, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { soundEffects } from '../../utils/soundEffects';

interface TopGamificationBarProps {
  streak?: number;
  xp?: number;
  level?: number;
  levelProgress?: number;
  ficha?: string | number;
  program?: string;
  userName?: string;
}

export const TopGamificationBar: React.FC<TopGamificationBarProps> = ({
  streak: propStreak,
  xp: propXp,
  level: propLevel,
  levelProgress: propLevelProgress,
  ficha: propFicha,
  program: propProgram,
  userName
}) => {
  const [muted, setMuted] = useState(soundEffects.getMuted());
  const [autoData, setAutoData] = useState<{
    streak: number;
    xp: number;
    level: number;
    levelProgress: number;
    ficha: string | number;
    program: string;
  } | null>(null);

  useEffect(() => {
    // Si no se pasaron todas las props principales, consultamos el dashboard del aprendiz
    const needsFetch = propXp === undefined || propStreak === undefined || !propFicha;
    if (!needsFetch) return;

    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!stored || !token) return;

    try {
      const user = JSON.parse(stored);
      if (!user?.id) return;

      fetch(`/api/student/dashboard?studentId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            const lvl = data.levelInfo?.level || 1;
            const pointsInLvl = data.levelInfo?.pointsInCurrentLevel || 0;
            const nextLvl = data.levelInfo?.nextLevelPoints || 1000;
            const pct = Math.min(100, Math.round((pointsInLvl / (nextLvl - (lvl - 1) * 1000 || 1000)) * 100)) || Math.round((pointsInLvl / 1000) * 100);

            setAutoData({
              streak: data.diasActivos || 0,
              xp: data.levelInfo?.totalPoints || data.totalRewards || 0,
              level: lvl,
              levelProgress: pct,
              ficha: data.student?.numero_ficha || '3142784',
              program: data.student?.programa_nombre || 'Nursing English'
            });
          }
        })
        .catch(() => {});
    } catch (_) {}
  }, [propXp, propStreak, propFicha]);

  const streak = propStreak !== undefined ? propStreak : (autoData?.streak ?? 0);
  const xp = propXp !== undefined ? propXp : (autoData?.xp ?? 0);
  const level = propLevel !== undefined ? propLevel : (autoData?.level ?? 1);
  const levelProgress = propLevelProgress !== undefined ? propLevelProgress : (autoData?.levelProgress ?? 0);
  const ficha = propFicha !== undefined ? propFicha : (autoData?.ficha ?? '3142784');
  const rawProgram = propProgram !== undefined ? propProgram : (autoData?.program ?? 'Nursing English');
  const program = (() => {
    if (!rawProgram) return 'Technical Nursing English';
    const lower = rawProgram.toLowerCase();
    if (lower.includes('enfermer') || lower.includes('nursing')) {
      return 'Nursing - Technical English';
    }
    return rawProgram;
  })();

  const handleToggleMute = () => {
    const isMuted = soundEffects.toggleMute();
    setMuted(isMuted);
    if (!isMuted) soundEffects.playPop();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-100 pl-14 pr-3 sm:pl-4 sm:pr-4 lg:px-6 py-2.5 sm:py-3 shadow-xs lg:pl-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Program badge / Ficha */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border-2 border-sky-100 rounded-xl">
            <BookOpen size={16} className="text-sky-600" />
            <span className="text-xs font-black text-sky-800 uppercase tracking-wide">
              Cohort {ficha}
            </span>
          </div>
          <span className="hidden md:inline text-xs font-bold text-slate-500 truncate max-w-xs">
            {program}
          </span>
        </div>

        {/* Center / Right: Duolingo Gamification Stats */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* 🔥 Streak Counter */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => soundEffects.playPop()}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 cursor-pointer select-none group"
            title="Consecutive streak days"
          >
            <Flame
              size={18}
              className={`transition-colors ${
                streak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span
              className={`text-xs sm:text-sm font-black ${
                streak > 0 ? 'text-amber-700' : 'text-slate-500'
              }`}
            >
              {streak}
            </span>
          </motion.div>

          {/* 🍯 XP / Honey Points */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => soundEffects.playPop()}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border-2 border-sky-200 bg-sky-50 cursor-pointer select-none"
            title="Honey Points / Experience (XP)"
          >
            <Zap size={18} className="text-sky-500 fill-sky-500" />
            <span className="text-xs sm:text-sm font-black text-sky-700">
              {xp} <span className="text-[10px] font-bold uppercase text-sky-500">XP</span>
            </span>
          </motion.div>

          {/* 🎓 Apprentice Level */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-purple-200 bg-purple-50 select-none"
            title={`Level ${level} (${levelProgress}% completed)`}
          >
            <Award size={18} className="text-purple-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-purple-700 leading-none">
                Level {level}
              </span>
              <div className="w-12 h-1.5 bg-purple-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, levelProgress)}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* 🔊 Audio Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            title={muted ? 'Enable sound effects' : 'Mute sound effects'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-sky-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
