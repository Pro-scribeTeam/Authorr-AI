# Authorr AI — Legal Documents Overview

**Prepared:** June 2026
**Status:** DRAFT — Requires attorney review before publication

---

## Documents in This Folder

| File | Purpose | Priority |
|---|---|---|
| `TERMS_OF_SERVICE.md` | Main user agreement — governs all use of the Service | CRITICAL |
| `PRIVACY_POLICY.md` | GDPR, CCPA, PIPEDA, BIPA compliant data handling disclosure | CRITICAL |
| `VOICE_CLONE_CONSENT.md` | Biometric data consent notice for Voice Cloning feature — includes BIPA-required disclosures | CRITICAL |
| `DMCA_COPYRIGHT_POLICY.md` | Copyright takedown procedures + AI copyright guidance for users | HIGH |
| `ACCEPTABLE_USE_POLICY.md` | Rules for permitted and prohibited use | HIGH |

---

## Priority Action Items Before Launch

### 1. Hire an Attorney (Do This First)
These are well-researched draft documents, but they are NOT a substitute for legal counsel. At minimum, have an IP/tech attorney review:
- The BIPA consent language (Illinois class action exposure is significant — average settlements run into the millions)
- GDPR data processing agreements with Supabase, Cartesia, OpenRouter, and Vercel
- The arbitration/class action waiver (some jurisdictions restrict these)
- Your specific jurisdiction's requirements

### 2. Fill In All Placeholders
Search every document for `[` and replace:
- `[YOUR LEGAL ENTITY NAME]` — your registered company or LLC name
- `[YOUR STATE]` — state of incorporation / governing law
- `[YOUR ADDRESS]` — registered business address
- `[CONTACT EMAIL]` — general contact email
- `[PRIVACY EMAIL]` — dedicated privacy@ email (recommended)
- `[DMCA EMAIL]` — dedicated dmca@ email
- `[INSERT DATE BEFORE PUBLISHING]` — effective date
- `[YOUR PAYMENT PROCESSOR]` — Stripe, Paddle, etc.
- `[DPO NAME AND CONTACT]` — only if required
- `[EU/UK Representative]` — required if you have EU/UK users and no EU/EEA establishment

### 3. Set Up a Legal Email Aliases
Recommended:
- `privacy@authorr.ai` (or whatever domain you use)
- `dmca@authorr.ai`
- `legal@authorr.ai`

### 4. Implement Voice Cloning Consent UI
Before any user can upload audio for Voice Cloning, show a consent modal that:
- Displays the disclosures from `VOICE_CLONE_CONSENT.md`
- Requires an explicit checkbox acknowledgment
- Records timestamp + user ID of consent in your Supabase database (critical for BIPA compliance)

**Supabase table needed:**
```sql
CREATE TABLE biometric_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  consented_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  consent_version text DEFAULT '1.0'
);
```

### 5. Add Legal Pages to the App
Add pages/routes for:
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/acceptable-use` — Acceptable Use Policy
- `/dmca` — DMCA Policy

Link them in the footer and the sign-up flow.

### 6. Add Required Footer Links
Your footer must include at minimum:
- Terms of Service
- Privacy Policy
- For EU users: Cookie settings link

### 7. Sign-Up Flow
At account creation, require:
- "I agree to the Terms of Service and Privacy Policy" checkbox (with links)
- Log the timestamp and version accepted

### 8. Data Processing Agreements (DPAs)
For GDPR compliance, sign Data Processing Agreements with:
- Supabase: Available in their dashboard
- Cartesia: Contact their legal/privacy team
- OpenRouter: Contact their legal/privacy team
- Vercel: Available in their dashboard (for EU customers)

### 9. CCPA "Do Not Sell" Notice
Since you don't sell data, add a statement to your Privacy Policy footer link: "We do not sell personal information." This satisfies the CCPA opt-out link requirement.

### 10. Cookie Banner (EU/UK)
If you have European users, implement a GDPR-compliant cookie consent banner that:
- Appears on first visit
- Lists cookies used (Supabase session cookie)
- Allows acceptance
- Since you use only essential cookies, a "Notice only" banner (informing users, no opt-out needed for essential cookies) may suffice — confirm with your attorney

---

## Jurisdiction-Specific Risks to Flag for Your Attorney

| Risk | Jurisdiction | Severity |
|---|---|---|
| BIPA class actions for Voice Cloning without proper consent flow | Illinois | VERY HIGH |
| GDPR fines up to 4% global revenue for improper data handling | EU/EEA/UK | HIGH |
| CCPA enforcement for California users | California | MEDIUM |
| AI disclosure requirements on publishing platforms (Audible, Spotify) | Global | MEDIUM |
| Right of publicity violations from unauthorized voice cloning | All U.S. states + many countries | HIGH |
| Copyright infringement from AI-generated content | Global | MEDIUM |
| FTC Act Section 5 — deceptive practices (e.g., fake testimonials, AI disclosure) | USA | MEDIUM |
| EU AI Act compliance for biometric data classification | EU/EEA | HIGH (2025 onward) |

---

## Competitive Benchmarks Reviewed

These documents reflect current best practices as seen in legal documents from:
- Eleven Labs (voice cloning)
- Descript (voice synthesis)
- Adobe (AI content)
- OpenAI (AI terms)
- Spotify (AI music)

---

## Document Version Control

When you update these documents:
1. Update the "Last Updated" date
2. Increment a version number
3. Store old versions in a `legal/archive/` folder
4. For BIPA: keep records of which consent version each user accepted

---

*These documents were prepared based on a thorough review of the Authorr AI application, its features, data flows, third-party integrations, and applicable law as of June 2026. They are starting-point drafts, not final legal instruments. Laws change — schedule an annual legal review.*
