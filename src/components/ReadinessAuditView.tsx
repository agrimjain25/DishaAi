import React, { useRef, useState } from 'react';
import { 
  ReadinessEvaluation, 
  OfficialRequirement, 
  ProblemUnderstanding, 
  Language 
} from '../types';
import { t } from '../utils/translations';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  HelpCircle, 
  ArrowRight, 
  ExternalLink,
  Upload,
  Search,
  Quote,
  Shield,
  FileText,
  AlertTriangle,
  Loader2,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReadinessAuditViewProps {
  readiness: ReadinessEvaluation;
  problemUnderstanding?: ProblemUnderstanding;
  requirements?: OfficialRequirement[];
  onUploadGuideline?: (file: File) => void;
  onSearchRules?: () => void;
  onResolve: () => void;
  isLoading: boolean;
  isSearchingRules?: boolean;
  language: Language;
}

export const ReadinessAuditView: React.FC<ReadinessAuditViewProps> = ({ 
  readiness, 
  problemUnderstanding,
  requirements,
  onUploadGuideline,
  onSearchRules,
  onResolve, 
  isLoading,
  isSearchingRules = false,
  language 
}) => {
  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<{ quote: string; label: string } | null>(null);

  const isReady = readiness.status === 'READY';
  const isNeedsReview = readiness.status === 'NEEDS REVIEW';
  const hasNoSource = Boolean(readiness.noSourceExists || (!readiness.checks || readiness.checks.length === 0));

  const handleGuidelineFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && onUploadGuideline) {
      onUploadGuideline(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-left">
      {/* Hidden file input for uploading official guideline / notice (Requirement 2.b) */}
      <input 
        type="file" 
        ref={guidelineInputRef}
        onChange={handleGuidelineFile}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
      />

      {/* Hero Readiness Evaluation Card */}
      <motion.div 
        key={readiness.status}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "p-8 md:p-10 rounded-[2.5rem] border-4 flex flex-col items-center text-center shadow-xl transition-all",
          isReady 
            ? "bg-white border-emerald-500 shadow-emerald-50" 
            : isNeedsReview
              ? "bg-white border-amber-300 shadow-amber-50"
              : "bg-white border-red-200 shadow-red-50"
        )}
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          isReady 
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
            : isNeedsReview
              ? "bg-amber-100 text-amber-800"
              : "bg-red-50 text-red-500"
        )}>
          {isReady && <CheckCircle2 className="w-10 h-10" />}
          {isNeedsReview && <HelpCircle className="w-10 h-10" />}
          {!isReady && !isNeedsReview && <ShieldAlert className="w-10 h-10" />}
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
            {t(language, 'statusBadge')}
          </span>
          {readiness.sourceLabel && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {readiness.sourceLabel}
            </span>
          )}
        </div>

        <h3 className={cn(
          "text-3xl md:text-4xl font-bold tracking-tight mb-3",
          isReady ? "text-emerald-950" : isNeedsReview ? "text-amber-950" : "text-red-950"
        )}>
          {readiness.status}
        </h3>

        <p className="text-slate-600 mb-6 max-w-lg leading-relaxed text-sm">
          {readiness.summaryMessage || (
            isReady 
              ? (language === 'hi' ? "सभी आधिकारिक नियम एवं आवश्यकताएं पूरी हो चुकी हैं।" : "All official requirements verified from authentic sources and passed.")
              : isNeedsReview
                ? (language === 'hi' ? "समीक्षा आवश्यक: कुछ शर्तें अधूरी हैं या आधिकारिक नियम लोड नहीं हैं।" : "NEEDS REVIEW: One or more conditions require human or official verification.")
                : (language === 'hi' ? "त्रुटि पाई गई: आवेदन में सुधार आवश्यक है।" : "NOT READY: Defect or missing requirement detected across paperwork.")
          )}
        </p>

        {/* Action Button Bar */}
        <div className="flex items-center gap-3 flex-wrap justify-center w-full max-w-md">
          {/* Upload Official Guideline Button (Requirement 2.b) */}
          <button
            onClick={() => guidelineInputRef.current?.click()}
            disabled={isLoading}
            className="flex-grow py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>{t(language, 'uploadGuidelineBtn')}</span>
          </button>

          {/* Search Official Rules Button (Requirement 2.c) */}
          {onSearchRules && (
            <button
              onClick={onSearchRules}
              disabled={isLoading || isSearchingRules}
              className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSearchingRules ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>{t(language, 'searchRulesBtn')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Requirement 2.d: If no source exists, show exact warning */}
      {hasNoSource && (
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-3xl p-6 text-left flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-bold text-amber-950">
              {language === 'hi' ? "कोई सत्यापित नियम स्रोत उपलब्ध नहीं" : "No Verified Source Available Yet"}
            </h4>
            <p className="text-sm font-semibold text-amber-900 leading-relaxed">
              {t(language, 'noRulesYet')}
            </p>
            <p className="text-xs text-amber-700">
              {language === 'hi'
                ? "दिशा मॉडल मेमोरी से नियम नहीं बनाता है। कृपया आधिकारिक पोर्टल से पीडीएफ/नोटिस अपलोड करें।"
                : "DISHA adheres strictly to zero-hallucination discipline and never generates legal rules from model memory."}
            </p>
          </div>
        </div>
      )}

      {/* Requirement 6: Checklist with pass/fail/unknown, source label and link */}
      {readiness.checks && readiness.checks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Official Compliance
              </span>
              <h4 className="text-lg font-bold text-slate-900">
                {language === 'hi' ? "आधिकारिक नियमों की जांच सूची" : "Official Requirements Checklist"} ({readiness.checks.length})
              </h4>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {readiness.checks.filter(c => c.result === 'pass').length} passed · {readiness.checks.filter(c => c.result === 'fail').length} failed
            </span>
          </div>

          <div className="space-y-3">
            {readiness.checks.map((chk) => {
              const isPass = chk.result === 'pass';
              const isFail = chk.result === 'fail';

              return (
                <div 
                  key={chk.id}
                  className={cn(
                    "p-5 rounded-3xl border text-left transition-all bg-white shadow-2xs space-y-2.5",
                    isPass 
                      ? "border-emerald-100 hover:border-emerald-300" 
                      : isFail 
                        ? "border-red-200 bg-red-50/20 hover:border-red-400" 
                        : "border-amber-200 bg-amber-50/20 hover:border-amber-300"
                  )}
                >
                  {/* Top Bar: Rule Label, Status Badge & Source Label */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {chk.label}
                      </span>
                      {chk.source_type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {chk.source_type}
                        </span>
                      )}
                      {chk.section && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {chk.section}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {chk.isAiAssessed ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          AI-assessed, verify
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
                          isPass 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                            : isFail 
                              ? "bg-red-50 text-red-800 border-red-200" 
                              : "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {chk.result}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className={cn(
                    "text-xs leading-relaxed",
                    isPass ? "text-slate-600" : isFail ? "text-red-800 font-medium" : "text-amber-900"
                  )}>
                    {chk.explanation}
                  </p>

                  {/* Evidence Quote from Document (if available) */}
                  {chk.evidence_quote && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 italic flex items-start gap-1.5">
                        <Quote className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="break-words">"{chk.evidence_quote}"</span>
                      </div>
                    </div>
                  )}

                  {/* Source Link & Last Verified */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 flex-wrap gap-2">
                    {chk.source_url && chk.source_url !== "TO BE VERIFIED BY USER" ? (
                      <a
                        href={chk.source_url.startsWith('http') ? chk.source_url : `https://${chk.source_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                      >
                        <span>{chk.source_url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-mono text-slate-400">
                        Source: {chk.source_url || "Verified library"}
                      </span>
                    )}

                    {chk.last_verified && (
                      <span className="font-mono text-[10px]">
                        Verified: {chk.last_verified}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Disclaimer */}
      <div className="text-center text-xs text-slate-400 pt-4">
        <p>DISHA Resolution Brain verifies all rules against literal evidence quotes and official sources.</p>
      </div>
    </div>
  );
};
