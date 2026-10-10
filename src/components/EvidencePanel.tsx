import React from 'react';
import { EvidenceRecord } from '../types';
import { X, ShieldCheck, Link2, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidencePanelProps {
  evidenceId: string | null;
  evidenceList: EvidenceRecord[];
  onClose: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidenceId, evidenceList, onClose }) => {
  const evidence = evidenceList.find(e => e.id === evidenceId);

  return (
    <AnimatePresence>
      {evidence && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Official Evidence</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-8">
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Source Information</h4>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-900 mb-1">{evidence.title}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-slate-500">{evidence.sourceName}</span>
                    <span className="text-slate-200">|</span>
                    <span className="text-xs text-slate-500">{evidence.section}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      OFFICIAL GUIDELINE
                    </div>
                    {evidence.lastVerified && (
                      <span className="text-[10px] text-slate-400 font-medium">Recorded: {evidence.lastVerified}</span>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Requirement Statement</h4>
                <div className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full" />
                  <blockquote className="text-lg text-slate-900 italic font-medium leading-relaxed pl-2">
                    "{evidence.statement}"
                  </blockquote>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Context & Confidence</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This requirement is extracted directly from the official scheme guidelines provided by the {evidence.sourceName}. DISHA maps this rule to your specific document checks.
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl">
                    <span className="text-xs font-medium text-slate-600">Retrieval Confidence</span>
                    <span className="text-xs font-bold text-blue-600">{evidence.confidence}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-slate-100">
              <a 
                href={evidence.url || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all group"
              >
                Open Official Source
                <Link2 className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
