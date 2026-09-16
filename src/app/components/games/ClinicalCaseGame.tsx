import React, { useState, useMemo } from 'react';
import { User, Activity, FileText, Send, RotateCcw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ClinicalPatient {
  name: string;
  age?: number | string;
  symptoms?: string[];
  vitalSigns?: Record<string, string>;
  context?: string;
}

export interface ClinicalQuestion {
  id?: string | number;
  question: string;
  options: string[];
}

export interface ClinicalCaseGameProps {
  data: {
    patient?: ClinicalPatient;
    questions?: ClinicalQuestion[];
    actions?: Array<{ id: string | number; label: string }>;
    [key: string]: any;
  };
  savedState?: any;
  isCompleted?: boolean;
  onEvaluate?: (isCorrect: boolean, answers: any, score?: number) => void;
  onComplete?: () => void;
}

export const ClinicalCaseGame: React.FC<ClinicalCaseGameProps> = ({
  data,
  savedState,
  isCompleted = false,
  onEvaluate,
  onComplete
}) => {
  const patient: ClinicalPatient = useMemo(() => {
    return data?.patient || {
      name: 'Thomas Miller',
      age: 45,
      symptoms: ['High fever (38.9°C)', 'Severe headache', 'Fatigue and muscle weakness'],
      vitalSigns: { BP: '120/80 mmHg', HR: '92 bpm', SpO2: '97%' },
      context: 'Patient arrived at triage complaining of sudden onset fever and chills.'
    };
  }, [data]);

  const questions: ClinicalQuestion[] = useMemo(() => {
    if (Array.isArray(data?.questions) && data.questions.length > 0) {
      return data.questions;
    }
    return [
      {
        question: 'What is the priority nursing action for Mr. Miller?',
        options: [
          'Administer antipyretic medication and record vital signs',
          'Immediately discharge the patient',
          'Order a full surgical consult without vitals',
          'Ignore the reported symptoms'
        ]
      }
    ];
  }, [data]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => savedState || {});
  const [submitted, setSubmitted] = useState<boolean>(isCompleted);

  const isAllAnswered = Object.keys(selectedAnswers).length === questions.length;

  const handleSubmit = () => {
    if (!isAllAnswered || submitted) return;
    setSubmitted(true);
    const answersArray = questions.map((_, i) => selectedAnswers[i] ?? null);
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 } });
    if (onEvaluate) {
      onEvaluate(true, { respuestas: answersArray }, 100);
    }
    if (onComplete) {
      onComplete();
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="skylang-game bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Caso Clínico Interactivo
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">
                {patient.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Analiza el historial clínico del paciente y toma las decisiones de enfermería adecuadas.
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 px-3 py-1.5 rounded-xl transition-all font-bold border border-slate-200"
        >
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      {/* Patient Record Dashboard */}
      <div className="p-5 bg-gradient-to-r from-slate-50 to-purple-50/40 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
            <User size={20} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">{patient.name}</h4>
            <span className="text-xs text-slate-500 font-semibold">Edad: {patient.age} años</span>
          </div>
        </div>

        {patient.context && (
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            <span className="font-bold text-slate-900">Contexto: </span> {patient.context}
          </p>
        )}

        {/* Symptoms & Vitals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {patient.symptoms && patient.symptoms.length > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider block">Síntomas</span>
              <ul className="text-xs text-slate-700 space-y-1">
                {patient.symptoms.map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {patient.vitalSigns && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Activity size={14} /> Signos Vitales
              </span>
              <div className="text-xs text-slate-700 grid grid-cols-2 gap-1 font-semibold">
                {Object.entries(patient.vitalSigns).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400 font-normal">{k}: </span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Questions */}
      <div className="space-y-6">
        {questions.map((q, qi) => (
          <div key={qi} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900">{qi + 1}. {q.question}</h4>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selectedAnswers[qi] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [qi]: oi })}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isAllAnswered || submitted}
        className={`w-full py-3.5 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm ${
          isAllAnswered && !submitted
            ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow-md'
            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
        }`}
      >
        <Send size={15} />
        {submitted ? 'Caso clínico entregado' : 'Enviar decisiones clínicas'}
      </button>
    </div>
  );
};
