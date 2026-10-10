import React, { useState } from 'react';
import { 
  FileText, 
  GitBranch, 
  Files, 
  SearchCheck, 
  PlusCircle,
  CheckCircle2,
  Clock,
  Target,
  AlertTriangle,
  Upload,
  HelpCircle
} from 'lucide-react';
import { CaseFile, Language } from '../types';
import { CaseFileView } from './CaseFileView';
import { ActionGraphView } from './ActionGraphView';
import { DocumentCheckView } from './DocumentCheckView';
import { ReadinessAuditView } from './ReadinessAuditView';
import { EvidencePanel } from './EvidencePanel';
import { t } from '../utils/translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TabType = 'case' | 'plan' | 'documents' | 'readiness';

interface DashboardProps {
  caseFile: CaseFile;
  selectedDocId?: string | null;
  onSelectDocId: (docId: string) => void;
  onRemoveDocument: (docId: string) => void;
  onNavigateUpload: () => void;
  onFileUpload: (file: File) => void;
  onReset: () => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onConfirmFields?: () => void;
  onUpdateGoal?: (newGoal: string) => void;
  onUpdateField?: (docId: string, fieldId: string, newValue: string) => void;
  onReExtract?: () => void;
  onUploadGuideline?: (file: File) => void;
  onSearchRules?: () => void;
  isSearchingRules?: boolean;
  onClarificationSubmit?: (answers: Record<string, string>) => void;
  isLoading: boolean;
  language: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  caseFile, 
  selectedDocId,
  onSelectDocId,
  onRemoveDocument,
  onNavigateUpload,
  onFileUpload, 
  onReset, 
  activeTab: propActiveTab,
  onTabChange,
  onConfirmFields,
  onUpdateGoal,
  onUpdateField,
  onReExtract,
  onUploadGuideline,
  onSearchRules,
  isSearchingRules,
  onClarificationSubmit,
  isLoading,
  language 
}) => {
  const [internalTab, setInternalTab] = useState<TabType>(propActiveTab || 'case');
  const activeTab = propActiveTab || internalTab;

  const handleTabChange = (tab: TabType) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState(caseFile.caseGoal || "");
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [dismissClarification, setDismissClarification] = useState(false);

  React.useEffect(() => {
    setGoalInput(caseFile.caseGoal || "");
  }, [caseFile.caseGoal]);

  React.useEffect(() => {
    if (caseFile.problemUnderstanding?.answers) {
      setClarificationAnswers(caseFile.problemUnderstanding.answers);
    }
    if (caseFile.problemUnderstanding?.is_clarification_needed) {
      setDismissClarification(false);
    }
  }, [caseFile.caseId, caseFile.problemUnderstanding?.is_clarification_needed]);

  const tabs = [
    { id: 'case', label: t(language, 'caseFileTab'), icon: FileText },
    { id: 'plan', label: t(language, 'actionPlanTab'), icon: GitBranch },
    { id: 'documents', label: t(language, 'documentsTab'), icon: Files },
    { id: 'readiness', label: t(language, 'readinessTab'), icon: SearchCheck },
  ];

  const viewEvidence = (id: string) => {
    setSelectedEvidenceId(id);
  };

  const isReady = caseFile.readiness.status === 'READY';
  const isNeedsReview = caseFile.readiness.status === 'NEEDS REVIEW';

  const handleGoalSubmit = () => {
    if (onUpdateGoal) {
      onUpdateGoal(goalInput);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-screen z-20">
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold tracking-tight text-slate-900">DISHA</div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-blue-100 text-blue-800">
              UNIVERSAL
            </span>
          </div>
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
            Universal Resolution
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  activeTab === tab.id 
                    ? "bg-blue-50 text-blue-700 font-bold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  activeTab === tab.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                )} />
                <span>{tab.label}</span>
                {tab.id === 'documents' && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {caseFile.documents.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Case Goal Text Box (Requirement 4 & 8) */}
        <div className="px-4 py-3 mx-4 mb-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              Case Goal
            </span>
          </div>
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onBlur={handleGoalSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGoalSubmit();
              }
            }}
            placeholder="e.g. fix my defective scholarship application"
            className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
          <p className="text-[9px] text-slate-500 mt-1">
            Evaluated across all {caseFile.documents.length} documents.
          </p>
        </div>

        {/* Confirmation status widget */}
        <div className="px-4 py-3 mx-4 mb-4 bg-slate-50 border border-slate-100 rounded-2xl text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
            {caseFile.userConfirmed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>{caseFile.userConfirmed ? "Citizen Confirmed" : "Confirmation Pending"}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            {caseFile.userConfirmed 
              ? "All facts authorized by citizen." 
              : "Review fields alongside original document."}
          </p>
        </div>

        {/* Reset / Start New Case Button (Requirement 5) */}
        <div className="mt-auto p-4 border-t border-slate-100">
          <button 
            onClick={() => setShowResetConfirmModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-600">{t(language, 'resetCase')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8 max-w-6xl mx-auto w-full">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
              <span>{caseFile.workflowType}</span>
              <span>·</span>
              <span>ID: {caseFile.caseId}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 border border-blue-200">
                {caseFile.documents.length} Doc{caseFile.documents.length > 1 ? "s" : ""}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
            {/* Requirement 1 & 5: Upload New Document / Add another document button */}
            <button
              onClick={onNavigateUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add another document</span>
            </button>

            {/* Field Confirmation Badge */}
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              caseFile.userConfirmed
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              {caseFile.userConfirmed ? "Confirmed by Citizen" : "Extracted, please confirm"}
            </span>

            {/* Status badge: derived strictly from evaluateReadiness */}
            <div className={cn(
              "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all",
              isReady 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                : isNeedsReview
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-red-50 text-red-700 border border-red-100"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isReady 
                  ? "bg-emerald-500" 
                  : isNeedsReview
                    ? "bg-amber-500"
                    : "bg-red-500"
              )} />
              <span>{caseFile.readiness.status}</span>
            </div>
          </div>
        </div>

        {/* Requirement 1: Clarification Questions (if goal or situation is ambiguous) */}
        {caseFile.problemUnderstanding?.is_clarification_needed && !dismissClarification && caseFile.problemUnderstanding.missing_info_questions?.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50/90 border-2 border-blue-200 rounded-3xl text-left shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-950">
                    {t(language, 'clarificationNeeded')}
                  </h4>
                  <p className="text-xs text-blue-800">
                    {caseFile.problemUnderstanding.service_name} · {caseFile.problemUnderstanding.problem_type}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDismissClarification(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1 bg-white/80 rounded-xl hover:bg-white transition-colors"
              >
                Skip
              </button>
            </div>

            <div className="space-y-3">
              {caseFile.problemUnderstanding.missing_info_questions.map((q, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-2xl border border-blue-100 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    {idx + 1}. {q}
                  </label>
                  <input 
                    type="text"
                    value={clarificationAnswers[q] || ""}
                    onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    placeholder="Enter details to clarify..."
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => {
                  if (onClarificationSubmit) {
                    onClarificationSubmit(clarificationAnswers);
                  }
                  setDismissClarification(true);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                Submit Answers & Proceed
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="relative">
          {activeTab === 'case' && (
            <CaseFileView 
              caseFile={caseFile} 
              selectedDocId={selectedDocId}
              onSelectDocId={onSelectDocId}
              onNavigateUpload={onNavigateUpload}
              onNavigateDocsList={() => handleTabChange('documents')}
              onViewEvidence={viewEvidence} 
              onConfirmFields={onConfirmFields}
              onReExtract={onReExtract}
              onUpdateField={onUpdateField}
              onFileUpload={onFileUpload}
              onUpdateGoal={onUpdateGoal}
              language={language}
            />
          )}
          {activeTab === 'plan' && (
            <ActionGraphView 
              actions={caseFile.actions} 
              hasVerifiedRules={Boolean(caseFile.requirements && caseFile.requirements.length > 0 && caseFile.readiness?.checks && caseFile.readiness.checks.length > 0)}
              onViewEvidence={viewEvidence} 
              language={language}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentCheckView 
              documents={caseFile.documents} 
              onFileUpload={onFileUpload}
              onNavigateUpload={onNavigateUpload}
              onSelectDocument={(docId) => {
                onSelectDocId(docId);
                handleTabChange('case');
              }}
              onRemoveDocument={onRemoveDocument}
              onConfirmFields={onConfirmFields}
              onBackToUpload={onNavigateUpload}
              userConfirmed={caseFile.userConfirmed}
              isLoading={isLoading} 
              language={language}
            />
          )}
          {activeTab === 'readiness' && (
            <ReadinessAuditView 
              readiness={caseFile.readiness} 
              problemUnderstanding={caseFile.problemUnderstanding}
              requirements={caseFile.requirements}
              onUploadGuideline={onUploadGuideline}
              onSearchRules={onSearchRules}
              onResolve={() => handleTabChange('documents')} 
              isLoading={isLoading} 
              isSearchingRules={isSearchingRules}
              language={language}
            />
          )}
        </div>
      </main>

      {/* Confirmation Modal for "Start New Case" (Requirement 5: "This will clear all documents in the current case. Continue?") */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              Start New Case?
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              This will clear all documents in the current case. Continue?
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirmModal(false);
                  onReset();
                }}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                Clear & Start New Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Panel */}
      <EvidencePanel 
        evidenceId={selectedEvidenceId} 
        evidenceList={[
          {
            id: "SRC-001",
            title: "Universal Case Evidence & Grounding",
            sourceName: "DISHA Grounding Engine",
            url: "https://disha.gov.in",
            section: "Verbatim Quote Grounding Check",
            statement: "Every extracted fact is verified strictly against visible document text before presentation.",
            verified: true,
            confidence: "HIGH"
          }
        ]} 
        onClose={() => setSelectedEvidenceId(null)} 
      />
    </div>
  );
};
