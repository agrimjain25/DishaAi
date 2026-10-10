import React from 'react';
import { Shield, LayoutGrid, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Language } from '../types';
import { t } from '../utils/translations';

interface LandingPageProps {
  onStart: () => void;
  language: Language;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, language }) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {t(language, 'appTitle')}
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Scholarship Rules</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Evidence Portal</a>
        </nav>
        <button 
          onClick={onStart}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
        >
          {t(language, 'startMyCase')}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-16 pb-28 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 text-wrap-balance">
            {t(language, 'heroHeadline')}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t(language, 'heroSubtext')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 group"
            >
              {t(language, 'startMyCase')}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-xs text-slate-400 font-medium px-4">
              Grounds paperwork in literal evidence quotes from uploaded files
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 w-full">
          <FeatureCard 
            icon={<LayoutGrid className="w-6 h-6 text-blue-600" />}
            title="Literal Extraction"
            description="Extracts only visibly present text with exact evidence quotes. Never infers or hallucinates."
          />
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-blue-600" />}
            title="Deterministic Rules"
            description="Pure code evaluation for academic years, names, dates, and deadlines. Zero LLM guesswork."
          />
          <FeatureCard 
            icon={<CheckCircle2 className="w-6 h-6 text-blue-600" />}
            title="Multi-Document Audit"
            description="Upload both applications and certificates into a single case for cross-document consistency checks."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100 px-8 text-center text-slate-400 text-xs">
        <p>© 2026 DISHA · AI Case-Resolution Agent for Public Services · Assistive Civic System</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm text-left group">
    <div className="mb-4 p-3 bg-blue-50 w-fit rounded-xl">
      {icon}
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-xs">{description}</p>
  </div>
);
