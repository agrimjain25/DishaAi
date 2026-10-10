import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { IntakeScreen } from './components/IntakeScreen';
import { Dashboard, TabType } from './components/Dashboard';
import { 
  CaseFile, 
  AppState, 
  DocumentRecord, 
  Language, 
  UniversalDocumentExtraction,
  UniversalField,
  OfficialRequirement,
  TextOnlyConsultation 
} from './types';
import { evaluateReadiness } from './utils/readiness';
import { generateActionPlan } from './utils/actions';
import { 
  understandProblem, 
  matchOrFetchRequirements, 
  extractRequirementsFromGuideline, 
  generateActionPlanFromChecks,
  extractUserStatedFacts,
  maskSensitiveData
} from './utils/resolutionBrain';
import { performGroundingCheck } from './utils/grounding';
import { t } from './utils/translations';
import axios from 'axios';
import { AlertCircle, Loader2, Languages, CheckCircle2 } from 'lucide-react';

// Single model name constant with default fallback
export const DEFAULT_GEMINI_MODEL = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GEMINI_MODEL 
  ? import.meta.env.VITE_GEMINI_MODEL 
  : 'gemini-3.8-flash').replace(/^models\//, '');

// Cache by file content hash (Requirement 3 & 6: Same file twice -> identical result)
const clientFileCache = new Map<string, DocumentRecord>();

async function computeFileSha256(dataStr: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    for (let i = 0; i < dataStr.length; i++) {
      hash = ((hash << 5) - hash) + dataStr.charCodeAt(i);
      hash |= 0;
    }
    return `hash-${Math.abs(hash)}`;
  }
}

export const resolveMimeType = (file: File): string => {
  if (file.type && file.type.trim() !== '' && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
};

/**
 * Requirement 1: Upscale images under 1600px width.
 * Set mimeType from extension if file.type is empty or octet-stream.
 */
export const processFileForUpload = (
  file: File
): Promise<{ base64Data: string; mimeType: string; fileName: string; fileSize: string; imageWidth?: number; imageHeight?: number }> => {
  const mimeType = resolveMimeType(file);

  return new Promise((resolve, reject) => {
    if (mimeType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Requirement 2: Upscale images under 1600px width on a canvas before sending, never compress below quality 0.9
          let targetWidth = width;
          let targetHeight = height;

          if (width < 1600 && width > 0) {
            targetWidth = 1600;
            targetHeight = Math.round((height * 1600) / width);
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            // Quality 0.94 (never compress below quality 0.9)
            const outMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(outMime, 0.94);
            const cleanBase64 = dataUrl.split(';base64,')[1];
            const approxBytes = Math.round((cleanBase64.length * 3) / 4);
            console.log(`[CLIENT IMAGE PROCESS] Original: ${width}x${height}, Target: ${targetWidth}x${targetHeight}, Quality: 0.94, Base64 length: ${cleanBase64.length}`);
            resolve({
              base64Data: cleanBase64,
              mimeType: outMime,
              fileName: file.name,
              fileSize: `${Math.round(approxBytes / 1024)} KB`,
              imageWidth: targetWidth,
              imageHeight: targetHeight
            });
            return;
          }

          const res = (e.target?.result as string) || '';
          const cleanBase64 = res.includes(';base64,') ? res.split(';base64,')[1] : res;
          resolve({
            base64Data: cleanBase64,
            mimeType,
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            imageWidth: width,
            imageHeight: height
          });
        };
        img.onerror = () => reject(new Error("UNREADABLE: Could not decode image file."));
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } else {
      // Normal read (PDF or other documents)
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const cleanBase64 = result.includes(';base64,') ? result.split(';base64,')[1] : result;
        resolve({
          base64Data: cleanBase64,
          mimeType,
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          imageWidth: 0,
          imageHeight: 0
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
};

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return cleaned;
}

// Requirement 3: Transcribe all table cells and labelled rows into raw_text first, then extract every label:value pair.
// Do not label a date unless the nearby label says so (e.g. Date of Birth must not become Date of Issue).
const UNIVERSAL_SYSTEM_INSTRUCTION = `You are a universal document-understanding engine. Look ONLY at the attached file.
CRITICAL MANDATES:
Step 1: Transcribe ALL visible text literally into raw_text. Transcribe ALL table cells and labelled rows into raw_text first (every single line, table cell, stamp, column header, row label, and note in the original language, preserving tabular associations and row order).
Step 2: Identify what the document is in plain words (document_type, free text, e.g. 'JEE Main Scorecard', 'Exam Scorecard', 'Income Certificate', 'Rejection Notice'). Do not force it into a fixed list.
Step 3: Extract EVERY label:value pair from ALL table cells, forms, and labelled rows into fields[]. Facts appear both as label:value pairs AND inside sentences. Extract from both. In examination scorecards, marksheets, and application forms, extract each individual subject score, percentile, total marks, rank, roll number, application number, candidate name, parents' names, category, gender, and state as its own distinct field without omission.
Step 4: Strict Date Labelling: Do NOT label a date unless the nearby label says so (e.g. "Date of Birth" must remain "Date of Birth" and must NEVER become "Date of Issue" or "Issue Date"; "Date of Examination" must not become "Date of Issue").
Step 5: For each item return:
  - label (descriptive name exactly matching the table header or row label, e.g. 'Mathematics NTA Score', 'Total NTA Score', 'Roll Number', 'Date of Birth')
  - value (verbatim as written)
  - category (one of: person_name, relative_name, date_of_birth, date, validity_period, identifier_number, amount, address_or_location, issuing_authority, signature_or_seal, status_or_decision, reason_or_remark, deadline, category_or_claim, score_or_result, scheme_or_program, other)
  - evidence_quote (exact literal text snippet from the document containing both the label and value).
Rules: Never guess, never infer, never use outside knowledge, never collapse multiple scorecard rows into one, never invent names, numbers, schemes or categories. If the document is blank, a template with empty inputs, or unreadable, say so in quality_flag and return an empty fields array. If a value is not literally in the document, do not return it.`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    case: null,
    currentStep: 0, // 0: Landing, 1: Intake, 2: Dashboard
    isLoading: false,
    loadingMessage: undefined,
    error: null,
    errorDetails: null,
    errorType: null,
    language: 'en'
  });

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<TabType>('case');
  const [isSearchingRules, setIsSearchingRules] = useState(false);
  const [configuredModel, setConfiguredModel] = useState<string>(DEFAULT_GEMINI_MODEL);

  React.useEffect(() => {
    axios.get('/api/gemini-config')
      .then(res => {
        if (res.data?.model) setConfiguredModel(res.data.model);
      })
      .catch(() => {});
  }, []);

  // Synchronize with browser Back and Forward buttons (Requirement 7: Details -> Documents list -> Upload screen)
  React.useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ screen: 'landing' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      const s = event.state;
      if (!s) return;

      if (s.screen === 'landing') {
        setState(prev => ({ ...prev, currentStep: 0, error: null, errorDetails: null }));
      } else if (s.screen === 'upload') {
        setState(prev => ({ ...prev, currentStep: 1, error: null, errorDetails: null }));
      } else if (s.screen === 'docs_list') {
        setState(prev => ({ ...prev, currentStep: 2, error: null, errorDetails: null }));
        setDashboardTab('documents');
      } else if (s.screen === 'details') {
        setState(prev => ({ ...prev, currentStep: 2, error: null, errorDetails: null }));
        setDashboardTab('case');
        if (s.docId) {
          setSelectedDocId(s.docId);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleLanguage = () => {
    setState(prev => ({
      ...prev,
      language: prev.language === 'en' ? 'hi' : 'en'
    }));
  };

  const startCase = () => {
    window.history.pushState({ screen: 'upload' }, '');
    setState(prev => ({ ...prev, currentStep: 1, error: null, errorDetails: null }));
  };

  // Requirement 1 & 5: Upload New Document & Add another document both go to the same upload screen without deleting the case
  const navigateToUpload = () => {
    window.history.pushState({ screen: 'upload' }, '');
    setState(prev => ({ ...prev, currentStep: 1, error: null, errorDetails: null }));
  };

  const returnToCurrentCase = () => {
    if (!state.case || state.case.documents.length === 0) return;
    const docId = selectedDocId || state.case.documents[0].id;
    setSelectedDocId(docId);
    setDashboardTab('case');
    window.history.pushState({ screen: 'details', docId }, '');
    setState(prev => ({ ...prev, currentStep: 2, error: null, errorDetails: null }));
  };

  // Requirement 5: Start New Case resets everything after user confirmation in the UI modal
  const startNewCase = () => {
    clientFileCache.clear();
    setSelectedDocId(null);
    setDashboardTab('case');
    window.history.pushState({ screen: 'upload' }, '');
    setState(prev => ({
      ...prev,
      case: null,
      currentStep: 1,
      isLoading: false,
      loadingMessage: undefined,
      loadingStage: undefined,
      textOnlyResult: null,
      error: null,
      errorDetails: null,
      errorType: null
    }));
  };

  const resetToLanding = () => {
    window.history.pushState({ screen: 'landing' }, '');
    setState(prev => ({
      ...prev,
      currentStep: 0,
      isLoading: false,
      loadingMessage: undefined,
      loadingStage: undefined,
      textOnlyResult: null,
      error: null,
      errorDetails: null,
      errorType: null
    }));
  };

  // Requirement 4: Remove document from case with confirm step, recalculating readiness across remaining docs
  const handleRemoveDocument = (docId: string) => {
    if (!state.case) return;
    const updatedDocs = state.case.documents.filter(d => d.id !== docId);
    if (updatedDocs.length === 0) {
      startNewCase();
      return;
    }
    const updatedCase = buildCaseFromDocuments(updatedDocs, state.case);
    setState(prev => ({
      ...prev,
      case: updatedCase
    }));
    if (selectedDocId === docId) {
      setSelectedDocId(updatedDocs[0].id);
    }
  };

  // Requirement 3: Citizen confirmation button handler
  // "Confirmed by Citizen" appears only after user clicks Confirm AND at least 3 grounded fields exist.
  const handleConfirmFields = () => {
    if (!state.case) return;
    const totalGrounded = state.case.documents.reduce(
      (acc, d) => acc + d.extraction.fields.filter(f => f.isGrounded).length, 
      0
    );

    if (totalGrounded < 3) {
      alert("At least 3 grounded fields are required before confirming the case file.");
      return;
    }

    const updatedDocs = state.case.documents.map(d => ({ ...d, userConfirmed: true }));
    const updatedCase: CaseFile = {
      ...state.case,
      userConfirmed: true,
      documents: updatedDocs,
      actions: generateActionPlan(
        state.case.caseGoal, 
        updatedDocs, 
        state.case.readiness, 
        true
      )
    };

    setState(prev => ({
      ...prev,
      case: updatedCase
    }));
  };

  /**
   * RESOLUTION BRAIN PIPELINE (Requirements 1, 2, 3, 4, 5)
   * 1. Understand Problem (Gemini temperature 0, JSON: service_name, problem_type, user_stage, missing_info_questions)
   * 2. Requirements Sources (curated library -> uploaded guideline -> search -> no source warning)
   * 3. Rules Engine (pure code, NO LLM: document_present, year_match, name_match, validity_date, deadline, field_present, manual_review)
   * 4. Readiness (any fail -> NOT READY; unknown only -> NEEDS REVIEW; READY only if all pass)
   * 5. Action Plan (generated from failed/unknown checks ONLY, each links to requirement evidence & source)
   */
  const runResolutionPipeline = async (
    docs: DocumentRecord[],
    goal: string,
    existingRequirements?: OfficialRequirement[] | null,
    answers?: Record<string, string>,
    allowSearch = false
  ) => {
    try {
      // Show loading indicator with stage feedback (Requirement 3 & 8)
      setState(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: "Understanding your problem...",
        loadingStage: 2,
        error: null,
        errorDetails: null,
        errorType: null
      }));

      // PRESERVE ORIGINAL CASE GOAL (Requirement 4)
      const originalGoal = goal;

      // Extract user-stated context & answers (Requirement 2 & 5)
      const answerEntries = answers ? Object.entries(answers).filter(([_, a]) => a && a.trim().length > 0) : [];
      const answersText = answerEntries.map(([q, a]) => `${q}: ${a}`).join("; ");
      const combinedUserText = answersText 
        ? `${originalGoal}\nClarifications: ${answersText}`
        : originalGoal;

      // Extract User Stated Facts (treat answers as User stated facts, not grounded)
      const extractedUserFacts = extractUserStatedFacts(combinedUserText);
      answerEntries.forEach(([q, a]) => {
        const shortLabel = q.length > 32 ? `${q.slice(0, 30)}...` : q;
        if (!extractedUserFacts.some(f => f.label.toLowerCase() === shortLabel.toLowerCase())) {
          extractedUserFacts.push({
            label: `Clarification (${shortLabel})`,
            value: a,
            isGrounded: false
          });
        }
      });

      // Step 1: Problem understanding
      const understanding = await understandProblem(combinedUserText, docs);
      if (answers) {
        understanding.answers = answers;
        understanding.is_clarification_needed = false;
      }

      // Step 2: Requirements Sources
      setState(prev => ({
        ...prev,
        loadingMessage: "Checking requirements...",
        loadingStage: 3
      }));

      const { requirements, sourceLabel, searchUnavailable, noSourceExists } = await matchOrFetchRequirements(
        understanding.service_name,
        combinedUserText,
        existingRequirements,
        allowSearch
      );

      // Step 3 & 4: Pure Code Rules Engine & Single Readiness status
      const readiness = evaluateReadiness(docs, {
        requirements,
        caseGoal: originalGoal,
        userText: combinedUserText,
        currentDate: "2026-10-06"
      });

      if (sourceLabel) readiness.sourceLabel = sourceLabel;
      if (searchUnavailable) readiness.searchUnavailable = true;
      if (noSourceExists) readiness.noSourceExists = true;

      // Step 5: Action Plan from failed/unknown checks (prioritizing user's stated question)
      setState(prev => ({
        ...prev,
        loadingMessage: "Preparing your plan...",
        loadingStage: 4
      }));

      const failedOrUnknown = readiness.checks.filter(c => c.result === "fail" || c.result === "unknown");
      const actions = await generateActionPlanFromChecks(
        failedOrUnknown,
        understanding.service_name,
        originalGoal
      );

      setState(prev => {
        if (!prev.case) {
          return {
            ...prev,
            isLoading: false,
            loadingMessage: undefined,
            loadingStage: undefined
          };
        }
        return {
          ...prev,
          isLoading: false,
          loadingMessage: undefined,
          loadingStage: undefined,
          case: {
            ...prev.case,
            caseGoal: originalGoal, // PRESERVE ORIGINAL CASE GOAL
            userStatedFacts: extractedUserFacts.length > 0 ? extractedUserFacts : prev.case.userStatedFacts,
            problemUnderstanding: understanding,
            requirements,
            readiness,
            actions
          }
        };
      });
    } catch (err) {
      console.log("[RESOLUTION PIPELINE NOTICE]:", (err as any)?.message || err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        loadingMessage: undefined,
        loadingStage: undefined
      }));
    }
  };

  // Requirement 4: Case goal update handler
  const handleUpdateGoal = (newGoal: string) => {
    if (!state.case) return;
    setState(prev => ({
      ...prev,
      case: prev.case ? { ...prev.case, caseGoal: newGoal } : null
    }));
    runResolutionPipeline(state.case.documents, newGoal, state.case.requirements);
  };

  // Requirement 2.b: Upload official guideline / notice PDF or image
  const handleUploadGuideline = async (file: File) => {
    if (!state.case) return;
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      loadingMessage: "Extracting official requirements with exact evidence quotes from uploaded guideline..." 
    }));
    try {
      const processed = await processFileForUpload(file);
      const res = await extractRequirementsFromGuideline(processed);
      if (res.success && res.requirements.length > 0) {
        await runResolutionPipeline(state.case.documents, state.case.caseGoal, res.requirements);
      } else {
        console.log("[GUIDELINE EXTRACTION NOTICE]:", res.error);
      }
    } catch (err) {
      console.log("[GUIDELINE UPLOAD NOTICE]:", (err as any)?.message || err);
    } finally {
      setState(prev => ({ ...prev, isLoading: false, loadingMessage: undefined }));
    }
  };

  // Requirement 2.c: Search official rules (.gov.in / .nic.in only)
  const handleSearchRules = async () => {
    if (!state.case) return;
    setIsSearchingRules(true);
    try {
      await runResolutionPipeline(state.case.documents, state.case.caseGoal, null, undefined, true);
    } finally {
      setIsSearchingRules(false);
    }
  };

  // Requirement 1: Citizen clarification submit
  const handleClarificationSubmit = async (answers: Record<string, string>) => {
    if (!state.case) return;
    await runResolutionPipeline(state.case.documents, state.case.caseGoal, state.case.requirements, answers);
  };

  // Inline field editing handler (Requirement 3)
  const handleUpdateField = (docId: string, fieldId: string, newValue: string) => {
    if (!state.case) return;

    const updatedDocs = state.case.documents.map(doc => {
      if (doc.id !== docId) return doc;
      const updatedFields = doc.extraction.fields.map(f => {
        if (f.id !== fieldId) return f;
        const isMatched = doc.extraction.raw_text.includes(newValue.trim());
        return {
          ...f,
          value: newValue,
          isUserEdited: true,
          isGrounded: isMatched ? true : f.isGrounded,
          groundingDetail: isMatched ? "Exact match in document text" : f.groundingDetail
        };
      });

      // Recalculate grounding stats
      const groundedCount = updatedFields.filter(f => f.isGrounded).length;
      const totalCount = updatedFields.length;
      return {
        ...doc,
        extraction: {
          ...doc.extraction,
          fields: updatedFields,
          groundedCount,
          totalFieldsCount: totalCount,
          groundedRatioText: `${groundedCount} of ${totalCount} fields found in document text. Please verify against the preview.`
        }
      };
    });

    const readiness = evaluateReadiness(updatedDocs, {
      caseGoal: state.case.caseGoal,
      requirements: state.case.requirements,
      currentDate: "2026-10-06"
    });
    const actions = generateActionPlan(
      state.case.caseGoal, 
      updatedDocs, 
      readiness, 
      Boolean(state.case.userConfirmed)
    );

    setState(prev => ({
      ...prev,
      case: prev.case ? {
        ...prev.case,
        documents: updatedDocs,
        readiness,
        actions
      } : null
    }));

    runResolutionPipeline(updatedDocs, state.case.caseGoal, state.case.requirements);
  };

  // Build or update a CaseFile from a list of documents
  const buildCaseFromDocuments = (
    documents: DocumentRecord[],
    existingCase: CaseFile | null
  ): CaseFile => {
    const caseGoal = existingCase?.caseGoal || "Review document facts and resolve requirements";
    const existingReqs = existingCase?.requirements || [];
    const readiness = evaluateReadiness(documents, {
      caseGoal,
      requirements: existingReqs,
      currentDate: "2026-10-06"
    });

    const primaryDoc = documents[0];
    const userConfirmed = Boolean(existingCase?.userConfirmed && documents.every(d => d.userConfirmed));
    const actions = generateActionPlan(caseGoal, documents, readiness, userConfirmed);

    // Find applicant name, scheme name, issuing authority, deadline
    const nameField = documents.flatMap(d => d.extraction.fields).find(f => f.category === "person_name");
    const schemeField = documents.flatMap(d => d.extraction.fields).find(f => f.category === "scheme_or_program");
    const authorityField = documents.flatMap(d => d.extraction.fields).find(f => f.category === "issuing_authority");
    const deadlineField = documents.flatMap(d => d.extraction.fields).find(f => f.category === "deadline");

    const newCase: CaseFile = {
      caseId: existingCase?.caseId || `CAS-${Math.floor(1000 + Math.random() * 9000)}`,
      caseGoal,
      source: "USER_UPLOAD",
      documents,
      readiness,
      actions,
      problemUnderstanding: existingCase?.problemUnderstanding,
      requirements: existingCase?.requirements,
      workflowType: primaryDoc ? primaryDoc.extraction.document_type : "Universal Case",
      activeSchemeName: schemeField ? schemeField.value : "Not found in document",
      applicantName: nameField ? nameField.value : null,
      issuingAuthority: authorityField ? authorityField.value : null,
      deadline: deadlineField ? deadlineField.value : null,
      groundedRatioText: primaryDoc?.extraction.groundedRatioText || "",
      userConfirmed
    };

    return newCase;
  };

  // Extract single document file (with caching and error handling)
  const extractSingleFile = async (file: File, reExtract = false): Promise<DocumentRecord> => {
    const { base64Data, mimeType, fileName, fileSize, imageWidth, imageHeight } = await processFileForUpload(file);
    if (base64Data.length < 100) {
      throw new Error(`UNREADABLE: File content is too small or empty (${base64Data.length} chars).`);
    }

    const fileHash = await computeFileSha256(base64Data);
    if (!reExtract && clientFileCache.has(fileHash)) {
      const cached = clientFileCache.get(fileHash)!;
      return {
        ...cached,
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userConfirmed: false
      };
    }

    if (reExtract) {
      clientFileCache.delete(fileHash);
    }

        let originalHash = '';
    try {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      originalHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}

    let extractedDoc: DocumentRecord | null = null;
    try {
      const response = await axios.post('/api/document/extract', {
        originalHash,
        base64Data,
        mimeType,
        fileName,
        fileSize,
        imageWidth,
        imageHeight,
        reExtract
      }, {
        headers: reExtract ? { 'x-re-extract': 'true' } : {}
      });

      if (response.data.success && response.data.document) {
        extractedDoc = response.data.document;
      } else {
        const errorType = response.data.errorType || "";
        const errorReason = response.data.errorReason || "";
        throw new Error(`${errorType || "UNREADABLE"}: ${errorReason || response.data.error || "Unable to extract facts"}`);
      }
    } catch (serverErr: any) {
      const msg = serverErr?.response?.data?.errorReason || serverErr?.response?.data?.error || serverErr?.message || '';
      throw new Error(msg || "Extraction failed.");
    }

    if (!extractedDoc) {
      throw new Error("UNREADABLE: No extraction facts returned from document.");
    }

    const finalDoc: DocumentRecord = {
      ...extractedDoc,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userConfirmed: false
    };

    clientFileCache.set(fileHash, finalDoc);
    return finalDoc;
  };

  /**
   * Primary Action: Upload & Resolve (Requirement 1, 2, 3, 4, 5, 6, 7)
   * Supports: (a) files + text, (b) files only, (c) text only (no file)
   */
  const handleUploadAndResolve = async (payload: { files: File[]; problemText: string; isReExtract?: boolean }) => {
    const { files, problemText, isReExtract = false } = payload;
    const trimmedText = (problemText || "").trim();

    // Safety masking (Requirement 6): Mask OTPs, passwords, and 12-digit numbers
    const { maskedText } = maskSensitiveData(trimmedText);

    // Flow 3: TEXT ONLY (no document attached)
    if (files.length === 0) {
      if (!trimmedText) return;

      setState(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: "Understanding your problem...",
        loadingStage: 2,
        error: null,
        errorDetails: null,
        errorType: null
      }));

      try {
        const understanding = await understandProblem(
          maskedText, 
          []
        );

        // Do NOT create a Case File with invented facts, do NOT show READY.
        // Return consultation on the upload screen and keep the text.
        setState(prev => ({
          ...prev,
          isLoading: false,
          loadingMessage: undefined,
          loadingStage: undefined,
          textOnlyResult: {
            problemText: trimmedText,
            understanding
          }
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          loadingMessage: undefined,
          loadingStage: undefined,
          error: "Could not assess problem text. Please verify your internet connection or upload a document.",
          errorDetails: err?.message || String(err),
          errorType: "API_ERROR"
        }));
      }
      return;
    }

    // Flow 2: SINGLE COMBINED FLOW (Files + optional text, or Files only)
    // Run in parallel: extraction for every uploaded file, then problem understanding,
    // then requirements matching, rules engine, readiness and Action Plan.
    // Progress indicator: "Reading documents..." -> "Understanding your problem..." -> "Checking requirements..." -> "Preparing your plan..."
    // Do NOT show a half-empty Case File while this runs.

    // Compute effective goal (save text as Case Goal; if existing goal, append with timestamp)
    let effectiveGoal = maskedText;
    if (state.case?.caseGoal) {
      if (maskedText) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        effectiveGoal = `${state.case.caseGoal}\n[${timestamp}]: ${maskedText}`;
      } else {
        effectiveGoal = state.case.caseGoal;
      }
    } else if (!effectiveGoal) {
      effectiveGoal = "Review document facts and resolve requirements";
    }

    try {
      // Stage 1: "Reading documents..."
      setState(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: "Reading documents...",
        loadingStage: 1,
        error: null,
        errorDetails: null,
        errorType: null
      }));

      // Extract all uploaded files in parallel
      const newlyExtractedDocs = await Promise.all(
        files.map(file => extractSingleFile(file, isReExtract))
      );

      let updatedDocs: DocumentRecord[];
      if (isReExtract && state.case?.documents && state.case.documents.length > 0) {
        const reExtracted = newlyExtractedDocs[0];
        const targetId = selectedDocId || state.case.documents[0].id;
        if (reExtracted) {
          updatedDocs = state.case.documents.map(d => (d.id === targetId || d.fileName === reExtracted.fileName) ? { ...reExtracted, id: d.id } : d);
        } else {
          updatedDocs = [...state.case.documents];
        }
      } else {
        const existingDocs = state.case?.documents || [];
        updatedDocs = [...existingDocs, ...newlyExtractedDocs];
      }

      // Stage 2: "Understanding your problem..."
      setState(prev => ({
        ...prev,
        loadingMessage: "Understanding your problem...",
        loadingStage: 2
      }));

      const understanding = await understandProblem(
        effectiveGoal,
        updatedDocs
      );

      // Stage 3: "Checking requirements..."
      setState(prev => ({
        ...prev,
        loadingMessage: "Checking requirements...",
        loadingStage: 3
      }));

      const { requirements, sourceLabel, searchUnavailable, noSourceExists } = await matchOrFetchRequirements(
        understanding.service_name,
        effectiveGoal,
        state.case?.requirements,
        false
      );

      // Rules engine check against ALL documents
      const readiness = evaluateReadiness(updatedDocs, {
        requirements,
        caseGoal: effectiveGoal,
        userText: maskedText || effectiveGoal,
        currentDate: "2026-10-06"
      });

      if (sourceLabel) readiness.sourceLabel = sourceLabel;
      if (searchUnavailable) readiness.searchUnavailable = true;
      if (noSourceExists) readiness.noSourceExists = true;

      // Stage 4: "Preparing your plan..."
      setState(prev => ({
        ...prev,
        loadingMessage: "Preparing your plan...",
        loadingStage: 4
      }));

      const failedOrUnknown = readiness.checks.filter(c => c.result === "fail" || c.result === "unknown");
      const actions = await generateActionPlanFromChecks(
        failedOrUnknown,
        understanding.service_name,
        effectiveGoal
      );

      // Extract User Stated Facts (Requirement 4)
      const userStatedFacts = extractUserStatedFacts(maskedText);

      // Identify primary fields
      const nameField = updatedDocs.flatMap(d => d.extraction.fields).find(f => f.category === "person_name");
      const schemeField = updatedDocs.flatMap(d => d.extraction.fields).find(f => f.category === "scheme_or_program");
      const authorityField = updatedDocs.flatMap(d => d.extraction.fields).find(f => f.category === "issuing_authority");
      const deadlineField = updatedDocs.flatMap(d => d.extraction.fields).find(f => f.category === "deadline");

      const newCase: CaseFile = {
        caseId: state.case?.caseId || `CAS-${Math.floor(1000 + Math.random() * 9000)}`,
        caseGoal: effectiveGoal,
        problemText: maskedText || undefined,
        userStatedFacts: userStatedFacts.length > 0 ? userStatedFacts : undefined,
        source: "USER_UPLOAD",
        documents: updatedDocs,
        readiness,
        actions,
        problemUnderstanding: understanding,
        requirements,
        workflowType: updatedDocs[0]?.extraction?.document_type || "Universal Case",
        activeSchemeName: schemeField ? schemeField.value : "Not found in document",
        applicantName: nameField ? nameField.value : null,
        issuingAuthority: authorityField ? authorityField.value : null,
        deadline: deadlineField ? deadlineField.value : null,
        groundedRatioText: updatedDocs[0]?.extraction?.groundedRatioText || "",
        userConfirmed: false
      };

      // Set focus to the newly uploaded document
      setSelectedDocId(newlyExtractedDocs[0].id);
      setDashboardTab('case');

      // Update browser history states (Details -> Documents list -> Upload screen)
      window.history.pushState({ screen: 'docs_list' }, '');
      window.history.pushState({ screen: 'details', docId: newlyExtractedDocs[0].id }, '');

      setState(prev => ({
        ...prev,
        case: newCase,
        currentStep: 2, // Go directly to Case File page
        isLoading: false,
        loadingMessage: undefined,
        loadingStage: undefined,
        textOnlyResult: null,
        error: null,
        errorDetails: null,
        errorType: null
      }));

    } catch (err: any) {
      console.log("[UPLOAD & RESOLVE NOTICE]:", err?.message || err);
      const errReason = err?.message || 'API_ERROR: Processing failed';
      let errorType: any = "API_ERROR";
      if (errReason.startsWith("BLANK_TEMPLATE")) errorType = "BLANK_TEMPLATE";
      else if (errReason.startsWith("UNREADABLE")) errorType = "UNREADABLE";
      else if (errReason.startsWith("INVALID_JSON")) errorType = "INVALID_JSON";
      else if (errReason.startsWith("SCHEMA_MISMATCH")) errorType = "SCHEMA_MISMATCH";
      else if (errReason.startsWith("RATE_LIMITED") || errReason.includes("429") || errReason.includes("Quota")) errorType = "RATE_LIMITED";

      setState(prev => ({
        ...prev,
        isLoading: false,
        loadingMessage: undefined,
        loadingStage: undefined,
        error: errorType === "RATE_LIMITED"
          ? "AI document extraction is temporarily rate limited. Please retry in a few moments."
          : "DISHA couldn't read case details from this document. Please upload a filled application, defect notice, or certificate.",
        errorDetails: errReason,
        errorType
      }));
    }
  };

  const handleUploadDocument = (file: File) => {
    handleUploadAndResolve({ files: [file], problemText: "" });
  };

  // Re-extract current document (Requirement 5: Add "Re-extract" bypass of the file-hash cache)
  const handleReExtract = () => {
    if (!state.case || state.case.documents.length === 0) return;
    const doc = (selectedDocId && state.case.documents.find(d => d.id === selectedDocId)) || state.case.documents[0];
    if (doc.base64Data) {
      // Clear client cache for this hash and re-run with reExtract bypass
      clientFileCache.delete(doc.fileHash);
      const byteCharacters = atob(doc.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mimeType });
      const file = new File([blob], doc.fileName, { type: doc.mimeType });
      handleUploadAndResolve({ files: [file], problemText: "", isReExtract: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 flex flex-col">
      {/* Global Language Toggle Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="text-slate-500 font-medium">
          {t(state.language, 'tagline')}
        </div>
        <div className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={toggleLanguage}
            className="flex items-center font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {state.language === 'en' ? 'हिन्दी (HI)' : 'English (EN)'}
          </button>
        </div>
      </div>

      <div className="flex-grow">
        {state.currentStep === 0 && (
          <LandingPage 
            onStart={startCase} 
            language={state.language}
          />
        )}

        {state.currentStep === 1 && (
          <IntakeScreen 
            onResolve={handleUploadAndResolve}
            onBack={resetToLanding} 
            hasActiveCase={Boolean(state.case && state.case.documents.length > 0)}
            onBackToCase={returnToCurrentCase}
            isLoading={state.isLoading}
            loadingMessage={state.loadingMessage}
            loadingStage={state.loadingStage}
            language={state.language}
            initialProblemText={state.textOnlyResult?.problemText || ""}
            textOnlyResult={state.textOnlyResult}
            onClearTextOnlyResult={() => setState(prev => ({ ...prev, textOnlyResult: null }))}
          />
        )}

        {state.currentStep === 2 && state.case && (
          <Dashboard 
            caseFile={state.case} 
            selectedDocId={selectedDocId}
            onSelectDocId={(id) => {
              setSelectedDocId(id);
              setDashboardTab('case');
              window.history.pushState({ screen: 'details', docId: id }, '');
            }}
            onRemoveDocument={handleRemoveDocument}
            onNavigateUpload={navigateToUpload}
            activeTab={dashboardTab}
            onTabChange={(tab) => {
              setDashboardTab(tab);
              if (tab === 'documents') {
                window.history.pushState({ screen: 'docs_list' }, '');
              } else if (tab === 'case' && selectedDocId) {
                window.history.pushState({ screen: 'details', docId: selectedDocId }, '');
              }
            }}
            onFileUpload={handleUploadDocument}
            onReset={startNewCase}
            onConfirmFields={handleConfirmFields}
            onUpdateGoal={handleUpdateGoal}
            onUpdateField={handleUpdateField}
            onReExtract={handleReExtract}
            onUploadGuideline={handleUploadGuideline}
            onSearchRules={handleSearchRules}
            isSearchingRules={isSearchingRules}
            onClarificationSubmit={handleClarificationSubmit}
            isLoading={state.isLoading}
            language={state.language}
          />
        )}
      </div>

      {/* 4-Stage Progress Indicator Modal (Requirement 2) */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {state.loadingMessage || "Resolving Your Case..."}
              </h4>
              <p className="text-xs text-slate-500">
                Examining paperwork and verifying requirements.
              </p>
            </div>

            {/* 4-Stage Progress Checklist */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2 text-xs">
              {[
                { stage: 1, label: t(state.language, 'readingDocuments') },
                { stage: 2, label: t(state.language, 'understandingProblem') },
                { stage: 3, label: t(state.language, 'checkingRequirements') },
                { stage: 4, label: t(state.language, 'preparingPlan') }
              ].map(({ stage, label }) => {
                const current = state.loadingStage || 1;
                const isPassed = current > stage;
                const isActive = current === stage;
                return (
                  <div key={stage} className="flex items-center gap-2.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isActive ? (
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={`text-xs ${
                      isActive ? "text-blue-700 font-bold" : isPassed ? "text-slate-700 font-medium" : "text-slate-400"
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Requirement 2: Error Card with specific diagnostic reason in small grey text */}
      {state.error && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {state.errorType === "BLANK_TEMPLATE" 
                ? "Unfilled Template Detected"
                : state.errorType === "UNREADABLE"
                  ? "Unreadable or Blank Document"
                  : state.errorType === "INVALID_JSON"
                    ? "Document Parsing Error"
                    : state.errorType === "RATE_LIMITED"
                      ? "Extraction Service Busy"
                      : t(state.language, 'blankErrorTitle')}
            </h3>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {state.errorType === "BLANK_TEMPLATE"
                ? "The uploaded file is a blank form template without completed inputs. Please upload a filled, signed, or stamped copy."
                : state.errorType === "UNREADABLE"
                  ? "DISHA could not transcribe visible text or extract facts from this file. Please ensure the document is clear and readable."
                  : state.errorType === "RATE_LIMITED"
                    ? "The AI document extraction service is temporarily rate limited. Please click Retry below in a moment."
                    : state.error}
            </p>

            {/* Diagnostic Reason in small grey text */}
            {state.errorDetails && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Diagnostic Reason ({state.errorType || "DIAGNOSTIC"})
                </span>
                <p className="text-xs text-slate-500 font-mono break-words max-h-28 overflow-y-auto leading-tight">
                  {state.errorDetails}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setState(prev => ({ ...prev, error: null, errorDetails: null, currentStep: 1 }))}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md"
              >
                {state.errorType === "RATE_LIMITED" ? "Retry Document Extraction" : t(state.language, 'tryAnotherFile')}
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null, errorDetails: null }))}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
