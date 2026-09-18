import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { User, Mail, Hash, Lock, UserPlus, BookOpen, Layers, GraduationCap, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { BeeMascot } from "../components/BeeMascot";
import { soundEffects } from "../utils/soundEffects";

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    idNumber: "",
    program: "",
    ficha: "",
    password: "",
    confirmPassword: "",
  });
  
  const [programs, setPrograms] = useState<any[]>([]);
  const [fichas, setFichas] = useState<any[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/programas')
      .then(res => res.json())
      .then(data => setPrograms(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
      
    fetch('/api/fichas')
      .then(res => res.json())
      .then(data => setFichas(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (formData.program) {
      setFilteredFichas(fichas.filter(f => String(f.programa_id) === String(formData.program)));
      setFormData(prev => ({ ...prev, ficha: "" }));
    } else {
      setFilteredFichas([]);
    }
  }, [formData.program, fichas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      soundEffects.playIncorrect();
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    soundEffects.playPop();

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          ficha: formData.ficha,
          idNumber: formData.idNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        soundEffects.playCelebration();
        alert("Registration successful! You can now sign in with your account.");
        navigate("/");
      } else {
        soundEffects.playIncorrect();
        setError(data.message || "Registration error");
      }
    } catch (err) {
      soundEffects.playIncorrect();
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Decorative Background Glows */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-200 border-b-8 p-6 sm:p-8 shadow-lg space-y-6 relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BeeMascot
            size="md"
            mood="cheering"
            animate
            message="Join SkyLang and master clinical English!"
            messagePosition="top"
          />

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-1.5 mt-2">
            Create a Student Account <Sparkles size={20} className="text-amber-500 fill-amber-400" />
          </h1>
          <p className="text-xs font-bold text-slate-500">
            Register with your SENA cohort code to access your modules
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Smith"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="aprendiz@sena.edu.co"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                ID Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  placeholder="1002345678"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Program
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                  required
                >
                  <option value="">Select a program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                SENA Cohort (Ficha)
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  name="ficha"
                  value={formData.ficha}
                  onChange={handleChange}
                  disabled={!formData.program}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none disabled:opacity-50"
                  required
                >
                  <option value="">Select a cohort</option>
                  {filteredFichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      Cohort {f.numero_ficha || f.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-duo-3d btn-duo-sky w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus size={18} />
            <span>{isLoading ? "Creating your account..." : "Create My Account"}</span>
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs font-bold text-slate-500">
            Already have an account?{" "}
            <Link
              to="/"
              onClick={() => soundEffects.playPop()}
              className="text-sky-600 font-black hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
