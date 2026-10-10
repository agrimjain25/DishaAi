import { 
  OfficialRequirement, 
  DocumentRecord, 
  ReadinessCheck, 
  ReadinessEvaluation, 
  ReadinessStatus,
  CheckResult 
} from '../types';

/**
 * Normalizes person names for cross-document consistency checks
 */
function normalizeName(rawName: string): string {
  if (!rawName) return "";
  let norm = rawName.toLowerCase().trim();
  // Strip common honorifics and prefixes
  norm = norm.replace(/\b(sri|shri|smt|mrs|mr|ms|kumari|dr|prof)\b\.?\s*/gi, "");
  // Strip punctuation and excess whitespace
  norm = norm.replace(/[^\w\s]/gi, " ").replace(/\s+/g, " ").trim();
  return norm;
}

/**
 * Extracts 4-digit years from a string
 */
function extractYears(text: string): number[] {
  if (!text) return [];
  const matches = text.match(/\b(19\d\d|20\d\d)\b/g);
  return matches ? matches.map(y => parseInt(y, 10)) : [];
}

/**
 * Parses date string into Date object if possible
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try direct parse
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 1900) {
    return direct;
  }
  // Try DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = dateStr.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  // Try YYYY-MM-DD
  const ymdMatch = dateStr.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  return null;
}

/**
 * Pure code Rules Engine (Requirement 3 & 4):
 * Runs each requirement's check_type against ALL documents in the case without any LLM.
 * Result per requirement: pass / fail / unknown.
 * "manual_review" is shown as "AI-assessed, verify" and NEVER counts as pass.
 * Contradictions between user's text and documents are flagged as mismatches (document value wins).
 */
export function executeRulesEngine(
  requirements: OfficialRequirement[],
  documents: DocumentRecord[],
  currentDateStr = "2026-10-06",
  userText?: string
): ReadinessEvaluation {
  const currentDate = parseDateString(currentDateStr) || new Date();
  const checks: ReadinessCheck[] = [];
  const issues: string[] = [];

  // Gather aggregate data across ALL documents
  const allFields = documents.flatMap(d => d.extraction.fields);
  const docTypes = documents.map(d => ({
    id: d.id,
    fileName: d.fileName,
    type: (d.extraction.document_type || "").toLowerCase(),
    summary: d.extraction.summary || "",
    rawText: d.extraction.raw_text || ""
  }));

  // Identify category claims (SC, ST, OBC, EWS, SEBC)
  const categoryClaims = allFields.filter(f => 
    f.category === "category_or_claim" ||
    (f.label && f.label.toLowerCase().includes("category")) ||
    (f.label && f.label.toLowerCase().includes("caste"))
  );

  // Identify all person names
  const personNameFields = allFields.filter(f => 
    f.category === "person_name" || 
    f.label.toLowerCase().includes("applicant") || 
    f.label.toLowerCase().includes("name") && !f.label.toLowerCase().includes("father") && !f.label.toLowerCase().includes("mother") && !f.label.toLowerCase().includes("husband")
  );

  for (const req of requirements) {
    const checkType = req.check_type || "manual_review";
    let result: CheckResult = "unknown";
    let explanation = "";
    let evidenceQuote: string | null = req.evidence_quote || null;
    let actualValue: string | null = null;
    let isAiAssessed = false;

    switch (checkType) {
      case "document_present": {
        const target = (req.field || req.label || "").toLowerCase();
        
        // Special condition: "Category certificate present if category is claimed"
        if (target.includes("category") || target.includes("caste")) {
          const hasClaim = categoryClaims.some(c => {
            const val = c.value.toLowerCase();
            return val.includes("obc") || val.includes("sc") || val.includes("st") || val.includes("ews") || val.includes("sebc");
          });

          if (!hasClaim && categoryClaims.length === 0) {
            // No category claimed, so certificate is not required
            result = "pass";
            explanation = "No reservation or special caste/category claim detected in submitted documents.";
            actualValue = "No claim stated";
            break;
          }

          // Category is claimed, check if caste/category certificate is present
          const foundCert = docTypes.find(d => 
            d.type.includes("caste") || 
            d.type.includes("category") || 
            d.rawText.toLowerCase().includes("caste certificate") ||
            d.rawText.toLowerCase().includes("community certificate")
          );

          if (foundCert) {
            result = "pass";
            explanation = `Category claimed and verified certificate attached: ${foundCert.fileName}.`;
            actualValue = foundCert.type;
            evidenceQuote = foundCert.summary;
          } else {
            result = "fail";
            explanation = `Category reservation claimed in paperwork, but official Category/Caste Certificate is missing.`;
            actualValue = "Missing certificate";
            issues.push(explanation);
          }
          break;
        }

        // General document present check (e.g. Income Certificate)
        // User stated facts must NOT satisfy document_present by themselves (Requirement 4)
        const matchDoc = docTypes.find(d => {
          if (target.includes("income") && (d.type.includes("income") || d.rawText.toLowerCase().includes("income certificate"))) {
            return true;
          }
          if (target.includes("scorecard") && (d.type.includes("scorecard") || d.type.includes("mark") || d.type.includes("exam"))) {
            return true;
          }
          return d.type.includes(target) || d.fileName.toLowerCase().includes(target);
        });

        if (matchDoc) {
          result = "pass";
          explanation = `Required document '${req.label}' is present in the case file (${matchDoc.fileName}).`;
          actualValue = matchDoc.type;
          evidenceQuote = matchDoc.summary;
        } else {
          result = "fail";
          explanation = `Required document '${req.label}' is missing from the case file.`;
          actualValue = "Document not found";
          issues.push(explanation);
        }
        break;
      }

      case "year_match": {
        // Collect years from income/dates vs document session years
        const dateFields = allFields.filter(f => 
          f.category === "date" || 
          f.category === "validity_period" || 
          f.label.toLowerCase().includes("financial") ||
          f.label.toLowerCase().includes("year") ||
          f.label.toLowerCase().includes("session")
        );

        const extractedYearsList: { year: number; rawSession?: string; field: string; quote: string }[] = [];
        dateFields.forEach(f => {
          const yrs = extractYears(f.value);
          const rawMatch = f.value.match(/20\d\d(?:[-/]\d{2,4})?/);
          yrs.forEach(y => extractedYearsList.push({ 
            year: y, 
            rawSession: rawMatch ? rawMatch[0] : String(y),
            field: f.label, 
            quote: f.evidence_quote 
          }));
        });

        // Check if user stated a year/session in problem text (Requirement 4 & Test d)
        let userStatedYearStr: string | null = null;
        let userStatedYearNum: number | null = null;
        if (userText) {
          const uMatch = userText.match(/(?:income\s*certificate|certificate|session)\s*(?:is|from|of|for|was)?\s*[:\s]?\s*(20\d\d(?:[-/]\d{2,4})?)/i) ||
            userText.match(/\b(20\d\d[-/]\d{2,4})\b/);
          if (uMatch) {
            userStatedYearStr = uMatch[1];
            userStatedYearNum = parseInt(uMatch[1].slice(0, 4), 10);
          }
        }

        const currentYear = currentDate.getFullYear();

        if (extractedYearsList.length > 0) {
          const docYear = extractedYearsList[0];

          // TEST (d) & TEST 2: If user stated year contradicts document year, flag mismatch (document value wins)
          if (userStatedYearNum && Math.abs(userStatedYearNum - docYear.year) > 0) {
            result = "fail";
            const docDisp = docYear.rawSession || String(docYear.year);
            const mismatchAlert = `Mismatch detected: user stated ${userStatedYearStr}, document states ${docDisp}.`;
            explanation = `${mismatchAlert} Document-grounded value remains authoritative.`;
            actualValue = `Document: ${docDisp} (User stated: ${userStatedYearStr})`;
            evidenceQuote = docYear.quote;
            if (!issues.includes(mismatchAlert)) issues.push(mismatchAlert);
            break;
          }

          // Check if any extracted year matches current/recent session (e.g. 2024-2026)
          const validRecentYears = extractedYearsList.filter(y => y.year >= currentYear - 1 && y.year <= currentYear + 1);
          if (validRecentYears.length > 0) {
            result = "pass";
            const matchY = validRecentYears[0];
            explanation = `Document year (${matchY.rawSession || matchY.year}) aligns with required session.`;
            actualValue = `${matchY.rawSession || matchY.year}`;
            evidenceQuote = matchY.quote || `Year ${matchY.year} confirmed in ${matchY.field}`;
          } else {
            result = "fail";
            explanation = `Certificate year (${docYear.rawSession || docYear.year}) does not match current application year (${currentYear}). Certificate may be outdated.`;
            actualValue = `${docYear.rawSession || docYear.year}`;
            evidenceQuote = docYear.quote;
            issues.push(explanation);
          }
        } else {
          result = "unknown";
          explanation = "Could not locate explicit financial year or session date in documents to verify year alignment.";
          actualValue = userStatedYearStr ? `User stated: ${userStatedYearStr} (Unverified in doc)` : "Year not specified";
        }
        break;
      }

      case "name_match": {
        // Check if user stated name contradicts document (Requirement 2 & Test 2)
        if (userText && personNameFields.length > 0) {
          const uNameMatch = userText.match(/(?:my name is|applicant name is|candidate name is|name[:\s])\s*([A-Za-z\s]{3,30})/i);
          if (uNameMatch) {
            const statedNorm = normalizeName(uNameMatch[1]);
            const docNorm = normalizeName(personNameFields[0].value);
            if (statedNorm && docNorm && statedNorm !== docNorm) {
              result = "fail";
              const mismatchAlert = `Mismatch detected: user stated ${uNameMatch[1].trim()}, document states ${personNameFields[0].value}.`;
              explanation = `${mismatchAlert} Document-grounded value remains authoritative.`;
              actualValue = `Document: ${personNameFields[0].value} (User stated: ${uNameMatch[1].trim()})`;
              evidenceQuote = personNameFields[0].evidence_quote;
              if (!issues.includes(mismatchAlert)) issues.push(mismatchAlert);
              break;
            }
          }
        }

        if (personNameFields.length < 2) {
          if (personNameFields.length === 1) {
            result = "pass";
            explanation = `Applicant name '${personNameFields[0].value}' established consistently.`;
            actualValue = personNameFields[0].value;
            evidenceQuote = personNameFields[0].evidence_quote;
          } else {
            result = "unknown";
            explanation = "No applicant person_name field detected across documents to compare.";
            actualValue = "None";
          }
          break;
        }

        // Compare distinct names
        const normalizedList = personNameFields.map(f => ({
          raw: f.value,
          norm: normalizeName(f.value),
          quote: f.evidence_quote
        }));

        const firstNorm = normalizedList[0].norm;
        const mismatch = normalizedList.find(n => n.norm !== firstNorm);

        if (!mismatch) {
          result = "pass";
          explanation = `Applicant name is spelled consistently across all documents ('${normalizedList[0].raw}').`;
          actualValue = normalizedList[0].raw;
          evidenceQuote = normalizedList[0].quote;
        } else {
          result = "fail";
          explanation = `Spelling discrepancy detected across documents: '${normalizedList[0].raw}' vs '${mismatch.raw}'. Flagged for correction.`;
          actualValue = `${normalizedList[0].raw} vs ${mismatch.raw}`;
          evidenceQuote = `${normalizedList[0].quote} | ${mismatch.quote}`;
          issues.push(explanation);
        }
        break;
      }

      case "validity_date": {
        const validityFields = allFields.filter(f => 
          f.category === "validity_period" || 
          f.label.toLowerCase().includes("valid") ||
          f.label.toLowerCase().includes("expiry")
        );

        if (validityFields.length === 0) {
          result = "unknown";
          explanation = "No explicit validity period or expiry date stated on document.";
          actualValue = "No validity field";
          break;
        }

        const validField = validityFields[0];
        const parsedExpiry = parseDateString(validField.value);

        if (parsedExpiry) {
          if (parsedExpiry.getTime() >= currentDate.getTime()) {
            result = "pass";
            explanation = `Document validity is active through ${parsedExpiry.toISOString().slice(0, 10)}.`;
            actualValue = parsedExpiry.toISOString().slice(0, 10);
            evidenceQuote = validField.evidence_quote;
          } else {
            result = "fail";
            explanation = `Document validity expired on ${parsedExpiry.toISOString().slice(0, 10)}. Renewal required.`;
            actualValue = `Expired ${parsedExpiry.toISOString().slice(0, 10)}`;
            evidenceQuote = validField.evidence_quote;
            issues.push(explanation);
          }
        } else {
          result = "unknown";
          explanation = `Document contains validity field '${validField.value}', but date could not be deterministically parsed.`;
          actualValue = validField.value;
          evidenceQuote = validField.evidence_quote;
        }
        break;
      }

      case "deadline": {
        const deadlineFields = allFields.filter(f => 
          f.category === "deadline" || 
          f.label.toLowerCase().includes("deadline") ||
          f.label.toLowerCase().includes("last date")
        );

        if (deadlineFields.length === 0) {
          // If requirement gives an expected deadline date
          const expectedDate = parseDateString(req.expected || "");
          if (expectedDate) {
            if (expectedDate.getTime() >= currentDate.getTime()) {
              result = "pass";
              explanation = `Application deadline (${expectedDate.toISOString().slice(0, 10)}) has not passed.`;
              actualValue = expectedDate.toISOString().slice(0, 10);
            } else {
              result = "fail";
              explanation = `Official submission deadline (${expectedDate.toISOString().slice(0, 10)}) has already passed.`;
              actualValue = "Deadline passed";
              issues.push(explanation);
            }
            break;
          }

          result = "unknown";
          explanation = "No specific deadline date detected in submitted documentation.";
          actualValue = "Unknown deadline";
          break;
        }

        const dl = deadlineFields[0];
        const parsedDl = parseDateString(dl.value);
        if (parsedDl) {
          if (parsedDl.getTime() >= currentDate.getTime()) {
            result = "pass";
            explanation = `Submission deadline (${parsedDl.toISOString().slice(0, 10)}) is active.`;
            actualValue = parsedDl.toISOString().slice(0, 10);
            evidenceQuote = dl.evidence_quote;
          } else {
            result = "fail";
            explanation = `Submission deadline (${parsedDl.toISOString().slice(0, 10)}) has already passed.`;
            actualValue = "Deadline passed";
            evidenceQuote = dl.evidence_quote;
            issues.push(explanation);
          }
        } else {
          result = "unknown";
          explanation = `Deadline text found ('${dl.value}'), but date could not be parsed.`;
          actualValue = dl.value;
          evidenceQuote = dl.evidence_quote;
        }
        break;
      }

      case "field_present": {
        const targetCategory = req.field || req.label;
        const matchingField = allFields.find(f => 
          f.category === targetCategory ||
          f.label.toLowerCase().includes(targetCategory.toLowerCase()) ||
          f.value.toLowerCase().includes(targetCategory.toLowerCase())
        );

        if (matchingField) {
          result = "pass";
          explanation = `Required field '${req.label}' verified: ${matchingField.label} = '${matchingField.value}'.`;
          actualValue = matchingField.value;
          evidenceQuote = matchingField.evidence_quote;
        } else {
          result = "fail";
          explanation = `Mandatory field '${req.label}' is missing from document facts.`;
          actualValue = "Field not present";
          issues.push(explanation);
        }
        break;
      }

      case "manual_review":
      default: {
        // Requirement 3: check_type "manual_review" is shown as "AI-assessed, verify" and NEVER counts as pass.
        result = "unknown";
        isAiAssessed = true;
        explanation = req.expected || "Condition requires manual administrative or physical verification.";
        actualValue = "Requires verification";
        break;
      }
    }

    checks.push({
      id: `CHK-${req.id}`,
      requirement_id: req.id,
      label: req.label,
      field: req.field,
      check_type: checkType,
      expected: req.expected,
      actual: actualValue,
      result,
      explanation,
      evidence_quote: evidenceQuote,
      source_type: req.source_type,
      source_url: req.source_url,
      sourceUrl: req.source_url,
      section: req.section,
      last_verified: req.last_verified,
      isAiAssessed
    });
  }

  // Cross-check: If any contradiction was detected between citizen text/answers and document facts
  // (Requirement 2 & TEST 2: "Mismatch detected: user stated X, document states Y. Document-grounded value remains authoritative.")
  if (userText) {
    // 1. Check stated year vs document years
    const uYrMatch = userText.match(/(?:income\s*certificate|certificate|session|financial\s*year)\s*(?:is|from|of|for|was)?\s*[:\s]?\s*(20\d\d(?:[-/]\d{2,4})?)/i) ||
      userText.match(/\b(20\d\d[-/]\d{2,4})\b/);
    if (uYrMatch) {
      const uYrStr = uYrMatch[1];
      const uYrNum = parseInt(uYrStr.slice(0, 4), 10);
      const docDateFields = allFields.filter(f => f.category === "date" || f.category === "validity_period" || /year|session|financial/i.test(f.label));
      for (const df of docDateFields) {
        const dYrs = extractYears(df.value);
        const dRawMatch = df.value.match(/20\d\d(?:[-/]\d{2,4})?/);
        const dRaw = dRawMatch ? dRawMatch[0] : (dYrs.length > 0 ? String(dYrs[0]) : null);
        if (dRaw && dYrs.length > 0) {
          const docYrNum = dYrs[0];
          if (Math.abs(uYrNum - docYrNum) > 0) {
            const mismatchAlert = `Mismatch detected: user stated ${uYrStr}, document states ${dRaw}.`;
            if (!issues.includes(mismatchAlert)) issues.push(mismatchAlert);
            if (!checks.some(c => c.explanation.includes(mismatchAlert))) {
              checks.push({
                id: `CHK-MISMATCH-YEAR`,
                requirement_id: `REQ-MISMATCH-YEAR`,
                label: `Session / Certificate Year Consistency`,
                field: "financial_year",
                check_type: "year_match",
                expected: "Citizen-stated certificate year aligns with document text",
                actual: `Document: ${dRaw} (User stated: ${uYrStr})`,
                result: "fail",
                explanation: `${mismatchAlert} Document-grounded value remains authoritative.`,
                evidence_quote: df.evidence_quote,
                source_type: "Verified library",
                isAiAssessed: false
              });
            }
            break;
          }
        }
      }
    }

    // 2. Check stated name vs document applicant name
    const uNameMatch = userText.match(/(?:my name is|applicant name is|candidate name is|name[:\s])\s*([A-Za-z\s]{3,30})/i);
    if (uNameMatch) {
      const uName = uNameMatch[1].trim();
      const uNorm = normalizeName(uName);
      if (personNameFields.length > 0) {
        const dName = personNameFields[0].value;
        const dNorm = normalizeName(dName);
        if (uNorm && dNorm && uNorm !== dNorm) {
          const mismatchAlert = `Mismatch detected: user stated ${uName}, document states ${dName}.`;
          if (!issues.includes(mismatchAlert)) issues.push(mismatchAlert);
          if (!checks.some(c => c.explanation.includes(mismatchAlert))) {
            checks.push({
              id: `CHK-MISMATCH-NAME`,
              requirement_id: `REQ-MISMATCH-NAME`,
              label: `Applicant Name Consistency`,
              field: "person_name",
              check_type: "name_match",
              expected: "Citizen-stated name aligns with document text",
              actual: `Document: ${dName} (User stated: ${uName})`,
              result: "fail",
              explanation: `${mismatchAlert} Document-grounded value remains authoritative.`,
              evidence_quote: personNameFields[0].evidence_quote,
              source_type: "Verified library",
              isAiAssessed: false
            });
          }
        }
      }
    }
  }

  // Requirement 4: READINESS
  // any fail -> NOT READY; unknown only -> NEEDS REVIEW; READY only if every requirement came from a source, was checked, and passed.
  let overallStatus: ReadinessStatus = "NOT READY";
  const hasFail = checks.some(c => c.result === "fail");
  const hasUnknown = checks.some(c => c.result === "unknown");
  const allPass = checks.length > 0 && checks.every(c => c.result === "pass");

  if (hasFail) {
    overallStatus = "NOT READY";
  } else if (allPass) {
    overallStatus = "READY";
  } else {
    // unknown only or empty
    overallStatus = "NEEDS REVIEW";
  }

  let summaryMsg = "";
  if (overallStatus === "READY") {
    summaryMsg = "All official requirements have passed against uploaded paperwork. Your case file is submission-ready.";
  } else if (overallStatus === "NOT READY") {
    summaryMsg = `NOT READY: ${issues.length} issue(s) detected across requirements checklist. Action steps generated below.`;
  } else {
    summaryMsg = "NEEDS REVIEW: One or more conditions require official clarification or manual verification before submission.";
  }

  return {
    status: overallStatus,
    issues,
    checks,
    summaryMessage: summaryMsg,
    sourceLabel: requirements[0]?.source_type || "Verified library"
  };
}

/**
 * Requirement 4: Extracts facts stated by the user in free text.
 * Labelled separately as "User stated" and NOT counted as grounded.
 */
export function extractUserStatedFacts(text?: string): { label: string; value: string; isGrounded: false }[] {
  if (!text) return [];
  const facts: { label: string; value: string; isGrounded: false }[] = [];

  // Match stated year / session
  const sessionMatch = text.match(/(?:income\s*certificate|certificate|session)\s*(?:is|from|of|for|was)?\s*[:\s]?\s*(20\d\d(?:[-/]\d{2,4})?)/i);
  if (sessionMatch) {
    facts.push({ label: "Stated Certificate Year", value: sessionMatch[1], isGrounded: false });
  }

  // Match stated deadline
  const dlMatch = text.match(/deadline\s*(?:is|on|before)?\s*[:\s]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?|[A-Za-z]+\s+\d{1,2}|[0-9]{1,2}[-/][0-9]{1,2}(?:[-/]\d{2,4})?)/i);
  if (dlMatch) {
    facts.push({ label: "Stated Deadline", value: dlMatch[1], isGrounded: false });
  }

  // Match stated applicant name
  const nameMatch = text.match(/(?:my name is|applicant name is|candidate name is)\s*([A-Za-z\s]{3,30})/i);
  if (nameMatch) {
    facts.push({ label: "Stated Applicant Name", value: nameMatch[1].trim(), isGrounded: false });
  }

  // Match stated category
  const catMatch = text.match(/\b(obc|sc|st|ews|sebc|general)\b/i);
  if (catMatch) {
    facts.push({ label: "Stated Category", value: catMatch[1].toUpperCase(), isGrounded: false });
  }

  // Match stated income amount
  const incMatch = text.match(/(?:income|salary|annual income)\s*(?:is|of)?\s*[:\s]?\s*(?:rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (incMatch) {
    facts.push({ label: "Stated Income", value: incMatch[1], isGrounded: false });
  }

  return facts;
}
