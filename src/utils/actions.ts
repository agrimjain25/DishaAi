import { ActionNode, DocumentRecord, ReadinessEvaluation, ReadinessCheck } from '../types';

/**
 * Requirement 5: ACTION PLAN GENERATION
 * Generated from the failed/unknown checks ONLY (JSON schema: what, why, document_needed, where_to_get, deadline, status, requirement_id).
 * Each step links to its requirement's evidence and source. Do not add steps that have no linked requirement.
 */
export function generateActionPlan(
  caseGoal: string,
  documents: DocumentRecord[],
  readiness: ReadinessEvaluation,
  userConfirmed = false,
  serviceName = "Official Service"
): ActionNode[] {
  // Filter for failed or unknown checks ONLY (Requirement 5)
  const failedOrUnknownChecks = readiness.checks.filter(
    c => c.result === "fail" || c.result === "unknown"
  );

  if (failedOrUnknownChecks.length === 0) {
    return [];
  }

  return failedOrUnknownChecks.map((chk, idx) => {
    let what = `Fulfill requirement: ${chk.label}`;
    let why = chk.explanation || "Mandatory condition required by official guidelines.";
    let docNeeded = chk.field ? `${chk.field} documentation` : chk.label;
    let whereToGet = "Official Issuing Authority or Portal";
    let deadline = "Before official portal submission";
    let status: "CURRENT" | "PENDING" | "COMPLETE" = idx === 0 ? "CURRENT" : "PENDING";

    if (chk.check_type === "document_present") {
      what = `Obtain and attach ${chk.label}`;
      why = chk.explanation || "Document missing from submitted case repository.";
      docNeeded = chk.label;
      whereToGet = "Tahasildar Office / Revenue Department / Official Portal";
    } else if (chk.check_type === "year_match") {
      what = `Rectify academic / financial year discrepancy`;
      why = chk.explanation || "Certificate year does not match application session.";
      docNeeded = "Renewed or current session certificate";
      whereToGet = "Issuing Office for session update";
    } else if (chk.check_type === "name_match") {
      what = `Resolve spelling / name mismatch`;
      why = chk.explanation || "Name is not consistent across paperwork.";
      docNeeded = "Aadhaar / Gazette / Corrected Certificate";
      whereToGet = "Unique Identification Authority (UIDAI) / Issuing Authority";
    } else if (chk.check_type === "validity_date") {
      what = `Renew expired document`;
      why = chk.explanation || "Document validity has expired.";
      docNeeded = "Renewed Certificate / Clearance";
      whereToGet = "Designated Government Authority";
    } else if (chk.check_type === "deadline") {
      what = `Submit application before deadline`;
      why = chk.explanation || "Time-sensitive submission deadline active.";
      docNeeded = "Completed verification application";
      whereToGet = "Designated Online Portal";
      deadline = chk.expected || "Urgent deadline";
      status = "CURRENT";
    } else if (chk.check_type === "manual_review") {
      what = `Conduct physical / official verification: ${chk.label}`;
      why = chk.explanation || "AI-assessed condition requires manual validation.";
      docNeeded = "Original physical paperwork for verification";
      whereToGet = "Verification Officer / Citizen self-audit";
    }

    return {
      id: `ACT-${idx + 1}`,
      requirement_id: chk.requirement_id || chk.id,
      what,
      why,
      document_needed: docNeeded,
      where_to_get: whereToGet,
      deadline,
      status,
      evidence_quote: chk.evidence_quote || null,
      source_type: chk.source_type,
      source_url: chk.source_url,
      section: chk.section,
      // Legacy compatibility
      title: what,
      description: why,
      evidenceQuote: chk.evidence_quote || null
    };
  });
}
