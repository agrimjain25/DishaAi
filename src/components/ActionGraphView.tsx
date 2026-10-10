import React, { useState, useEffect } from 'react';
import { ActionNode, Language } from '../types';
import { t } from '../utils/translations';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Shield, 
  FileText, 
  MapPin, 
  Calendar, 
  Quote, 
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ActionGraphViewProps {
  actions: ActionNode[];
  hasVerifiedRules?: boolean;
  onViewEvidence?: (id: string) => void;
  language: Language;
}

export const ActionGraphView: React.FC<ActionGraphViewProps> = ({ 
  actions, 
  hasVerifiedRules,
  onViewEvidence,
  language 
}) => {
  const [selectedActionEvidence, setSelectedActionEvidence] = useState<ActionNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let textToRead = language === 'hi' ? "लक्षित कार्य योजना। " : "Targeted Action Plan. ";
    if (!actions || actions.length === 0) {
      textToRead += hasVerifiedRules !== false
        ? (language === 'hi' ? "कोई लंबित कार्य नहीं।" : "No pending actions.")
        : (language === 'hi' ? "दिशा सत्यापित नियमों के विरुद्ध इस दस्तावेज़ की जाँच नहीं कर सका। कृपया आधिकारिक पोर्टल पर पुष्टि करें।" : "DISHA could not check this against verified rules. Please verify on the official portal.");
    } else {
      textToRead += `${actions.length} ${language === 'hi' ? "कार्य कदम।" : "action steps."} `;
      actions.forEach((act, idx) => {
        textToRead += `${language === 'hi' ? `कदम ${idx + 1}:` : `Step ${idx + 1}:`} ${act.title || act.what}. ${language === 'hi' ? "कारण:" : "Reason:"} ${act.why || act.description}. `;
        if (act.document_needed) textToRead += `${language === 'hi' ? "आवश्यक दस्तावेज़:" : "Document needed:"} ${act.document_needed}. `;
        if (act.deadline) textToRead += `${language === 'hi' ? "समय सीमा:" : "Deadline:"} ${act.deadline}. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!actions || actions.length === 0) {
    const isVerified = hasVerifiedRules !== false;

    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isVerified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        }`}>
          {isVerified ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isVerified 
            ? (language === 'hi' ? "कोई लंबित कार्य नहीं" : "No Pending Actions")
            : (language === 'hi' ? "सत्यापित नियम उपलब्ध नहीं" : "No Verified Rules Loaded")}
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {isVerified
            ? (language === 'hi' 
                ? "सभी आधिकारिक आवश्यकताएं सत्यापित हैं और पास हो चुकी हैं। आपका केस आगे बढ़ने के लिए तैयार है।"
                : "All verified official requirements have passed against uploaded paperwork. Your case file is submission-ready.")
            : (language === 'hi'
                ? "दिशा सत्यापित नियमों के विरुद्ध इस दस्तावेज़ की जाँच नहीं कर सका। कृपया आधिकारिक पोर्टल पर पुष्टि करें।"
                : "DISHA could not check this against verified rules. Please verify on the official portal.")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6 text-left">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">
            {t(language, 'actionPlanTab')}
          </span>
          <h3 className="text-xl font-bold text-slate-900">
            {language === 'hi' ? "लंबित आवश्यकताओं की कार्य योजना" : "Targeted Action Plan"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? "प्रत्येक चरण केवल विफल या असत्यापित नियमों से जुड़ा है और इसमें आधिकारिक साक्ष्य शामिल हैं।"
              : "Generated exclusively from failed or unverified rules. Every step is linked to official requirements."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleReadAloud}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isSpeaking 
                ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
            title={isSpeaking ? "Stop reading" : "Read aloud action plan"}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-600" />
                <span>{language === 'hi' ? "रोकें" : "Stop"}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'hi' ? "बोलकर सुनें" : "Read aloud"}</span>
              </>
            )}
          </button>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">
              {language === 'hi' ? "आवश्यक कदम" : "Action Steps"}
            </span>
            <span className="text-lg font-bold text-slate-800 font-mono">{actions.length}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {actions.map((action, index) => {
          const isComplete = action.status === 'COMPLETE';
          const isCurrent = action.status === 'CURRENT';

          return (
            <div 
              key={action.id || index}
              className={`bg-white rounded-3xl border transition-all p-6 shadow-xs ${
                isCurrent 
                  ? "border-blue-200 ring-2 ring-blue-500/10 shadow-md" 
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                    isComplete 
                      ? "bg-emerald-50 text-emerald-600" 
                      : isCurrent 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                        Step #{index + 1}
                      </span>
                      {action.requirement_id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                          Linked: {action.requirement_id}
                        </span>
                      )}
                      {action.source_type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          {action.source_type}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {action.what || action.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-start">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    isComplete 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : isCurrent 
                        ? "bg-blue-50 text-blue-700 border border-blue-200" 
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {action.status}
                  </span>
                </div>
              </div>

              {/* Action Description / Legal Cause */}
              <div className="mb-4 pl-0 md:pl-12">
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-0.5">
                    {t(language, 'why')}:
                  </span>
                  {action.why || action.description}
                </p>
              </div>

              {/* Key Metadata Grid */}
              <div className="grid sm:grid-cols-3 gap-3 mb-4 pl-0 md:pl-12 text-xs">
                {action.document_needed && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-500" />
                      {t(language, 'documentNeeded')}
                    </span>
                    <span className="font-semibold text-slate-800 block break-words">
                      {action.document_needed}
                    </span>
                  </div>
                )}

                {action.where_to_get && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      {t(language, 'whereToGet')}
                    </span>
                    <span className="font-semibold text-slate-800 block break-words">
                      {action.where_to_get}
                    </span>
                  </div>
                )}

                {action.deadline && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      {t(language, 'deadline')}
                    </span>
                    <span className="font-semibold text-slate-800 block break-words">
                      {action.deadline}
                    </span>
                  </div>
                )}
              </div>

              {/* Requirement 6: "View Evidence" Button */}
              <div className="pl-0 md:pl-12 pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => setSelectedActionEvidence(action)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t(language, 'viewEvidence')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {action.source_url && action.source_url !== "TO BE VERIFIED BY USER" && (
                  <a
                    href={action.source_url.startsWith('http') ? action.source_url : `https://${action.source_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <span>{action.source_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Evidence Modal */}
      {selectedActionEvidence && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedActionEvidence(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 text-left space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  {language === 'hi' ? "आधिकारिक नियम एवं साक्ष्य" : "Official Rule & Evidence"}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedActionEvidence(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {selectedActionEvidence.requirement_id}
              </span>
              <h5 className="text-base font-bold text-slate-900">
                {selectedActionEvidence.what}
              </h5>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-0.5">
                  {language === 'hi' ? "नियम स्रोत:" : "Source Authority:"}
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedActionEvidence.source_type || "Official Guideline"}
                </span>
              </div>

              {selectedActionEvidence.section && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    {language === 'hi' ? "धारा / अनुभाग:" : "Clause / Section:"}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedActionEvidence.section}
                  </span>
                </div>
              )}

              {selectedActionEvidence.evidence_quote && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    {language === 'hi' ? "दस्तावेज़ साक्ष्य उद्धरण:" : "Document Evidence Quote:"}
                  </span>
                  <p className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 italic flex items-start gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>"{selectedActionEvidence.evidence_quote}"</span>
                  </p>
                </div>
              )}

              {selectedActionEvidence.source_url && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">
                    {language === 'hi' ? "आधिकारिक लिंक:" : "Official Link:"}
                  </span>
                  {selectedActionEvidence.source_url.startsWith('http') ? (
                    <a
                      href={selectedActionEvidence.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold break-all"
                    >
                      <span>{selectedActionEvidence.source_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="font-mono text-slate-600">{selectedActionEvidence.source_url}</span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedActionEvidence(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              {language === 'hi' ? "बंद करें" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
