export type ReadinessStatus = "READY" | "NOT READY" | "NEEDS REVIEW";
export type CheckResult = "pass" | "fail" | "unknown";
export type Language = "en" | "hi";

export type UniversalCategory = 
  | "person_name"
  | "relative_name"
  | "date_of_birth"
  | "date"
  | "validity_period"
  | "identifier_number"
  | "amount"
  | "address_or_location"
  | "issuing_authority"
  | "signature_or_seal"
  | "status_or_decision"
  | "reason_or_remark"
  | "deadline"
  | "category_or_claim"
  | "score_or_result"
  | "scheme_or_program"
  | "other";

export interface EvidenceRecord {
  id: string;
  title: string;
  sourceName: string;
  url: string;
  section?: string;
  statement: string;
  verified: boolean;
  lastVerified?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface UniversalField {
  id: string;
  label: string;
  value: string;
  category: UniversalCategory;
  evidence_quote: string;
  isGrounded?: boolean;
  groundingDetail?: string;
  isUserEdited?: boolean;
  ocrVerified?: boolean;
  ocrStatus?: 'verified' | 'unverified';
}

export interface ExtractionDiagnostics {
  fileName: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  base64Length: number;
  ocrVerifiedCount?: number;
  ocrTotalCount?: number;
  ocrFailureCount?: number;
  ocrSnippet?: string;
}

export interface UniversalDocumentExtraction {
  document_type: string;
  language_detected: string;
  quality_flag: "ok" | "blank_template" | "unreadable" | "partial";
  summary: string;
  raw_text: string;
  fields: UniversalField[];
  unclear_items: string[];
  groundedRatioText?: string;
  groundedCount?: number;
  totalFieldsCount?: number;
  diagnostics?: ExtractionDiagnostics;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  fileHash: string;
  uploadTimestamp: string;
  previewUrl?: string;
  base64Data?: string;
  userConfirmed?: boolean;
  extraction: UniversalDocumentExtraction;
}

export type CheckType = 
  | "document_present" 
  | "year_match" 
  | "name_match" 
  | "validity_date" 
  | "deadline" 
  | "field_present" 
  | "manual_review";

export type RequirementSourceType = 
  | "Verified library" 
  | "From your uploaded guideline" 
  | "Found via search, please verify" 
  | string;

export interface OfficialRequirement {
  id: string;
  label: string;
  title?: string;
  text?: string;
  check_type: CheckType;
  field?: string;
  expected?: string;
  evidence_quote?: string;
  source_type: RequirementSourceType;
  source_url: string;
  section: string;
  last_verified: string;
}

export interface ReadinessCheck {
  id: string;
  requirement_id?: string;
  label: string;
  field?: string;
  check_type?: CheckType;
  expected?: string;
  actual?: string | null;
  result: CheckResult;
  explanation: string;
  evidence_quote?: string | null;
  source_type?: string;
  source_url?: string;
  sourceUrl?: string;
  section?: string;
  last_verified?: string;
  isAiAssessed?: boolean;
}

export interface ReadinessEvaluation {
  status: ReadinessStatus;
  issues: string[];
  checks: ReadinessCheck[];
  summaryMessage?: string;
  sourceLabel?: string;
  noSourceExists?: boolean;
  searchUnavailable?: boolean;
}

export interface ActionNode {
  id: string;
  requirement_id?: string;
  what?: string;
  why?: string;
  document_needed?: string;
  where_to_get?: string;
  deadline?: string;
  status: "COMPLETE" | "CURRENT" | "PENDING";
  evidence_quote?: string | null;
  source_type?: string;
  source_url?: string;
  section?: string;
  // Backward compatibility
  title?: string;
  description?: string;
  evidenceQuote?: string | null;
}

export interface ProblemUnderstanding {
  service_name: string;
  problem_type: "rejected" | "defective" | "missing document" | "expired" | "mismatch" | "general question" | string;
  user_stage: string;
  missing_info_questions: string[];
  documents_to_upload?: string[];
  is_clarification_needed?: boolean;
  answers?: Record<string, string>;
}

export interface UserStatedFact {
  label: string;
  value: string;
  isGrounded: false;
}

export interface CaseFile {
  caseId: string;
  caseGoal: string;
  problemText?: string;
  userStatedFacts?: UserStatedFact[];
  source: "USER_UPLOAD";
  documents: DocumentRecord[];
  readiness: ReadinessEvaluation;
  actions: ActionNode[];
  problemUnderstanding?: ProblemUnderstanding;
  requirements?: OfficialRequirement[];
  workflowType: string;
  activeSchemeName: string | null;
  applicantName: string | null;
  issuingAuthority: string | null;
  deadline: string | null;
  groundedRatioText?: string;
  userConfirmed?: boolean;
}

export interface TextOnlyConsultation {
  problemText: string;
  understanding: ProblemUnderstanding;
}

export interface AppState {
  case: CaseFile | null;
  currentStep: number; // 0: Landing, 1: Intake, 2: Dashboard
  isLoading: boolean;
  loadingMessage?: string;
  loadingStage?: 1 | 2 | 3 | 4;
  textOnlyResult?: TextOnlyConsultation | null;
  error: string | null;
  errorDetails: string | null;
  errorType?: "API_ERROR" | "INVALID_JSON" | "SCHEMA_MISMATCH" | "BLANK_TEMPLATE" | "UNREADABLE" | "UNVERIFIED_EXTRACTION" | "RATE_LIMITED" | null;
  language: Language;
}
