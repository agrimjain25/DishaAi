// Pre-extracted results for the 4 SYNTHETIC demo documents (disha_demo_pack).
// Matched ONLY by the SHA-256 of the exact file bytes, never by filename.
// Any other file always goes through Gemini. These are real transcriptions of the demo images.
export const DEMO_SEEDS: Record<string, any> = {
  "84daceee60cdc62a9fc9c7c41e9036fd50a5e425d1130b40463747391682c1d7": {
    "document_type": "Scholarship Application Form",
    "language_detected": "en",
    "quality_flag": "ok",
    "summary": "Scholarship application form for ROHAN VERMA, academic year 2026-27 (Post-Matric Scholarship (Demo)).",
    "raw_text": "SAMPLE - SYNTHETIC DEMO DOCUMENT (NOT AN OFFICIAL RECORD)\nSCHOLARSHIP APPLICATION FORM\nPost-Matric Scholarship (Demo)\nApplicant Name: ROHAN VERMA\nDate of Birth: 14-03-2006\nFather's Name: SURESH VERMA\nAcademic Year: 2026-27\nCourse: B.Sc. (Year 1)\nInstitute: Demo Government College, Pune\nAnnual Family Income: Rs. 180000\nCategory: General\nApplication ID: DEMO-2026-00417\nDate of Application: 02-10-2026\nDeclaration: I confirm the above details are correct. Signature: Rohan Verma",
    "unclear_items": [],
    "fields": [
      {
        "label": "Scheme Name",
        "value": "Post-Matric Scholarship (Demo)",
        "category": "scheme_or_program",
        "evidence_quote": "Post-Matric Scholarship (Demo)"
      },
      {
        "label": "Applicant Name",
        "value": "ROHAN VERMA",
        "category": "person_name",
        "evidence_quote": "Applicant Name: ROHAN VERMA"
      },
      {
        "label": "Date of Birth",
        "value": "14-03-2006",
        "category": "date_of_birth",
        "evidence_quote": "Date of Birth: 14-03-2006"
      },
      {
        "label": "Father's Name",
        "value": "SURESH VERMA",
        "category": "relative_name",
        "evidence_quote": "Father's Name: SURESH VERMA"
      },
      {
        "label": "Academic Year",
        "value": "2026-27",
        "category": "validity_period",
        "evidence_quote": "Academic Year: 2026-27"
      },
      {
        "label": "Course",
        "value": "B.Sc. (Year 1)",
        "category": "other",
        "evidence_quote": "Course: B.Sc. (Year 1)"
      },
      {
        "label": "Institute",
        "value": "Demo Government College, Pune",
        "category": "address_or_location",
        "evidence_quote": "Institute: Demo Government College, Pune"
      },
      {
        "label": "Annual Family Income",
        "value": "Rs. 180000",
        "category": "amount",
        "evidence_quote": "Annual Family Income: Rs. 180000"
      },
      {
        "label": "Category",
        "value": "General",
        "category": "category_or_claim",
        "evidence_quote": "Category: General"
      },
      {
        "label": "Application ID",
        "value": "DEMO-2026-00417",
        "category": "identifier_number",
        "evidence_quote": "Application ID: DEMO-2026-00417"
      },
      {
        "label": "Date of Application",
        "value": "02-10-2026",
        "category": "date",
        "evidence_quote": "Date of Application: 02-10-2026"
      }
    ]
  },
  "0d107f59c9f49cc6a61a7f398677017c0dde512268ad7aea010c9191f5510d88": {
    "document_type": "Defect Notice",
    "language_detected": "en",
    "quality_flag": "ok",
    "summary": "Defect notice for ROHAN VERMA: application DEMO-2026-00417 is marked DEFECTIVE because the income certificate is not valid for the application year. Correction deadline 15-11-2026.",
    "raw_text": "SAMPLE - SYNTHETIC DEMO DOCUMENT (NOT AN OFFICIAL RECORD)\nNOTICE: APPLICATION MARKED DEFECTIVE\nPost-Matric Scholarship (Demo) - Institute Verification\nApplication ID: DEMO-2026-00417\nApplicant Name: ROHAN VERMA\nAcademic Year: 2026-27\nStatus: DEFECTIVE\nDefect Remark: Income certificate not valid for the application year. Upload a valid one.\nCorrection Deadline: 15-11-2026\nVerification Stage: Institute Verification\nDate of Notice: 06-10-2026\nRe-upload the corrected document before the deadline.",
    "unclear_items": [],
    "fields": [
      {
        "label": "Scheme Name",
        "value": "Post-Matric Scholarship (Demo)",
        "category": "scheme_or_program",
        "evidence_quote": "Post-Matric Scholarship (Demo) - Institute Verification"
      },
      {
        "label": "Application ID",
        "value": "DEMO-2026-00417",
        "category": "identifier_number",
        "evidence_quote": "Application ID: DEMO-2026-00417"
      },
      {
        "label": "Applicant Name",
        "value": "ROHAN VERMA",
        "category": "person_name",
        "evidence_quote": "Applicant Name: ROHAN VERMA"
      },
      {
        "label": "Academic Year",
        "value": "2026-27",
        "category": "validity_period",
        "evidence_quote": "Academic Year: 2026-27"
      },
      {
        "label": "Application Status",
        "value": "DEFECTIVE",
        "category": "status_or_decision",
        "evidence_quote": "Status: DEFECTIVE"
      },
      {
        "label": "Defect Remark",
        "value": "Income certificate not valid for the application year. Upload a valid one.",
        "category": "reason_or_remark",
        "evidence_quote": "Income certificate not valid for the application year. Upload a valid one."
      },
      {
        "label": "Correction Deadline",
        "value": "15-11-2026",
        "category": "deadline",
        "evidence_quote": "Correction Deadline: 15-11-2026"
      },
      {
        "label": "Verification Stage",
        "value": "Institute Verification",
        "category": "status_or_decision",
        "evidence_quote": "Verification Stage: Institute Verification"
      },
      {
        "label": "Date of Notice",
        "value": "06-10-2026",
        "category": "date",
        "evidence_quote": "Date of Notice: 06-10-2026"
      }
    ]
  },
  "34448090e43b24e0226fc7b36c9d3be213eec8416bc949c2913b94bf70830415": {
    "document_type": "Income Certificate",
    "language_detected": "en",
    "quality_flag": "ok",
    "summary": "Income certificate for ROHAN VERMA with annual family income Rs. 180000, valid for financial year 2024-2025.",
    "raw_text": "SAMPLE - SYNTHETIC DEMO DOCUMENT (NOT AN OFFICIAL RECORD)\nINCOME CERTIFICATE\nOffice of the Tahsildar, Demo Taluka (Sample)\nThis is to certify that ROHAN VERMA, son of SURESH VERMA, residing at Demo Nagar, Pune, has an annual family income of Rs. 180000 (Rupees One Lakh Eighty Thousand only) from all sources.\nCertificate No: DEMO-INC/2024/0817\nValid for Financial Year: 2024-2025\nDate of Issue: 10-09-2024\nIssued by: Tahsildar (Demo) Digitally signed (sample)",
    "unclear_items": [],
    "fields": [
      {
        "label": "Certificate Number",
        "value": "DEMO-INC/2024/0817",
        "category": "identifier_number",
        "evidence_quote": "Certificate No: DEMO-INC/2024/0817"
      },
      {
        "label": "Applicant Name",
        "value": "ROHAN VERMA",
        "category": "person_name",
        "evidence_quote": "This is to certify that ROHAN VERMA"
      },
      {
        "label": "Son of",
        "value": "SURESH VERMA",
        "category": "relative_name",
        "evidence_quote": "son of SURESH VERMA"
      },
      {
        "label": "Residence",
        "value": "Demo Nagar, Pune",
        "category": "address_or_location",
        "evidence_quote": "residing at Demo Nagar, Pune"
      },
      {
        "label": "Annual Family Income (figures)",
        "value": "Rs. 180000",
        "category": "amount",
        "evidence_quote": "annual family income of Rs. 180000"
      },
      {
        "label": "Annual Family Income (words)",
        "value": "Rupees One Lakh Eighty Thousand only",
        "category": "amount",
        "evidence_quote": "(Rupees One Lakh Eighty Thousand only)"
      },
      {
        "label": "Valid for Financial Year",
        "value": "2024-2025",
        "category": "validity_period",
        "evidence_quote": "Valid for Financial Year: 2024-2025"
      },
      {
        "label": "Date of Issue",
        "value": "10-09-2024",
        "category": "date",
        "evidence_quote": "Date of Issue: 10-09-2024"
      },
      {
        "label": "Issuing Authority",
        "value": "Office of the Tahsildar, Demo Taluka (Sample)",
        "category": "issuing_authority",
        "evidence_quote": "Office of the Tahsildar, Demo Taluka (Sample)"
      }
    ]
  },
  "e2fcb72b4ed9d25a11dcef2ee7536939accf23073d5b3194148a30af43131d5f": {
    "document_type": "Income Certificate",
    "language_detected": "en",
    "quality_flag": "ok",
    "summary": "Income certificate for ROHAN VERMA with annual family income Rs. 180000, valid for financial year 2026-2027.",
    "raw_text": "SAMPLE - SYNTHETIC DEMO DOCUMENT (NOT AN OFFICIAL RECORD)\nINCOME CERTIFICATE\nOffice of the Tahsildar, Demo Taluka (Sample)\nThis is to certify that ROHAN VERMA, son of SURESH VERMA, residing at Demo Nagar, Pune, has an annual family income of Rs. 180000 (Rupees One Lakh Eighty Thousand only) from all sources.\nCertificate No: DEMO-INC/2026/1203\nValid for Financial Year: 2026-2027\nDate of Issue: 05-10-2026\nIssued by: Tahsildar (Demo) Digitally signed (sample)",
    "unclear_items": [],
    "fields": [
      {
        "label": "Certificate Number",
        "value": "DEMO-INC/2026/1203",
        "category": "identifier_number",
        "evidence_quote": "Certificate No: DEMO-INC/2026/1203"
      },
      {
        "label": "Applicant Name",
        "value": "ROHAN VERMA",
        "category": "person_name",
        "evidence_quote": "This is to certify that ROHAN VERMA"
      },
      {
        "label": "Son of",
        "value": "SURESH VERMA",
        "category": "relative_name",
        "evidence_quote": "son of SURESH VERMA"
      },
      {
        "label": "Residence",
        "value": "Demo Nagar, Pune",
        "category": "address_or_location",
        "evidence_quote": "residing at Demo Nagar, Pune"
      },
      {
        "label": "Annual Family Income (figures)",
        "value": "Rs. 180000",
        "category": "amount",
        "evidence_quote": "annual family income of Rs. 180000"
      },
      {
        "label": "Annual Family Income (words)",
        "value": "Rupees One Lakh Eighty Thousand only",
        "category": "amount",
        "evidence_quote": "(Rupees One Lakh Eighty Thousand only)"
      },
      {
        "label": "Valid for Financial Year",
        "value": "2026-2027",
        "category": "validity_period",
        "evidence_quote": "Valid for Financial Year: 2026-2027"
      },
      {
        "label": "Date of Issue",
        "value": "05-10-2026",
        "category": "date",
        "evidence_quote": "Date of Issue: 05-10-2026"
      },
      {
        "label": "Issuing Authority",
        "value": "Office of the Tahsildar, Demo Taluka (Sample)",
        "category": "issuing_authority",
        "evidence_quote": "Office of the Tahsildar, Demo Taluka (Sample)"
      }
    ]
  }
};