import axios from 'axios';
import { 
  DocumentRecord, 
  OfficialRequirement, 
  ProblemUnderstanding, 
  ReadinessCheck, 
  ActionNode 
} from '../types';

// Cached library in memory
let cachedLibraries: any[] = [];

/**
 * Loads all curated requirements libraries from /requirements/*.json (Requirement 2.a)
 */
export async function loadCuratedLibraries(): Promise<any[]> {
  if (cachedLibraries.length > 0) {
    return cachedLibraries;
  }

  try {
    const res = await axios.get('/api/requirements/library');
    if (res.data?.success && Array.isArray(res.data.libraries) && res.data.libraries.length > 0) {
      cachedLibraries = res.data.libraries;
      return cachedLibraries;
    }
  } catch (err) {
    console.log("[LIBRARY FETCH NOTICE] Server library endpoint unavailable, trying static fetch:", (err as any)?.message || err);
  }

  // Fallback: static fetch from /requirements/nsp_scholarship.json
  try {
    const staticRes = await axios.get('/requirements/nsp_scholarship.json');
    if (staticRes.data && staticRes.data.requirements) {
      cachedLibraries = [staticRes.data];
      return cachedLibraries;
    }
  } catch (staticErr) {
    console.log("[LIBRARY FETCH NOTICE] Static fetch completed:", (staticErr as any)?.message || staticErr);
  }

  return [];
}

/**
 * Requirement 6: Safety Masking
 * Masks passwords, OTPs, and 12-digit Aadhaar numbers before sending to Gemini model.
 * Limits text to ~2000 characters.
 */
export function maskSensitiveData(input: string): { maskedText: string; wasMasked: boolean } {
  if (!input) return { maskedText: "", wasMasked: false };
  let text = input.slice(0, 2000);
  const original = text;

  // 12-digit Aadhaar pattern (with spaces or hyphens, or continuous 12 digits)
  text = text.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "XXXX-XXXX-XXXX [Aadhaar masked]");

  // Any standalone 12-digit number
  text = text.replace(/\b\d{12}\b/g, "XXXXXXXXXXXX [Masked]");

  // OTP patterns: e.g. "otp: 123456", "otp 123456", "otp is 482910"
  text = text.replace(/\b(?:otp|one time password|code)(?:[\s:=]+|[\s]+is[\s]+)(\d{4,8})\b/gi, (match, code) => {
    return match.replace(code, "****** [OTP masked]");
  });

  // Password patterns: e.g. "password: secret123", "password is mySecret"
  text = text.replace(/\b(?:password|pwd)(?:[\s:=]+|[\s]+is[\s]+)([^\s,;.]+)/gi, (match, pwd) => {
    return match.replace(pwd, "******** [Password masked]");
  });

  const wasMasked = text !== original;
  return { maskedText: text, wasMasked };
}

/**
 * Requirement 4: FACTS FROM THE USER'S TEXT
 * Treat facts the user writes (e.g. "my income certificate is from 2024", "deadline is 15 Oct")
 * as "User stated" facts, labelled separately from document-extracted facts.
 * They can fill gaps but must NOT count as grounded, and must NOT satisfy document_present by themselves.
 */
export function extractUserStatedFacts(text: string): { label: string; value: string; isGrounded: false }[] {
  if (!text || text.trim() === '') return [];
  const facts: { label: string; value: string; isGrounded: false }[] = [];
  
  // Year / Session fact
  const yearMatch = text.match(/(?:income\s*certificate|certificate|session|year)\s*(?:is|from|of|for|was)?\s*[:\s]?\s*(20\d\d(?:[-/]\d{2,4})?)/i) ||
    text.match(/\b(20\d\d[-/]\d{2,4})\b/);
  if (yearMatch) {
    facts.push({
      label: "Stated Certificate Year / Session",
      value: yearMatch[1],
      isGrounded: false
    });
  }

  // Name fact
  const nameMatch = text.match(/(?:my name is|applicant name is|candidate name is|name:?)\s*([A-Za-z\s]{3,30})/i);
  if (nameMatch) {
    facts.push({
      label: "Stated Applicant Name",
      value: nameMatch[1].trim(),
      isGrounded: false
    });
  }

  // Deadline fact
  const deadlineMatch = text.match(/(?:deadline|due date|last date)\s*(?:is|before|by)?\s*[:\s]?\s*([0-9A-Za-z\s,-]{4,20})/i);
  if (deadlineMatch) {
    facts.push({
      label: "Stated Deadline",
      value: deadlineMatch[1].trim(),
      isGrounded: false
    });
  }

  // Income / Amount fact
  const incomeMatch = text.match(/(?:income|annual income|salary)\s*(?:is|of)?\s*[:\s]?(?:rs\.?|inr|₹)?\s*([0-9,]+)/i);
  if (incomeMatch) {
    facts.push({
      label: "Stated Annual Income",
      value: `Rs. ${incomeMatch[1].trim()}`,
      isGrounded: false
    });
  }

  // Defect / Issue claim
  if (/\b(?:defective|defect)\b/i.test(text)) {
    facts.push({
      label: "Reported Application Status",
      value: "Defective",
      isGrounded: false
    });
  } else if (/\b(?:rejected|reject)\b/i.test(text)) {
    facts.push({
      label: "Reported Application Status",
      value: "Rejected",
      isGrounded: false
    });
  }

  return facts;
}

/**
 * Requirement 1 & 3: PROBLEM UNDERSTANDING
 * From Case Goal text and all extracted documents, call Gemini (temperature 0, JSON output)
 * to return: service_name, problem_type, user_stage, documents_to_upload, and missing_info_questions (max 3).
 */
export async function understandProblem(
  caseGoal: string,
  documents: DocumentRecord[]
): Promise<ProblemUnderstanding> {
  const docsSummary = documents.map(d => `${d.fileName} (${d.extraction.document_type}): ${d.extraction.summary}`).join("\n");
  const fields = documents.flatMap(d => d.extraction.fields);
  const goalLower = (caseGoal || "").toLowerCase();

  // Call server endpoint (all Gemini calls executed server-side)
  try {
    const res = await axios.post('/api/resolution/understand', {
      caseGoal,
      documentsSummary: docsSummary,
      extractedFields: fields
    });

    if (res.data?.success && res.data.result) {
      return res.data.result;
    }
  } catch (serverErr) {
    console.log("[UNDERSTAND API NOTICE] Server API unavailable, using resolution brain heuristic engine.");
  }

  // Deterministic fallback if server error or offline
  let serv = "Official Government Service";
  if (goalLower.includes("scholarship") || goalLower.includes("nsp") || goalLower.includes("matric")) {
    serv = "National Scholarship Portal (NSP)";
  } else if (goalLower.includes("income") || goalLower.includes("tahasildar")) {
    serv = "Revenue Department Income Certificate";
  } else if (goalLower.includes("caste") || goalLower.includes("obc") || goalLower.includes("sc") || goalLower.includes("st")) {
    serv = "Caste & Category Certificate";
  }

  return {
    service_name: serv,
    problem_type: goalLower.includes("reject") ? "rejected" : goalLower.includes("defect") ? "defective" : "general question",
    user_stage: "verification stage",
    documents_to_upload: (goalLower.includes("scholarship") || serv.includes("Scholarship"))
      ? ["Income Certificate (current session)", "Caste / Category Certificate (if applicable)", "Previous Year Marksheet", "Application Form / Defect Notice"]
      : ["Income Certificate", "Identity Proof / Certificate", "Application Form / Defect Notice"],
    missing_info_questions: [],
    is_clarification_needed: false
  };
}

/**
 * Requirement 2: REQUIREMENTS SOURCES
 * Resolves requirements according to priority:
 * 2.a Curated Library (/requirements/*.json) -> Label: "Verified library"
 * 2.b Uploaded official guideline/notice -> Label: "From your uploaded guideline"
 * 2.c Google Search grounding (.gov.in / .nic.in only) -> Label: "Found via search, please verify"
 * 2.d If none exists -> Show message. NEVER generate from model memory.
 */
export async function matchOrFetchRequirements(
  serviceName: string,
  caseGoal: string,
  userUploadedRequirements?: OfficialRequirement[] | null,
  allowSearch = false
): Promise<{ 
  requirements: OfficialRequirement[]; 
  sourceLabel: string; 
  searchUnavailable?: boolean; 
  noSourceExists?: boolean;
}> {
  // Source b: User has explicitly uploaded an official guideline / notice
  if (userUploadedRequirements && userUploadedRequirements.length > 0) {
    return {
      requirements: userUploadedRequirements,
      sourceLabel: "From your uploaded guideline"
    };
  }

  // Source a: Check curated library (/requirements/*.json)
  const libraries = await loadCuratedLibraries();
  const servNorm = serviceName.toLowerCase();
  const goalNorm = caseGoal.toLowerCase();

  const matchedLib = libraries.find(lib => {
    const nameMatch = lib.service_name && servNorm.includes(lib.service_name.toLowerCase());
    const aliasMatch = Array.isArray(lib.aliases) && lib.aliases.some((a: string) => 
      servNorm.includes(a.toLowerCase()) || goalNorm.includes(a.toLowerCase())
    );
    return nameMatch || aliasMatch;
  });

  if (matchedLib && Array.isArray(matchedLib.requirements) && matchedLib.requirements.length > 0) {
    const formatted = matchedLib.requirements.map((r: any) => ({
      ...r,
      source_type: "Verified library" as const,
      source_url: matchedLib.source_url || r.source_url || "TO BE VERIFIED BY USER",
      section: matchedLib.section || r.section || "Curated Library",
      last_verified: matchedLib.last_verified || r.last_verified || "TO BE VERIFIED BY USER"
    }));

    return {
      requirements: formatted,
      sourceLabel: "Verified library"
    };
  }

  // Source c: If allowSearch is requested, try Google Search grounding restricted to .gov.in, .nic.in
  if (allowSearch) {
    try {
      const res = await axios.post('/api/requirements/search-grounding', {
        service_name: serviceName,
        caseGoal
      });

      if (res.data?.success && Array.isArray(res.data.requirements) && res.data.requirements.length > 0) {
        return {
          requirements: res.data.requirements,
          sourceLabel: "Found via search, please verify"
        };
      }

      if (res.data?.unavailable) {
        return {
          requirements: [],
          sourceLabel: "Search unavailable",
          searchUnavailable: true,
          noSourceExists: true
        };
      }
    } catch (searchErr) {
      console.log("[SEARCH GROUNDING NOTICE] Search failed or unavailable:", (searchErr as any)?.message || searchErr);
      return {
        requirements: [],
        sourceLabel: "Search unavailable",
        searchUnavailable: true,
        noSourceExists: true
      };
    }
  }

  // Source d: If no source exists, return empty and flag noSourceExists
  // Never generate requirements from model memory!
  return {
    requirements: [],
    sourceLabel: "No verified source",
    noSourceExists: true
  };
}

/**
 * Requirement 2.b: Extract requirements from an uploaded official guideline / notice PDF or image
 */
export async function extractRequirementsFromGuideline(
  payload: { base64Data?: string; mimeType?: string; fileName?: string; text?: string }
): Promise<{ success: boolean; requirements: OfficialRequirement[]; service_name?: string; error?: string }> {
  try {
    const res = await axios.post('/api/requirements/extract-from-guideline', payload);
    if (res.data?.success && Array.isArray(res.data.requirements)) {
      return {
        success: true,
        requirements: res.data.requirements,
        service_name: res.data.service_name
      };
    }
  } catch (err: any) {
    console.log("[GUIDELINE EXTRACTION NOTICE] Server endpoint unavailable:", (err as any)?.message || err);
    return { success: false, requirements: [], error: err?.response?.data?.error || err?.message || "Guideline extraction failed." };
  }

  return { success: false, requirements: [], error: "Unable to extract requirements from guideline." };
}

/**
 * Requirement 5: ACTION PLAN GENERATION
 * Generated from failed/unknown checks ONLY (Gemini writes wording, temperature 0, JSON output).
 * Each step links to its requirement's evidence and source. Do NOT add steps without a linked requirement.
 */
export async function generateActionPlanFromChecks(
  failedOrUnknownChecks: ReadinessCheck[],
  serviceName: string,
  caseGoal: string
): Promise<ActionNode[]> {
  const isAskingErrors = /error|any\s*error|mistake|defect|check|wrong/i.test(caseGoal || "");
  const isJee = /jee|nta|joint\s*entrance/i.test(serviceName || "") || /jee|nta/i.test(caseGoal || "");

  if (!failedOrUnknownChecks || failedOrUnknownChecks.length === 0) {
    if (isAskingErrors || isJee) {
      return [
        {
          id: "ACT-1",
          requirement_id: "REQ-VERIFY-PORTAL",
          what: isJee 
            ? "Verify application details on official JEE Main portal" 
            : "Verify application details on official service portal",
          why: "DISHA could not check this against verified rules. Please verify on the official portal.",
          document_needed: isJee ? "Official JEE Main Information Bulletin / Portal Login" : "Official Service Guidelines",
          where_to_get: isJee ? "jeemain.nta.nic.in" : "Official Government Portal",
          deadline: "Before application submission or correction window closes",
          status: "CURRENT",
          title: isJee ? "Verify application details on official JEE Main portal" : "Verify application details on official service portal",
          description: "DISHA could not check this against verified rules. Please verify on the official portal.",
          evidence_quote: null,
          evidenceQuote: null
        }
      ];
    }
    return [];
  }

  // Call server endpoint (Gemini runs strictly on server)
  try {
    const res = await axios.post('/api/resolution/action-plan', {
      failedOrUnknownChecks,
      service_name: serviceName,
      caseGoal
    });

    if (res.data?.success && Array.isArray(res.data.actions)) {
      return res.data.actions;
    }
  } catch (serverErr) {
    console.log("[ACTION PLAN NOTICE] Server API unavailable, using deterministic mapping:", (serverErr as any)?.message || serverErr);
  }

  // Deterministic 1:1 mapping from failed/unknown checks (guaranteeing Requirement 5)
  return failedOrUnknownChecks.map((chk, idx) => ({
    id: `ACT-${idx + 1}`,
    requirement_id: chk.requirement_id,
    what: `Resolve requirement: ${chk.label}`,
    why: chk.explanation,
    document_needed: chk.field ? `${chk.field} documentation` : chk.label,
    where_to_get: "Concerned Issuing Authority / Official Portal",
    deadline: chk.check_type === "deadline" ? (chk.expected || "Immediate action required") : "Before submission",
    status: idx === 0 ? "CURRENT" : "PENDING",
    evidence_quote: chk.evidence_quote || null,
    source_type: chk.source_type,
    source_url: chk.source_url,
    section: chk.section,
    title: `Resolve requirement: ${chk.label}`,
    description: chk.explanation,
    evidenceQuote: chk.evidence_quote || null
  }));
}
