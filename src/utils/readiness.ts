import { DocumentRecord, ReadinessEvaluation, OfficialRequirement } from '../types';
import { executeRulesEngine } from './rulesEngine';

export interface ReadinessOptions {
  currentDate?: string; // YYYY-MM-DD
  caseGoal?: string;
  userText?: string;
  requirements?: OfficialRequirement[];
}

/**
 * Universal deterministic readiness evaluation across any number of documents.
 * Adheres strictly to Resolution Brain Requirements 3 & 4:
 * - any fail -> NOT READY
 * - unknown only -> NEEDS REVIEW
 * - READY only if every requirement came from a source, was checked, and passed.
 * - If no source exists -> "DISHA has no verified rules for this service yet. Upload the official guideline or open the official portal."
 */
export function evaluateReadiness(
  documents: DocumentRecord[],
  options: ReadinessOptions = {}
): ReadinessEvaluation {
  const todayStr = options.currentDate || "2026-10-06";

  // If requirements are provided from a verified source, execute the Rules Engine
  if (options.requirements && options.requirements.length > 0) {
    return executeRulesEngine(options.requirements, documents, todayStr, options.userText || options.caseGoal);
  }

  // Requirement 2.d: If no source exists, show:
  // "DISHA has no verified rules for this service yet. Upload the official guideline or open the official portal."
  // Never generate requirements from model memory.
  return {
    status: "NEEDS REVIEW",
    issues: ["No verified official rules loaded for this service."],
    checks: [],
    noSourceExists: true,
    summaryMessage: "DISHA has no verified rules for this service yet. Upload the official guideline or open the official portal."
  };
}
