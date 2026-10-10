DISHA: AI Case-Resolution Agent for Public Services

From confusing paperwork to a clear next step.

Millions of students and families lose benefits not because they are ineligible, but because of a small document error, like an income certificate from the wrong year. Rejection notices say defective, but rarely say what to fix.

DISHA reads your documents, checks them against a scheme's requirements, and generates an Action Plan, in English and Hindi, by text or voice.

Live app: add your deployed link here Demo video: add your video link here

What it does
Reads documents. Upload one or many PDFs or images. A vision model transcribes what is visible and extracts facts (names, dates, years, amounts, IDs). Every fact carries an exact evidence quote from the source document. Anything not on the page stays unknown; DISHA never invents data.
Builds a Case File. Facts from all documents are shown together with a document preview. The user reviews and confirms them.
Understands the problem. The user describes the issue by typing, with browser speech input, or by talking to a voice agent. The Case Goal guides the analysis.
Checks requirements with plain code. A deterministic rules engine (no LLM) runs checks such as document present, year match, name consistency, validity date and deadline. Each check shows pass / fail / unknown, the evidence quote and the requirement's source.
Readiness verdict. Any fail → NOT READY. Unknown only → NEEDS REVIEW. READY only when every check passes.
Action Plan. Failed or unknown checks become steps (what to fix, why, document needed, where to get it, deadline). Every step links to its requirement and evidence. No step exists without a linked requirement.
English / Hindi toggle across the interface, plus read-aloud for the plan.
Trust and safety by design
No fabricated data. Extraction is grounded in visible text with evidence quotes.
No rules from model memory. Requirements come from a curated library, from an official guideline the user uploads, or from search restricted to .gov.in / .nic.in (optional). If none exists, DISHA says: "DISHA has no verified rules for this service yet."
Deterministic checks. The pass/fail logic is code, not an AI guess.
Privacy masking. Aadhaar numbers, OTPs and passwords are masked before text is sent to the model.
User-stated facts are labelled separately and never count as document-grounded evidence.
Honest notes
Demo documents use pre-extracted results. The synthetic demo pack (fictional student Rohan Verma) is matched by file hash and uses saved extraction results to avoid API rate limits during the demo. Any other document goes through Gemini live.
Requirement sources are not yet verified. requirements/nsp_scholarship.json is a flagship template for the National Scholarship Portal. Its source_url, section and last_verified fields are marked TO BE VERIFIED BY USER, and the checks should be treated as a working checklist, not official policy, until those fields are filled from official pages.
Flagship scope. The reading and checking pipeline is generic, but only one service (NSP-style scholarship) ships with a requirements file. Other services need an uploaded guideline or a new requirements file.
All demo documents are synthetic samples and contain no real person's data.
Tech stack
React + TypeScript + Vite (frontend)
Node + Express server (server.ts) as a Gemini proxy and API layer
Google Gemini (vision extraction, problem understanding, plan wording)
Vapi (optional voice intake) and Web Speech API
Run locally

Prerequisites: Node.js

Install dependencies:
bash
   npm install
Create a .env file (see .env.example):
   GEMINI_API_KEY=your_key
   GEMINI_MODEL=gemini-flash-latest
   VITE_VAPI_PUBLIC_KEY=optional
   VITE_VAPI_ASSISTANT_ID=optional
Start the app:
bash
   npm run dev

Open http://localhost:3000.

Voice intake is optional: leave the Vapi keys empty to use text and browser speech input only.

Project structure
server.ts                  Express server, Gemini calls, requirements endpoints
demoSeeds.ts               Pre-extracted results for the synthetic demo pack
requirements/              Curated requirements libraries (JSON)
src/
  App.tsx                  App shell and upload/extraction flow
  components/              Case File, Readiness Audit, Action Plan, intake UI
  utils/
    resolutionBrain.ts     Problem understanding and requirement sourcing
    rulesEngine.ts         Deterministic checks (no LLM)
    readiness.ts           NOT READY / NEEDS REVIEW / READY logic
    translations.ts        English / Hindi strings
Adding a new service

Create a JSON file in requirements/ with a service_name, aliases, and a list of requirements. Each requirement has an id, label, check_type (document_present, year_match, name_match, validity_date, deadline, field_present, or manual_review), and a source_url, section and last_verified taken from the official page.

Roadmap
Verify and complete the NSP requirement sources.
More services and state-level schemes.
Draft correction letters and grievance applications.
More Indian languages.
