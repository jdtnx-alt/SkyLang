import React, { useState } from 'react';
import { 
  Users, MapPin, CheckCircle2, Lock, Unlock, 
  Sparkles, Award, ArrowRight, ShieldCheck
} from 'lucide-react';

interface StudentAvatarNode {
  id: number;
  nombre: string;
  avatar: string;
  nodoActual: string;
  porcentaje: number;
}

export const InstructorPathManager: React.FC = () => {
  const [students] = useState<StudentAvatarNode[]>([
    { id: 1, nombre: "Ana Gómez", avatar: "AG", nodoActual: "node_3", porcentaje: 65 },
    { id: 2, nombre: "Carlos Ruiz", avatar: "CR", nodoActual: "node_4", porcentaje: 90 },
    { id: 3, nombre: "Laura Mendoza", avatar: "LM", nodoActual: "node_2", porcentaje: 40 },
    { id: 4, nombre: "David Silva", avatar: "DS", nodoActual: "node_1", porcentaje: 20 }
  ]);

  const nodes = [
    { id: "node_1", label: "RAP 1: M1 - Preparación", totalStudents: 1 },
    { id: "node_2", label: "RAP 1: M2 - Absorción", totalStudents: 1 },
    { id: "node_3", label: "RAP 1: M3 - Práctica Interactiva", totalStudents: 1 },
    { id: "node_4", label: "RAP 1: M4 - Evaluación Final", totalStudents: 1 }
  ];

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-purple-600 tracking-wider">
            Duolingo for Schools
          </span>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            Radar de Aprendices en la Ruta de RAPs
          </h3>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-full">
          {students.length} Aprendices Monitoreados
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {nodes.map((node, idx) => {
          const nodeStudents = students.filter(s => s.nodoActual === node.id);

          return (
            <div key={node.id} className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                  {nodeStudents.length} Aprendices
                </span>
              </div>

              <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{node.label}</h4>

              <div className="space-y-2 pt-2 border-t border-purple-100">
                {nodeStudents.map(st => (
                  <div key={st.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-purple-100 text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {st.avatar}
                      </span>
                      <span className="font-bold text-slate-800 truncate max-w-24">{st.nombre}</span>
                    </div>
                    <span className="font-extrabold text-[10px] text-emerald-600">{st.porcentaje}%</span>
                  </div>
                ))}

                {nodeStudents.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic block py-2 text-center">Sin aprendices en este hito</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
