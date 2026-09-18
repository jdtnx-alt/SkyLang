import React, { createContext, useContext, useState } from 'react';

export type Language = 'es' | 'en';

export const translatePhase = (fase?: string, lang: Language = 'es'): string => {
  if (!fase) return lang === 'en' ? 'Training Phase' : 'Fase de Formación';
  if (lang !== 'en') return fase;

  const f = fase.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const isUpper = fase === fase.toUpperCase();

  if (f.includes('analisis')) {
    if (f.includes('fase')) return isUpper ? 'ANALYSIS PHASE' : 'Analysis Phase';
    return isUpper ? 'ANALYSIS' : 'Analysis';
  }
  if (f.includes('planeacion')) {
    if (f.includes('fase')) return isUpper ? 'PLANNING PHASE' : 'Planning Phase';
    return isUpper ? 'PLANNING' : 'Planning';
  }
  if (f.includes('ejecucion')) {
    if (f.includes('fase')) return isUpper ? 'EXECUTION PHASE' : 'Execution Phase';
    return isUpper ? 'EXECUTION' : 'Execution';
  }
  if (f.includes('evaluacion')) {
    if (f.includes('fase')) return isUpper ? 'EVALUATION PHASE' : 'Evaluation Phase';
    return isUpper ? 'EVALUATION' : 'Evaluation';
  }
  if (f.includes('induccion')) {
    if (f.includes('fase')) return isUpper ? 'INDUCTION PHASE' : 'Induction Phase';
    return isUpper ? 'INDUCTION' : 'Induction';
  }
  if (f.includes('fase de formacion')) {
    return isUpper ? 'TRAINING PHASE' : 'Training Phase';
  }
  return fase;
};

export const translateModuleTitle = (titulo?: string, lang: Language = 'es'): string => {
  if (!titulo) return '';
  if (lang !== 'en') return titulo;
  return titulo.replace(/\b(m[oó]dulo)\b/gi, (match) => {
    return match === match.toUpperCase() ? 'MODULE' : (match[0] === match[0].toUpperCase() ? 'Module' : 'module');
  });
};

export const translateProgramName = (nombre?: string, lang: Language = 'es'): string => {
  if (!nombre) return '';
  if (lang !== 'en') return nombre;
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('enfermeria') && n.includes('ingles tecnico')) {
    return 'Nursing - Technical English';
  }
  if (n.includes('enfermeria')) {
    return 'Nursing';
  }
  return nombre;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  tr: (es: string, en: string) => string;
  trPhase: (fase?: string) => string;
  trModule: (title?: string) => string;
  trProgram: (title?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'skylang_admin_instructor_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'es') return saved;
    }
    return 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  const tr = (es: string, en: string): string => {
    return language === 'es' ? es : en;
  };

  const trPhase = (fase?: string): string => {
    return translatePhase(fase, language);
  };

  const trModule = (title?: string): string => {
    return translateModuleTitle(title, language);
  };

  const trProgram = (title?: string): string => {
    return translateProgramName(title, language);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      toggleLanguage,
      tr,
      trPhase,
      trModule,
      trProgram
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'es',
      setLanguage: () => {},
      toggleLanguage: () => {},
      tr: (es, _en) => es,
      trPhase: (fase) => translatePhase(fase, 'es'),
      trModule: (title) => translateModuleTitle(title, 'es'),
      trProgram: (title) => translateProgramName(title, 'es'),
    };
  }
  return context;
};
