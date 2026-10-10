import { UniversalField, UniversalCategory } from '../types';

/**
 * Normalizes text: lowercase, strip punctuation and apostrophes, collapse whitespace and newlines.
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes numbers: removes commas, spaces, currency symbols, and trailing .00
 */
export function normalizeNumber(str: string | null | undefined): string {
  if (!str) return "";
  let clean = str.replace(/[₹$€£\s,]/g, '').trim();
  clean = clean.replace(/\.00(?!\d)/g, '');
  return clean.toLowerCase();
}

/**
 * Determines whether a field is an identifier (roll no, application no, IDs).
 */
export function isIdentifierField(category: UniversalCategory, label: string): boolean {
  if (category === 'identifier_number') return true;
  const l = (label || '').toLowerCase();
  return /\b(roll|application|reg|registration|aadhaar|pan|epic|voter|uid|certificate\s*no|id\s*no|identifier|ref\s*no|reference\s*no|token|acknowledgement|ack\s*no)\b/i.test(l);
}

/**
 * Requirement 4: Cleaning: only trim trailing symbols. Never drop a field because it came from a sentence.
 * Requirement 2: Do NOT split label/value in code with regex or on hyphens/colons.
 * Use label and value exactly as Gemini returned them as separate JSON properties.
 * Hyphens inside values (<ID-NUMBER>, <YEAR-RANGE>, <REFERENCE-CODE>) must stay intact.
 */
export function cleanExtractedValue(label: string, rawVal: string): string {
  let val = (rawVal || "").trim();
  // Only trim trailing punctuation symbols (e.g. trailing periods, commas, semicolons, colons, underscores)
  val = val.replace(/[\s.,;:_–—-]+$/, '').trim();
  return val;
}

export interface GroundingCheckResult {
  fields: UniversalField[];
  groundedCount: number;
  totalCount: number;
  ratioText: string;
}

/**
 * Verifies whether extracted fields are grounded in Gemini's raw_text.
 * Requirement 2: Do NOT split label/value in code with regex or on hyphens/colons.
 * Requirement 4: Cleaning: only trim trailing symbols. Never drop a field because it came from a sentence.
 * Requirement 5: Grounding vs Gemini's raw_text:
 *   - normalize case/punctuation/spaces
 *   - numbers compare without commas and ".00"
 *   - identifiers must match exactly, otherwise amber "needs your check" (keep the field)
 */
export function performGroundingCheck(
  rawFields: Array<{ label?: string; value?: any; category?: string; evidence_quote?: any }>,
  rawText: string
): GroundingCheckResult {
  const normRaw = normalizeText(rawText);
  // Remove commas and .00 from raw text for number comparisons
  const numRaw = normalizeNumber(rawText);

  console.log(`[GROUNDING AUDIT] Raw text length: ${rawText.length} characters`);

  const processedFields: UniversalField[] = [];
  let groundedCount = 0;
  let totalCount = 0;

  const validCategories: UniversalCategory[] = [
    "person_name",
    "relative_name",
    "date_of_birth",
    "date",
    "validity_period",
    "identifier_number",
    "amount",
    "address_or_location",
    "issuing_authority",
    "signature_or_seal",
    "status_or_decision",
    "reason_or_remark",
    "deadline",
    "category_or_claim",
    "score_or_result",
    "scheme_or_program",
    "other"
  ];

  rawFields.forEach((item, idx) => {
    // Requirement 2: Use label and value exactly as Gemini returned them as separate JSON properties
    let rawVal = item.value !== null && item.value !== undefined ? String(item.value).trim() : "";
    const rawQuote = item.evidence_quote !== null && item.evidence_quote !== undefined ? String(item.evidence_quote).trim() : "";
    let label = item.label ? String(item.label).trim() : `Field ${idx + 1}`;

    // Requirement 4: Cleaning: only trim trailing symbols
    rawVal = cleanExtractedValue(label, rawVal);
    label = label.replace(/[:=\s]+$/, '').trim();

    // Never drop a field because it came from a sentence! Only skip if completely empty
    if (!rawVal || !label) {
      return;
    }

    // Normalize category
    let category: UniversalCategory = "other";
    if (item.category && validCategories.includes(item.category as UniversalCategory)) {
      category = item.category as UniversalCategory;
    }

    totalCount++;

    let isGrounded = false;
    let detail = "";

    // Requirement 5:
    // Identifiers must match exactly character-by-character
    if (isIdentifierField(category, label)) {
      const isExactCharMatch = rawText.includes(rawVal);
      if (isExactCharMatch) {
        isGrounded = true;
        detail = "Exact character match in document text";
      } else {
        isGrounded = false;
        detail = "needs your check";
      }
    } else {
      // Check numbers compare without commas and ".00"
      const numVal = normalizeNumber(rawVal);
      const isNumCategory = category === 'amount' || category === 'score_or_result' || /\d/.test(rawVal);
      const isNumMatch = Boolean(isNumCategory && numVal && numVal.length >= 1 && (numRaw.includes(numVal) || normRaw.includes(numVal)));

      // Normalize case/punctuation/spaces for text comparison
      const normVal = normalizeText(rawVal);
      const normQuote = normalizeText(rawQuote);
      const isValInRaw = normVal.length > 0 && normRaw.includes(normVal);
      const isQuoteInRaw = normQuote.length > 0 && normRaw.includes(normQuote);

      if (isNumMatch || isValInRaw || isQuoteInRaw) {
        isGrounded = true;
        detail = "Found in document text";
      } else {
        // Multi-word sentence / phrase comparison with normalized words
        const tokens = normVal.split(' ').filter(t => t.length > 1);
        if (tokens.length >= 2) {
          const matched = tokens.filter(t => normRaw.includes(t)).length;
          if (matched / tokens.length >= 0.70) {
            isGrounded = true;
            detail = "Found in document text";
          } else {
            isGrounded = false;
            detail = "needs your check";
          }
        } else {
          isGrounded = false;
          detail = "needs your check";
        }
      }
    }

    if (isGrounded) {
      groundedCount++;
    }

    console.log(
      `[FIELD GROUNDING] [${category.toUpperCase()}] "${label}": "${rawVal}" -> ${isGrounded ? 'GROUNDED' : 'NEEDS CHECK'} (${detail})`
    );

    // Keep the field (amber "needs your check" if ungrounded)
    processedFields.push({
      id: `FLD-${idx + 1}-${Date.now().toString(36)}`,
      label,
      value: rawVal,
      category,
      evidence_quote: rawQuote,
      isGrounded,
      groundingDetail: detail
    });
  });

  const ratioText = totalCount > 0 
    ? `${groundedCount} of ${totalCount} fields found in document text. Please verify against the preview.`
    : `0 of 0 fields found in document text. Please verify against the preview.`;

  console.log(`[GROUNDING SUMMARY]: ${ratioText}`);

  return {
    fields: processedFields,
    groundedCount,
    totalCount,
    ratioText
  };
}
