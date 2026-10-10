import React, { useState, useRef, useEffect } from 'react';
import { CaseFile, Language, UniversalCategory, UniversalField } from '../types';
import { t } from '../utils/translations';
import { 
  Building2, 
  FileText, 
  Quote, 
  CheckCircle2, 
  Clock, 
  ZoomIn, 
  RotateCw, 
  Edit3, 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Target, 
  ArrowLeft, 
  Upload, 
  Layers,
  GitBranch,
  SearchCheck,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  CheckSquare,
  ExternalLink,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

interface CaseFileViewProps {
  caseFile: CaseFile;
  selectedDocId?: string | null;
  onSelectDocId?: (docId: string) => void;
  onNavigateUpload: () => void;
  onNavigateDocsList: () => void;
  onViewEvidence: (id: string) => void;
  onConfirmFields?: () => void;
  onReExtract?: () => void;
  onUpdateField?: (docId: string, fieldId: string, newValue: string) => void;
  onFileUpload?: (file: File) => void;
  onUpdateGoal?: (newGoal: string) => void;
  language: Language;
}

interface CollapsibleSectionDef {
  id: string;
  title: string;
  categories: UniversalCategory[];
}

const COLLAPSIBLE_SECTIONS: CollapsibleSectionDef[] = [
  {
    id: "identity",
    title: "Identity",
    categories: ["person_name", "identifier_number", "date_of_birth", "category_or_claim", "score_or_result"]
  },
  {
    id: "relatives",
    title: "Relatives",
    categories: ["relative_name"]
  },
  {
    id: "residence",
    title: "Residence",
    categories: ["address_or_location"]
  },
  {
    id: "income",
    title: "Income",
    categories: ["amount"]
  },
  {
    id: "dates_validity",
    title: "Dates & Validity",
    categories: ["date", "validity_period", "deadline"]
  },
  {
    id: "authority_verification",
    title: "Issuing Authority & Verification",
    categories: ["issuing_authority", "signature_or_seal", "status_or_decision", "reason_or_remark", "scheme_or_program", "other"]
  }
];

export const CaseFileView: React.FC<CaseFileViewProps> = ({ 
  caseFile, 
  selectedDocId,
  onSelectDocId,
  onNavigateUpload,
  onNavigateDocsList,
  onViewEvidence,
  onConfirmFields,
  onReExtract,
  onUpdateField,
  onFileUpload,
  onUpdateGoal,
  language 
}) => {
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editDraftValue, setEditDraftValue] = useState("");
  const [goalDraft, setGoalDraft] = useState(caseFile.caseGoal || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read aloud states (Requirement 6: browser speechSynthesis)
  const [isSpeakingActionPlan, setIsSpeakingActionPlan] = useState(false);
  const [isSpeakingReadiness, setIsSpeakingReadiness] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleReadActionPlan = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeakingActionPlan) {
      window.speechSynthesis.cancel();
      setIsSpeakingActionPlan(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingReadiness(false);

    let textToRead = language === 'hi' ? "कार्य योजना। " : "Action Plan. ";
    if (caseFile.actions.length === 0) {
      textToRead += (!caseFile.requirements || caseFile.requirements.length === 0 || !caseFile.readiness?.checks || caseFile.readiness.checks.length === 0)
        ? (language === 'hi'
            ? "दिशा सत्यापित नियमों के विरुद्ध इस दस्तावेज़ की जाँच नहीं कर सका। कृपया आधिकारिक पोर्टल पर पुष्टि करें।"
            : "DISHA could not check this against verified rules. Please verify on the official portal.")
        : (language === 'hi'
            ? "सभी आधिकारिक आवश्यकताएं सत्यापित हैं और पास हो चुकी हैं। कोई सुधारात्मक कार्रवाई आवश्यक नहीं है।"
            : "All verified requirements passed. No corrective action required.");
    } else {
      textToRead += `${caseFile.actions.length} ${language === 'hi' ? "कार्य कदम उत्पन्न हुए।" : "action items generated."} `;
      caseFile.actions.forEach((act, idx) => {
        textToRead += `${language === 'hi' ? `कदम ${idx + 1}:` : `Step ${idx + 1}:`} ${act.title || act.what}. ${language === 'hi' ? "कारण:" : "Reason:"} ${act.why || act.description}. `;
        if (act.document_needed) textToRead += `${language === 'hi' ? "आवश्यक दस्तावेज़:" : "Document needed:"} ${act.document_needed}. `;
        if (act.deadline) textToRead += `${language === 'hi' ? "समय सीमा:" : "Deadline:"} ${act.deadline}. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingActionPlan(false);
    utterance.onerror = () => setIsSpeakingActionPlan(false);

    setIsSpeakingActionPlan(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleReadReadiness = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeakingReadiness) {
      window.speechSynthesis.cancel();
      setIsSpeakingReadiness(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingActionPlan(false);

    let textToRead = `${language === 'hi' ? "तैयारी ऑडिट सारांश।" : "Readiness Audit Summary."} ${language === 'hi' ? "स्थिति:" : "Status:"} ${caseFile.readiness.status}. `;
    if (caseFile.readiness.summaryMessage) {
      textToRead += `${caseFile.readiness.summaryMessage}. `;
    }
    if (caseFile.readiness.issues.length > 0) {
      textToRead += `${language === 'hi' ? "ऑडिट समस्याएं:" : "Audit trail issues:"} ${caseFile.readiness.issues.join(". ")}. `;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingReadiness(false);
    utterance.onerror = () => setIsSpeakingReadiness(false);

    setIsSpeakingReadiness(true);
    window.speechSynthesis.speak(utterance);
  };

  // Show the first two sections expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "identity": true,
    "relatives": true,
    "residence": false,
    "income": false,
    "dates_validity": false,
    "authority_verification": false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Determine current active document (Requirement 6)
  const currentDoc = (selectedDocId && caseFile.documents.find(d => d.id === selectedDocId)) || caseFile.documents[0];
  const extraction = currentDoc?.extraction;
  const isConfirmed = Boolean(currentDoc?.userConfirmed || caseFile.userConfirmed);

  const fields = extraction?.fields || [];
  const groundedFieldsCount = fields.filter(f => f.isGrounded).length;
  // Requirement 7: Allow Confirm with 3+ fields found even if some are amber, once the user has reviewed them.
  const canConfirm = fields.length >= 3;

  // Requirement 5: Show "Stated claim, certificate required" only for category claims (OBC, SC, ST, EWS, caste, income group), never for PwD, gender or locations.
  const isCategoryClaim = (f: UniversalField) => {
    const labelLower = (f.label || "").toLowerCase();
    const valLower = (f.value || "").toLowerCase();

    if (
      labelLower.includes("pwd") || 
      labelLower.includes("disability") || 
      valLower.includes("disability") ||
      labelLower.includes("gender") || 
      labelLower.includes("sex") || 
      valLower === "male" || 
      valLower === "female" || 
      valLower === "transgender" ||
      labelLower.includes("state") || 
      labelLower.includes("location") || 
      labelLower.includes("address") || 
      labelLower.includes("village") || 
      labelLower.includes("district") || 
      labelLower.includes("nationality")
    ) {
      return false;
    }

    return /\b(obc|sc|st|ews|caste|category|creamy|non-creamy|ncl|income\s*group|community)\b/i.test(valLower) ||
      /\b(category|caste|reservation|quota|income\s*group|community)\b/i.test(labelLower);
  };

  // Header "Issuing Authority" must be filled from the extracted issuing_authority field across the case
  // Never show "Not specified" if such a field exists.
  const allDocFields = caseFile.documents.flatMap(d => d.extraction.fields);
  const authorityField = 
    fields.find(f => f.category === "issuing_authority") ||
    allDocFields.find(f => f.category === "issuing_authority") ||
    fields.find(f => /issuing\s*authority|issued\s*by|office\s*of|tahasildar/i.test(f.label)) ||
    allDocFields.find(f => /issuing\s*authority|issued\s*by|office\s*of|tahasildar/i.test(f.label));

  const issuingAuthorityValue = authorityField?.value || caseFile.issuingAuthority || null;

  // Scheme name if present
  const schemeField = fields.find(f => f.category === "scheme_or_program") ||
    allDocFields.find(f => f.category === "scheme_or_program");

  const handleStartEdit = (field: UniversalField) => {
    setEditingFieldId(field.id);
    setEditDraftValue(field.value);
  };

  const handleSaveEdit = (fieldId: string) => {
    if (onUpdateField && currentDoc) {
      onUpdateField(currentDoc.id, fieldId, editDraftValue);
    }
    setEditingFieldId(null);
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditDraftValue("");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Row: Back Arrow to Documents List & Document Switcher Tabs (Requirements 6 & 7) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* On-screen Back Arrow: Details -> Documents list */}
        <button
          onClick={onNavigateDocsList}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit group text-xs font-semibold py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Documents List</span>
        </button>

        {/* Small tab / dropdown at top to switch between documents of the case (Requirement 6) */}
        {caseFile.documents.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Switch Document:
            </span>

            {/* Pill tabs for documents */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {caseFile.documents.map((doc, idx) => {
                const isActive = doc.id === currentDoc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelectDocId?.(doc.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[140px]">{doc.fileName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      #{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Banner: Verification Confirmation Advisory & Action Buttons */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        isConfirmed
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-amber-50 border-amber-200 text-amber-900"
      }`}>
        <div className="flex items-center gap-3">
          {isConfirmed ? (
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {isConfirmed ? "Confirmed by Citizen" : "Extracted, please confirm"}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {isConfirmed 
                ? "You have reviewed and confirmed that extracted fields match your uploaded document." 
                : canConfirm
                  ? "Compare the extracted fields below against your original uploaded document preview."
                  : "At least 3 grounded fields are required to confirm this case file."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          {/* Requirement 1: "Upload New Document" button in the Case File header (next to Re-extract / Confirm).
              Clicking it returns to the upload screen WITHOUT deleting the current case. */}
          <button
            onClick={onNavigateUpload}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Document</span>
          </button>

          {/* Add another document button (Requirement 5: also goes to the same upload screen) */}
          <button
            onClick={onNavigateUpload}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add another document</span>
          </button>

          {onReExtract && (
            <button
              onClick={onReExtract}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Re-extract</span>
            </button>
          )}

          {!isConfirmed && onConfirmFields && (
            <button
              onClick={onConfirmFields}
              disabled={!canConfirm}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              title={canConfirm ? "Confirm extracted facts" : "Requires at least 3 fields found"}
            >
              Confirm Extracted Facts
            </button>
          )}
        </div>
      </div>

      {/* Main Side-by-Side Comparison Layout */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Uploaded Document Image Preview */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Original Document Preview
                </h3>
              </div>
              {currentDoc?.previewUrl && (
                <button
                  onClick={() => setShowEnlargedImage(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Enlarge</span>
                </button>
              )}
            </div>

            {currentDoc?.previewUrl ? (
              <div className="relative flex-grow flex items-center justify-center bg-slate-100/70 rounded-2xl p-2 border border-slate-200/80 overflow-hidden min-h-[380px] max-h-[580px]">
                {currentDoc.mimeType === 'application/pdf' ? (
                  <embed 
                    src={currentDoc.previewUrl} 
                    type="application/pdf" 
                    className="w-full h-[450px] rounded-xl"
                  />
                ) : (
                  <img
                    src={currentDoc.previewUrl}
                    alt={currentDoc.fileName}
                    className="w-full h-full object-contain max-h-[540px] rounded-xl cursor-zoom-in"
                    onClick={() => setShowEnlargedImage(true)}
                  />
                )}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center min-h-[320px]">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">{currentDoc?.fileName}</p>
                <p className="text-[10px] text-slate-400 mt-1">{currentDoc?.fileSize}</p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] truncate max-w-[200px]">{currentDoc?.fileName}</span>
              <span className="text-[10px] font-mono text-slate-400">{currentDoc?.fileSize}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Universal Case File & Fields Grouped by Collapsible Sections */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          {/* Requirement 6 & 8: Case goal text box reading/updating all documents */}
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                Case Goal & Problem Description
              </label>
              <span className="text-[10px] text-blue-600 font-medium">Applied across all case documents</span>
            </div>
            <div className="flex flex-col gap-2">
              <textarea
                rows={goalDraft.includes('\n') ? 3 : 2}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={() => onUpdateGoal && onUpdateGoal(goalDraft)}
                placeholder="e.g. My scholarship application shows Defective. I don't understand why."
                className="w-full text-xs font-semibold p-2.5 bg-white border border-blue-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs leading-relaxed"
              />
              {onUpdateGoal && (
                <div className="flex justify-end">
                  <button
                    onClick={() => onUpdateGoal(goalDraft)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    Update Goal
                  </button>
                </div>
              )}
            </div>

            {/* Requirement 4: Display User Stated Facts separately from document-extracted facts */}
            {caseFile.userStatedFacts && caseFile.userStatedFacts.length > 0 && (
              <div className="pt-2 border-t border-blue-100/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    User-Stated Context
                  </span>
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    User stated · Not grounded in document
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                  {caseFile.userStatedFacts.map((fact, fIdx) => (
                    <div key={fIdx} className="bg-white/80 p-2 rounded-xl border border-blue-100 flex items-center justify-between gap-2">
                      <span className="text-slate-500 text-[11px] font-medium truncate">{fact.label}:</span>
                      <span className="text-slate-800 font-bold text-[11px] shrink-0">{fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Header: Document Type, Summary, Issuing Authority */}
          <section className="border-b border-slate-100 pb-6 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                {extraction?.document_type || "Universal Record"}
              </span>
              {extraction?.language_detected && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  Lang: {extraction.language_detected.toUpperCase()}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 leading-snug">
              {extraction?.document_type || "Extracted Document"}
            </h3>

            {/* Document Summary */}
            {extraction?.summary && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {extraction.summary}
              </p>
            )}

            {/* Requirement 1: Header "Issuing Authority" filled from extracted issuing_authority field across the case */}
            <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-50 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Issuing Authority:</span>
                <span className="font-semibold text-slate-800 break-words">
                  {issuingAuthorityValue ? issuingAuthorityValue : "Not specified in document"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Scheme / Program:</span>
                <span className="font-semibold text-slate-800 break-words">
                  {schemeField ? schemeField.value : "Not found in document"}
                </span>
              </div>
            </div>
          </section>

          {/* Grounding Status: "X of Y fields found in document text. Please verify against the preview." (Requirement 4) */}
          <section className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Status:</span>
              <span className="text-[11px] text-slate-500">
                {`${groundedFieldsCount} of ${fields.length} fields found in document text. Please verify against the preview.`}
              </span>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
              {extraction?.groundedRatioText || `${groundedFieldsCount} of ${fields.length} fields found in document text. Please verify against the preview.`}
            </span>
          </section>

          {/* Collapsible sections by category */}
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Extracted Facts & Literal Evidence
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {fields.length} total fields
              </span>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No fields extracted.</p>
            ) : (
              COLLAPSIBLE_SECTIONS.map((sectionDef) => {
                const sectionFields = fields.filter(f => sectionDef.categories.includes(f.category));
                if (sectionFields.length === 0) return null;

                const isExpanded = Boolean(expandedSections[sectionDef.id]);

                return (
                  <div 
                    key={sectionDef.id} 
                    className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all"
                  >
                    {/* Collapsible Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionDef.id)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left font-medium select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-800">
                          {sectionDef.title}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                          {sectionFields.length}
                        </span>
                      </div>
                      <div className="text-slate-400 hover:text-slate-600 transition-transform">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {/* Section Fields (shown when expanded) */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100 animate-in fade-in duration-200">
                        {sectionFields.map(field => {
                          const isEditing = editingFieldId === field.id;
                          const showClaim = isCategoryClaim(field);

                          return (
                            <div 
                              key={field.id} 
                              className={`p-3.5 rounded-2xl border transition-all text-left ${
                                field.isGrounded 
                                  ? "bg-slate-50/80 border-slate-200/70 hover:border-slate-300" 
                                  : "bg-amber-50/40 border-amber-200/80"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-grow">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-600">
                                      {field.label}
                                    </span>

                                    {field.isGrounded ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                        Grounded
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                        needs your check
                                      </span>
                                    )}

                                    {showClaim && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                        Stated claim, certificate required
                                      </span>
                                    )}
                                  </div>

                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <input
                                        type="text"
                                        value={editDraftValue}
                                        onChange={(e) => setEditDraftValue(e.target.value)}
                                        className="flex-grow text-xs font-bold px-2 py-1 bg-white border border-blue-400 rounded-lg text-slate-900"
                                        autoFocus
                                      />
                                      <button 
                                        onClick={() => handleSaveEdit(field.id)} 
                                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={handleCancelEdit} 
                                        className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-sm font-bold text-slate-900 block break-words">
                                      {field.value}
                                    </span>
                                  )}
                                </div>

                                {!isEditing && onUpdateField && (
                                  <button
                                    onClick={() => handleStartEdit(field)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit value"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {field.evidence_quote && (
                                <p className="text-[11px] text-slate-500 italic mt-2 bg-white/70 p-2 rounded-lg border border-slate-100 flex items-start gap-1">
                                  <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span>"{field.evidence_quote}"</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>

      {/* Requirement 8: Normal Resolution Result Flow
          Case File -> Evidence / Requirements -> Action Plan -> Document Checks -> Readiness Audit
          Ensure the user is never left on an extraction-only result after answering questions. */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Case Resolution Analysis & Action Steps
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Resolution Brain
          </span>
        </div>

        {/* 1. Evidence / Requirements Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                1. Evidence / Verified Requirements
              </h4>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Source: {caseFile.readiness.sourceLabel || "Verified library"}
            </span>
          </div>

          {caseFile.readiness.noSourceExists || !caseFile.requirements || caseFile.requirements.length === 0 ? (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No Verified Rules Loaded in Curated Library</p>
                <p className="mt-0.5 text-amber-800">
                  DISHA has no verified rules for this service yet. Upload the official guideline or open the official portal.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {caseFile.requirements.map((req, idx) => {
                const check = caseFile.readiness.checks.find(c => c.requirement_id === req.id);
                const result = check?.result || "unknown";
                return (
                  <div key={idx} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 leading-snug">
                        {req.label || req.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        result === 'pass'
                          ? "bg-emerald-100 text-emerald-800"
                          : result === 'fail'
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}>
                        {result === 'pass' ? "PASS" : result === 'fail' ? "FAIL" : "NEEDS REVIEW"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-700">Expected:</strong> {req.expected}
                    </p>

                    {req.evidence_quote && (
                      <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-200/60 flex items-start gap-1">
                        <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>"{req.evidence_quote}"</span>
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>Type: {req.check_type}</span>
                      <span>{req.section || req.source_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Action Plan Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                2. Action Plan
              </h4>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleReadActionPlan}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  isSpeakingActionPlan 
                    ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
                title={isSpeakingActionPlan ? "Stop reading" : "Read aloud action plan"}
              >
                {isSpeakingActionPlan ? (
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
              <span className="text-xs text-slate-500 font-medium">
                {caseFile.actions.length} action item{caseFile.actions.length === 1 ? "" : "s"} generated
              </span>
            </div>
          </div>

          {caseFile.actions.length === 0 ? (
            (!caseFile.requirements || caseFile.requirements.length === 0 || !caseFile.readiness?.checks || caseFile.readiness.checks.length === 0) ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>DISHA could not check this against verified rules. Please verify on the official portal.</span>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All verified requirements passed. No corrective action required.</span>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {caseFile.actions.map((action, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        action.status === 'CURRENT'
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {action.status || "STEP"} #{idx + 1}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900">
                        {action.what || action.title}
                      </h5>
                    </div>
                    {action.deadline && (
                      <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        Deadline: {action.deadline}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Reason:</strong> {action.why || action.description}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    {action.document_needed && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                        <span className="text-slate-400 block font-semibold text-[10px]">Document Needed:</span>
                        <span className="text-slate-700 font-medium">{action.document_needed}</span>
                      </div>
                    )}
                    {action.where_to_get && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                        <span className="text-slate-400 block font-semibold text-[10px]">Where to Obtain:</span>
                        <span className="text-slate-700 font-medium">{action.where_to_get}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Document Checks Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SearchCheck className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                3. Document Checks & Mismatch Detection
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Deterministic verification against all case documents
            </span>
          </div>

          {/* Mismatch Detection Alert Banner (Requirement 2 & Test 2) */}
          {caseFile.readiness.issues.some(i => i.toLowerCase().includes("mismatch")) && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Mismatch Detected in Case File</span>
              </div>
              {caseFile.readiness.issues.filter(i => i.toLowerCase().includes("mismatch")).map((iss, iIdx) => (
                <p key={iIdx} className="text-red-800 font-medium">
                  {iss} <span className="text-red-950 font-bold">Document-grounded value remains authoritative.</span>
                </p>
              ))}
            </div>
          )}

          {caseFile.readiness.checks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No deterministic checks evaluated.</p>
          ) : (
            <div className="space-y-2.5">
              {caseFile.readiness.checks.map((chk, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    chk.result === 'pass'
                      ? "bg-slate-50 border-slate-200/80"
                      : chk.result === 'fail'
                        ? "bg-red-50/50 border-red-200"
                        : "bg-amber-50/50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {chk.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      chk.result === 'pass'
                        ? "bg-emerald-100 text-emerald-800"
                        : chk.result === 'fail'
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }`}>
                      {chk.result === 'pass' ? "PASS" : chk.result === 'fail' ? "FAIL" : "NEEDS REVIEW"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {chk.explanation}
                  </p>

                  {chk.actual && (
                    <div className="mt-1.5 text-[10px] font-mono text-slate-500 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/60 inline-block">
                      Observed: {chk.actual}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Readiness Audit Section */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                4. Readiness Audit Summary
              </h4>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleReadReadiness}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  isSpeakingReadiness 
                    ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
                title={isSpeakingReadiness ? "Stop reading" : "Read aloud readiness audit"}
              >
                {isSpeakingReadiness ? (
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
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                caseFile.readiness.status === 'READY'
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : caseFile.readiness.status === 'NEEDS REVIEW'
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-red-100 text-red-800 border border-red-200"
              }`}>
                {caseFile.readiness.status}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            {caseFile.readiness.summaryMessage}
          </p>

          {caseFile.readiness.issues.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Audit Trail Issues ({caseFile.readiness.issues.length})
              </span>
              <ul className="space-y-1 text-xs text-slate-600">
                {caseFile.readiness.issues.map((iss, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold">•</span>
                    <span>{iss}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Enlarged Image Preview Modal */}
      {showEnlargedImage && currentDoc?.previewUrl && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowEnlargedImage(false)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 mb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">
                {currentDoc.fileName} - High Resolution View
              </h4>
              <button
                onClick={() => setShowEnlargedImage(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-grow overflow-auto p-2 bg-slate-100 rounded-2xl flex items-center justify-center">
              {currentDoc.mimeType === 'application/pdf' ? (
                <embed 
                  src={currentDoc.previewUrl} 
                  type="application/pdf" 
                  className="w-full h-[75vh] rounded-xl"
                />
              ) : (
                <img
                  src={currentDoc.previewUrl}
                  alt={currentDoc.fileName}
                  className="max-w-full max-h-[80vh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
