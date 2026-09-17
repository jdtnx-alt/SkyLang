import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { BeeMascot } from "../components/BeeMascot";
import { soundEffects } from "../utils/soundEffects";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    soundEffects.playPop();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        soundEffects.playCorrect();
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        localStorage.setItem('user', JSON.stringify(data.user));

        const role = (data.user.rol || '').toLowerCase();
        if (role === 'admin' || role === 'administrador') {
          navigate("/admin");
        } else if (role === 'instructor') {
          navigate("/instructor");
        } else {
          navigate("/student");
        }
      } else {
        soundEffects.playIncorrect();
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      soundEffects.playIncorrect();
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] flex items-center justify-center p-4 overflow-hidden select-none relative">
      {/* Elementos decorativos sutiles de fondo */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta de Inicio de Sesión compacta */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl border-2 border-slate-200 border-b-6 p-6 sm:p-7 shadow-md space-y-5 relative z-10 my-auto"
      >
        {/* Encabezado con Mascota */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BeeMascot
            size="md"
            mood="happy"
            animate
            message="Welcome to SkyLang. Continue your clinical English training."
            messagePosition="top"
          />

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              SkyLang
            </h1>
            <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mt-0.5">
              Nursing English Platform
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@sena.edu.co"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-duo-3d btn-duo-amber w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 mt-1"
          >
            <LogIn size={16} />
            <span>{isLoading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        {/* Registration Link */}
        <div className="text-center pt-2 border-t-2 border-slate-100">
          <p className="text-xs font-bold text-slate-500">
            Don't have an account yet?{" "}
            <Link
              to="/register"
              onClick={() => soundEffects.playPop()}
              className="text-sky-600 font-black hover:underline"
            >
              Create one here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}