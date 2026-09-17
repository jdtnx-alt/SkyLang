import React from 'react';
import { Link, useLocation } from 'react-router';
import { 
  Compass, 
  BookOpen, 
  TrendingUp, 
  User, 
  LogOut, 
  Users, 
  Settings, 
  GraduationCap, 
  Sparkles,
  Award,
  Languages
} from 'lucide-react';
import { motion } from 'motion/react';
import { soundEffects } from '../utils/soundEffects';
import { useLanguage } from '../context/LanguageContext';

interface NavItem {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  role: 'student' | 'instructor' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const location = useLocation();
  const { language, setLanguage, tr } = useLanguage();

  const studentNavItems: NavItem[] = [
    { label: 'LEARN', sublabel: 'Study path', icon: <Compass size={22} />, path: '/student' },
    { label: 'MODULES', sublabel: 'Phases & units', icon: <BookOpen size={22} />, path: '/student/modules' },
    { label: 'PROGRESS', sublabel: 'Statistics', icon: <TrendingUp size={22} />, path: '/student/progress' },
    { label: 'ACHIEVEMENTS', sublabel: 'Badges & medals', icon: <Award size={22} />, path: '/student/badges' },
    { label: 'PROFILE', sublabel: 'My account', icon: <User size={22} />, path: '/student/profile' },
  ];

  const instructorNavItems: NavItem[] = language === 'es' ? [
    { label: 'PANEL', sublabel: 'Resumen instructor', icon: <Compass size={22} />, path: '/instructor' },
    { label: 'APRENDICES', sublabel: 'Lista de estudiantes', icon: <Users size={22} />, path: '/instructor/students' },
    { label: 'PROGRAMAS', sublabel: 'Fichas y grupos', icon: <BookOpen size={22} />, path: '/instructor/programs' },
    { label: 'GESTIÓN RAPs', sublabel: 'Momentos y módulos', icon: <GraduationCap size={22} />, path: '/instructor/modules' },
  ] : [
    { label: 'DASHBOARD', sublabel: 'Instructor overview', icon: <Compass size={22} />, path: '/instructor' },
    { label: 'STUDENTS', sublabel: 'Student directory', icon: <Users size={22} />, path: '/instructor/students' },
    { label: 'PROGRAMS', sublabel: 'Classes & groups', icon: <BookOpen size={22} />, path: '/instructor/programs' },
    { label: 'RAP MANAGEMENT', sublabel: 'Moments & modules', icon: <GraduationCap size={22} />, path: '/instructor/modules' },
  ];

  const adminNavItems: NavItem[] = language === 'es' ? [
    { label: 'PANEL ADMIN', sublabel: 'Control general', icon: <Compass size={22} />, path: '/admin' },
    { label: 'PROGRAMAS', sublabel: 'Gestión académica', icon: <BookOpen size={22} />, path: '/admin/programs' },
    { label: 'USUARIOS', sublabel: 'Cuentas y roles', icon: <Users size={22} />, path: '/admin/users' },
    { label: 'ROLES', sublabel: 'Permisos', icon: <Settings size={22} />, path: '/admin/roles' },
  ] : [
    { label: 'ADMIN DASHBOARD', sublabel: 'System overview', icon: <Compass size={22} />, path: '/admin' },
    { label: 'PROGRAMS', sublabel: 'Academic management', icon: <BookOpen size={22} />, path: '/admin/programs' },
    { label: 'USERS', sublabel: 'Accounts & roles', icon: <Users size={22} />, path: '/admin/users' },
    { label: 'ROLES', sublabel: 'Permissions', icon: <Settings size={22} />, path: '/admin/roles' },
  ];

  const navItems =
    role === 'student'
      ? studentNavItems
      : role === 'instructor'
      ? instructorNavItems
      : adminNavItems;

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Compute formatted role for display
  const getDisplayRole = () => {
    if (role === 'student') return 'Student';
    if (role === 'instructor') return language === 'es' ? 'Instructor' : 'Instructor';
    return language === 'es' ? 'Administrador' : 'Administrator';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r-2 border-slate-200 z-50 flex flex-col justify-between select-none">
      {/* 🐝 BRAND LOGO HEADER */}
      <div>
        <div className="p-5 border-b-2 border-slate-100">
          <Link
            to={role === 'student' ? '/student' : role === 'instructor' ? '/instructor' : '/admin'}
            onClick={() => soundEffects.playPop()}
            className="flex items-center gap-3 group"
          >
            <motion.div
              className="w-12 h-12 relative shrink-0"
              whileHover={{ rotate: [-5, 5, -5, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <img
                src="/bee-logo.png"
                alt="SkyLang"
                className="w-full h-full object-contain filter drop-shadow-sm"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://ui-avatars.com/api/?name=Bee&background=FFB800&color=000&rounded=true&size=150';
                }}
              />
            </motion.div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  SkyLang
                </span>
                <Sparkles size={14} className="text-amber-500 fill-amber-400" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 block">
                Nursing English
              </span>
            </div>
          </Link>
        </div>

        {/* 🚀 NAVIGATION ITEMS (DUOLINGO 3D STYLE) */}
        <nav className="p-4">
          <ul className="space-y-2.5">
            {navItems.map((item) => {
              const isActive =
                item.path === '/student' || item.path === '/instructor' || item.path === '/admin'
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => soundEffects.playPop()}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-xs tracking-wider transition-all duration-100 ${
                      isActive
                        ? 'bg-sky-50 text-sky-600 border-2 border-sky-300 border-b-4 border-b-sky-500 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-xl transition-transform ${
                        isActive ? 'text-sky-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.sublabel && (
                        <span className="text-[10px] font-semibold text-slate-400 normal-case -mt-0.5">
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* 👤 LANGUAGE SWITCHER, USER PROFILE & LOGOUT FOOTER */}
      <div className="p-4 border-t-2 border-slate-100 space-y-3">
        {/* 🌐 LANGUAGE SWITCHER BUTTON (ONLY FOR INSTRUCTOR & ADMIN) */}
        {(role === 'instructor' || role === 'admin') && (
          <div className="p-2 rounded-2xl bg-slate-50 border-2 border-slate-200 border-b-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 pl-1">
              <Languages size={17} className="text-sky-600 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {language === 'es' ? 'Idioma' : 'Language'}
              </span>
            </div>
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (language !== 'es') {
                    soundEffects.playPop();
                    setLanguage('es');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide transition-all ${
                  language === 'es'
                    ? 'bg-white text-sky-600 shadow-xs border border-slate-200 scale-105'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Cambiar a Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== 'en') {
                    soundEffects.playPop();
                    setLanguage('en');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide transition-all ${
                  language === 'en'
                    ? 'bg-white text-sky-600 shadow-xs border border-slate-200 scale-105'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-800 truncate">
                {role === 'student' && user.nombre?.toLowerCase() === 'aprendiz ejemplo'
                  ? 'Demo Student'
                  : user.nombre || (role === 'student' ? 'Student' : tr('Usuario', 'User'))}
              </p>
              <p className="text-[10px] font-bold text-slate-400 capitalize truncate">
                {getDisplayRole()}
              </p>
            </div>
          </div>
        )}

        <Link
          to="/"
          onClick={() => {
            soundEffects.playPop();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-extrabold uppercase tracking-wider transition-all"
        >
          <LogOut size={16} />
          <span>{role === 'student' ? 'Log Out' : tr('Cerrar Sesión', 'Log Out')}</span>
        </Link>
      </div>
    </aside>
  );
}

