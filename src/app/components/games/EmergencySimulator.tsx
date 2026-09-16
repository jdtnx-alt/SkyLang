import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, ClipboardList, HeartPulse, RotateCcw, ShieldAlert, Siren } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export interface EmergencyAction {
  id: string | number;
  label: string;
  consequence?: string;
  isCorrect?: boolean;
  impact?: {
    stability?: number;
    urgency?: number;
  };
}

export interface EmergencySimulatorProps {
  data: {
    patient?: {
      name?: string;
      age?: number | string;
      symptoms?: string[];
      vitalSigns?: Record<string, string>;
      context?: string;
    };
    actions?: EmergencyAction[];
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

export const EmergencySimulator: React.FC<EmergencySimulatorProps> = ({
  data,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  const patient = useMemo(() => {
    return data?.patient || {
      name: 'Thomas Miller',
      age: 45,
      symptoms: ['Headache', 'High fever (39.1 C)', 'Confusion'],
      vitalSigns: { BP: '140/90 mmHg', HR: '110 bpm', RR: '24 bpm' },
      context: 'Emergency Room Triage: Patient admitted with acute febrile syndrome.'
    };
  }, [data]);

  const actions: EmergencyAction[] = useMemo(() => {
    if (Array.isArray(data?.actions) && data.actions.length > 0) return data.actions;
    return [
      {
        id: 'act1',
        label: 'Check vital signs and assess consciousness level',
        consequence: 'Vitals recorded: T 39.1 C, HR 110. Patient is alert but disoriented.',
        impact: { stability: 12, urgency: -6 }
      },
      {
        id: 'act2',
        label: 'Ask about symptoms and allergy history',
        consequence: 'Patient confirms severe headache for 6 hours. No drug allergies.',
        impact: { stability: 8, urgency: -4 }
      },
      {
        id: 'act3',
        label: 'Contact attending physician immediately',
        consequence: 'Physician notified. Emergency protocol initiated.',
        impact: { stability: 14, urgency: -10 }
      },
      {
        id: 'act4',
        label: 'Record all information in the clinical chart',
        consequence: 'Documentation updated in real time.',
        impact: { stability: 6, urgency: -3 }
      }
    ];
  }, [data]);

  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [consequencesLog, setConsequencesLog] = useState<Array<{ label: string; consequence: string }>>([]);
  const [isFinished, setIsFinished] = useState<boolean>(isCompleted);
  const [stability, setStability] = useState(38);
  const [urgency, setUrgency] = useState(86);

  const progress = Math.round((selectedActions.length / actions.length) * 100);

  const handleActionClick = (action: EmergencyAction) => {
    const actionId = String(action.id);
    if (selectedActions.includes(actionId) || isFinished) return;

    const newSelected = [...selectedActions, actionId];
    const impact = action.impact || { stability: action.isCorrect === false ? -8 : 10, urgency: action.isCorrect === false ? 8 : -6 };
    const nextStability = Math.min(100, Math.max(0, stability + (impact.stability || 0)));
    const nextUrgency = Math.min(100, Math.max(0, urgency + (impact.urgency || 0)));
    const consequenceText = action.consequence || `Nursing action executed: ${action.label}. Registered in the clinical chart.`;

    setSelectedActions(newSelected);
    setStability(nextStability);
    setUrgency(nextUrgency);
    setConsequencesLog((prev) => [...prev, { label: action.label, consequence: consequenceText }]);

    if (newSelected.length === actions.length) {
      setIsFinished(true);
      confetti({ particleCount: 130, spread: 85, origin: { y: 0.6 } });
      onEvaluate?.(true, {
        acciones_seleccionadas: newSelected,
        estabilidad_final: nextStability,
        urgencia_final: nextUrgency
      }, 100);
      onComplete?.();
    }
  };

  const handleReset = () => {
    setSelectedActions([]);
    setConsequencesLog([]);
    setIsFinished(false);
    setStability(38);
    setUrgency(86);
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl text-white shadow-sm">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Emergency Simulator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold">
                {progress}%
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Toma decisiones secuenciales y observa como cambia el estado del paciente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all font-bold border border-slate-200"
        >
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={16} className="text-rose-600" /> Paciente: {patient.name} ({patient.age} anos)
          </span>
          <span className="text-[10px] font-extrabold bg-rose-200 text-rose-800 px-2.5 py-0.5 rounded-full">ALERTA ALTA</span>
        </div>
        <p className="text-xs text-rose-950 font-medium">{patient.context}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-rose-100 p-3">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
              <HeartPulse size={14} /> Estabilidad
            </span>
            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stability}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-rose-100 p-3">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
              <Siren size={14} /> Urgencia
            </span>
            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-rose-500 transition-all" style={{ width: `${urgency}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Acciones disponibles</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((act, index) => {
            const isTaken = selectedActions.includes(String(act.id));
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleActionClick(act)}
                disabled={isTaken || isFinished}
                className={`min-h-20 p-4 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isTaken
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 opacity-90 cursor-default'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 shadow-xs'
                }`}
              >
                <span className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-black">
                    {index + 1}
                  </span>
                  {act.label}
                </span>
                {isTaken && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {consequencesLog.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList size={14} /> Historial clinico
          </h4>
          <div className="space-y-2">
            {consequencesLog.map((log, idx) => (
              <motion.div
                key={`${log.label}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-0.5"
              >
                <span className="font-extrabold text-slate-900 block">Accion {idx + 1}: {log.label}</span>
                <span className="text-slate-600 font-medium block">Consecuencia: {log.consequence}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isFinished && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} /> Simulacion completada y registrada.
        </div>
      )}
    </div>
  );
};
