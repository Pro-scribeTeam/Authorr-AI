# Authorr AI — Privacy Policy

**Effective Date:** [INSERT DATE BEFORE PUBLISHING]
**Last Updated:** [INSERT DATE BEFORE PUBLISHING]

This Privacy Policy explains how **[YOUR LEGAL ENTITY NAME]** ("Company," "we," "us," "our") collects, uses, shares, and protects personal information when you use the Authorr AI service at authorr-ai.vercel.app (the "Service"). This policy applies worldwide and includes specific provisions for residents of the European Economic Area (EEA), United Kingdom (UK), California (USA), Canada, and other jurisdictions with enhanced privacy laws.

By using the Service, you acknowledge that you have read and understood this Privacy Policy.

---

## 1. Summary (Quick Reference)

| What we collect | Why | Shared with |
|---|---|---|
| Email address | Account creation and authentication | Supabase, Inc. |
| Voice recordings (if you use Voice Cloning) | To create a synthetic voice model | Cartesia, Inc. |
| Story content and prompts you create | To generate AI outputs and provide the Service | OpenRouter, Inc. (via our API) |
| Subscription plan and payment status | To manage your subscription | [Payment Processor] |
| Browser localStorage data (API keys, voice IDs, settings) | Stored locally on your device only; not transmitted to our servers | No one |
| Usage data (pages visited, features used) | To improve the Service and diagnose errors | Vercel, Inc. |
| IP address | Security, fraud prevention, analytics | Vercel, Inc. |

We do **not** sell your personal data. We do **not** use your data for advertising. We do **not** train our own AI models on your content without your explicit consent.

---

## 2. Data Controller

The data controller responsible for your personal information is:

**[YOUR LEGAL ENTITY NAME]**
[YOUR ADDRESS]
[CITY, STATE, ZIP, COUNTRY]
**Privacy Contact:** [PRIVACY EMAIL]

For EU/EEA/UK residents: If we are required to appoint a data protection officer (DPO) or EU/UK representative under applicable law, their contact details will be provided here: [DPO NAME AND CONTACT, if applicable].

---

## 3. Information We Collect

### 3.1 Information You Provide Directly

**Account Information**
- Email address (required for account creation)
- Password (stored in hashed form by Supabase — we never see your plaintext password)

**Voice Recordings (Voice Cloning Feature)**
- When you use the Voice Cloning feature (Starter plan and above), you upload an audio recording (approximately 30 seconds) of a human voice. This constitutes biometric data in many jurisdictions — see Section 7 (Biometric Data) for critical disclosures.

**Content You Create**
- Story text, narrative prompts, chapter content, and other text you write or generate
- Cover art generation prompts
- Project names and metadata

**Communications**
- Emails or messages you send to us (e.g., support requests)

### 3.2 Information Collected Automatically

**Usage Data**
- Pages and features accessed within the Service
- Session duration and frequency of use
- Error logs and crash reports
- Browser type and version, operating system

**Device and Network Data**
- IP address (used for security, fraud prevention, and approximate geographic location)
- Browser identifier
- Referring URL

**Subscription and Transaction Data**
- Your current subscription plan and status
- Billing history (managed by our payment processor — we store only plan/status, not full payment details)

### 3.3 Information Stored Locally on Your Device (Not on Our Servers)

The following data is stored **only** in your browser's localStorage and is never transmitted to our servers:

- Third-party API keys you choose to provide (e.g., OpenAI API key)
- Voice Clone model IDs (Cartesia voice IDs)
- UI settings and preferences (theme, language, etc.)
- Google Calendar OAuth tokens (if you connect calendar integration)
- OpenRouter model preferences

**Clearing your browser's localStorage or using a different browser/device will erase this data.** We cannot recover it for you.

### 3.4 Information We Do NOT Collect

- We do not collect your full payment card details (handled by our payment processor)
- We do not require your real name (your email is sufficient)
- We do not collect geolocation beyond what can be inferred from your IP address
- We do not access your device's microphone, camera, or contacts except when you explicitly initiate the Voice Cloning upload

---

## 4. How We Use Your Information

We use your information for the following purposes:

| Purpose | Legal Basis (EU/UK) | Details |
|---|---|---|
| Account creation and authentication | Contract performance | Creating and securing your account via Supabase |
| Providing AI writing features | Contract performance | Routing your prompts to OpenRouter AI providers |
| Providing voice synthesis and cloning | Contract performance + Consent (biometric) | Processing via Cartesia |
| Subscription and billing management | Contract performance | Tracking your plan, credits, and billing cycle |
| Customer support | Legitimate interests | Responding to your inquiries |
| Service improvement | Legitimate interests | Analyzing usage patterns, fixing bugs |
| Security and fraud prevention | Legitimate interests / Legal obligation | Detecting and preventing unauthorized access |
| Legal compliance | Legal obligation | Complying with applicable laws and regulations |
| Marketing (if you opt in) | Consent | Sending product updates (you may opt out any time) |

We do not use your content or prompts for advertising or to build advertising profiles.

---

## 5. How We Share Your Information

We share your information only in the following circumstances:

### 5.1 Service Providers (Processors)

We engage the following trusted service providers who process data on our behalf:

**Supabase, Inc. (USA)**
- Purpose: Authentication, user database, subscription data storage
- Data shared: Email address, user ID, subscription plan/status, story metadata
- Safeguards: Supabase is SOC 2 Type II certified; EU data processed under Standard Contractual Clauses (SCCs)
- Privacy: supabase.com/privacy

**Cartesia, Inc. (USA)**
- Purpose: Voice synthesis (text-to-speech) and voice cloning
- Data shared: Text for narration; voice recordings you submit for cloning
- Important: Voice recordings constitute biometric data — see Section 7
- Privacy: cartesia.ai/legal

**OpenRouter, Inc. (USA)**
- Purpose: AI text generation proxy, routing to underlying AI model providers
- Data shared: Your story prompts and text inputs
- Note: OpenRouter routes to third-party AI model providers (including Mistral, Google, Meta, and others) who may have their own data retention policies
- Privacy: openrouter.ai/privacy

**Vercel, Inc. (USA)**
- Purpose: Hosting, content delivery, serverless function execution
- Data shared: IP addresses, request logs, usage telemetry
- Privacy: vercel.com/legal/privacy-policy

**[YOUR PAYMENT PROCESSOR] (e.g., Stripe, Inc.)**
- Purpose: Payment processing and subscription billing
- Data shared: Billing information (we do not store full card details)
- Privacy: [processor's privacy URL]

### 5.2 Legal Requirements

We may disclose your information if required by law, court order, or government request, or if we believe disclosure is necessary to protect the rights, property, or safety of the Company, our users, or the public.

### 5.3 Business Transfers

If the Company is acquired, merges with another entity, or sells substantially all of its assets, your information may be transferred to the acquiring entity. We will notify you via email or prominent notice on the Service before your data is transferred and becomes subject to a different privacy policy.

### 5.4 With Your Consent

We may share your information for other purposes with your explicit consent.

### 5.5 What We Do NOT Do

- We do **not** sell your personal data.
- We do **not** share your data with advertisers.
- We do **not** allow third parties to use your data for their own marketing.

---

## 6. Data Retention

| Data Type | Retention Period |
|---|---|
| Account data (email, profile) | Until account deletion + 30 days |
| Story content and AI outputs | Until you delete them or close your account + 30 days |
| Subscription and billing records | 7 years (legal/tax compliance) |
| Voice Clone audio samples | Per Cartesia's retention policy (typically deleted after model creation) |
| Voice Clone model IDs | Until you delete the clone or close your account |
| Usage logs and IP addresses | Up to 12 months |
| Support communications | 2 years |

After the applicable retention period, we will delete or anonymize your data. Some data may be retained longer where required by law.

---

## 7. Biometric Data — Voice Cloning Special Disclosures

Because voice recordings and derived voice models may constitute biometric identifiers or biometric information under applicable law, we provide the following additional disclosures:

**What we collect:** Audio recordings (approximately 30 seconds) that you voluntarily submit to the Voice Cloning feature, and the derived voice model ID.

**Purpose:** To create a synthetic AI voice model via Cartesia, Inc. that can generate narration matching the tonal characteristics of the submitted voice.

**Third-party processing:** Audio samples are transmitted to and processed by Cartesia, Inc. We do not retain the raw audio file on our servers.

**Storage of derived identifier:** The Cartesia voice model ID is stored in your browser's localStorage only (not on our servers).

**Your consent:** By using the Voice Cloning feature, you provide explicit consent to this biometric data processing.

**Deletion:** You may delete your Voice Clones at any time. Upon deletion, we will instruct Cartesia to delete the associated voice model. Deletion requests are subject to Cartesia's data retention practices.

**Illinois BIPA Compliance:** If you are an Illinois resident, in addition to the above:
- The biometric data (voice recording) is being collected for the purpose of generating a synthetic voice model.
- We will not sell, lease, trade, or profit from your biometric data.
- We will not disclose your biometric data without your consent except as described herein or as required by law.
- The retention schedule is: voice model IDs are deleted when you delete the clone or close your account; raw audio samples are not retained by us after transmission to Cartesia.
- You may request destruction of your biometric data by contacting us at **[CONTACT EMAIL]**.

**Texas CUBI Compliance:** If you are a Texas resident, you have the right to request deletion of your biometric data at any time by contacting **[CONTACT EMAIL]**.

---

## 8. Cookies and Tracking Technologies

**8.1 What We Use**

The Service uses minimal tracking. We use:

- **Session cookies:** Set by Supabase for authentication session management. These are essential and cannot be disabled without breaking the login functionality.
- **Analytics:** We may use privacy-respecting analytics (such as Vercel Analytics) that collect anonymized usage statistics without persistent cross-site tracking cookies.

**8.2 What We Do NOT Use**
- We do not use advertising cookies.
- We do not use third-party tracking pixels.
- We do not use fingerprinting technologies for tracking.

**8.3 localStorage**
We use browser localStorage (not cookies) to store your preferences, settings, and local data (see Section 3.3). localStorage data is not transmitted to any third-party advertising or analytics services.

**8.4 Cookie Preferences**
For essential authentication cookies, there is no opt-out option without losing login functionality. For any optional analytics, you may opt out via your browser settings or our cookie preference center (if available).

**8.5 Do Not Track**
We honor Do Not Track (DNT) signals from your browser for any optional analytics collection.

---

## 9. Your Rights and Choices

### 9.1 Rights for All Users
- **Access:** Request a copy of the personal data we hold about you.
- **Correction:** Request correction of inaccurate or incomplete data.
- **Deletion:** Request deletion of your personal data (subject to legal retention requirements).
- **Portability:** Receive your data in a machine-readable format.
- **Opt-out of marketing:** Unsubscribe from marketing emails at any time via the unsubscribe link or by contacting us.

### 9.2 EU/EEA/UK Residents — Additional Rights (GDPR / UK GDPR)

If you are located in the EU, EEA, or UK, you have additional rights under the General Data Protection Regulation (GDPR) or UK GDPR:

- **Right to object:** Object to processing based on legitimate interests or for direct marketing.
- **Right to restrict processing:** Request that we restrict processing of your data in certain circumstances.
- **Right to withdraw consent:** Where processing is based on consent (e.g., Voice Cloning biometric data, marketing), withdraw consent at any time without affecting prior processing.
- **Right to lodge a complaint:** Lodge a complaint with your local supervisory authority:
  - EU: Your national data protection authority (find them at edpb.europa.eu)
  - UK: Information Commissioner's Office (ICO) — ico.org.uk

**Legal Bases for Processing (EU/UK):** We process your data on the following legal bases: (a) Contract performance — providing the Service you signed up for; (b) Legitimate interests — service improvement, security, fraud prevention; (c) Legal obligation — complying with applicable laws; (d) Consent — biometric data (Voice Cloning), marketing communications.

**International Transfers (EU/UK):** Our service providers are primarily located in the United States. We ensure appropriate safeguards for international transfers, including reliance on Standard Contractual Clauses (SCCs) approved by the European Commission where required.

### 9.3 California Residents — Additional Rights (CCPA/CPRA)

If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):

- **Know:** Right to know what personal information we collect, use, disclose, and sell.
- **Delete:** Right to request deletion of your personal information.
- **Correct:** Right to request correction of inaccurate personal information.
- **Opt-out of sale/sharing:** We do **not** sell or share personal information for cross-context behavioral advertising.
- **Limit sensitive data use:** Right to limit use of sensitive personal information (including biometric data) to what is necessary to provide the Service.
- **Non-discrimination:** We will not discriminate against you for exercising your CCPA/CPRA rights.

**Sensitive Personal Information:** We collect voice recordings (biometric data) solely for the Voice Cloning feature you request. We do not use this data for inferences about your characteristics.

**Categories of personal information collected in the past 12 months:** Identifiers (email, IP address); internet activity (usage logs); biometric data (voice recordings, if you use Voice Cloning); commercial information (subscription plan); inferences derived from usage data.

**Do Not Sell or Share My Personal Information:** We do not sell or share your personal information. No opt-out mechanism is required because we do not engage in these practices, but you may contact us to confirm at **[CONTACT EMAIL]**.

To exercise California rights, contact us at **[CONTACT EMAIL]** or **[TOLL-FREE NUMBER IF APPLICABLE]**. We will respond within 45 days.

### 9.4 Canadian Residents (PIPEDA / Quebec Law 25)

If you are a Canadian resident, you have rights under the Personal Information Protection and Electronic Documents Act (PIPEDA) and, for Quebec residents, Quebec's Law 25 (Bill 64):

- Access and correction rights
- Right to withdraw consent (where consent is the basis for processing)
- Right to complain to the Office of the Privacy Commissioner of Canada

Quebec residents have additional rights including the right to data portability and the right to be informed of automated decision-making.

### 9.5 Exercising Your Rights

To exercise any privacy rights, contact us at:
- **Email:** [PRIVACY EMAIL]
- **Subject line:** "Privacy Rights Request — [Your Right]"

We will verify your identity before processing requests and respond within the timeframe required by applicable law (generally 30 days, extendable where permitted). We will not charge a fee for reasonable requests.

---

## 10. Children's Privacy

The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn we have collected information from a child under 13 without verifiable parental consent, we will delete it promptly.

If you are between 13 and 17 years old, use of the Service requires parental or guardian consent.

If you believe a child under 13 has provided us with personal information, contact us at **[CONTACT EMAIL]**.

---

## 11. Security

We implement industry-standard technical and organizational security measures to protect your personal information, including:

- TLS/HTTPS encryption for all data in transit
- Hashed and salted password storage (via Supabase)
- Access controls limiting employee access to personal data
- Regular security assessments

However, no system is completely secure. We cannot guarantee absolute security against all threats. In the event of a data breach affecting your rights and freedoms, we will notify you and applicable authorities as required by law.

---

## 12. Links to Third-Party Sites and Services

The Service may contain links to third-party websites or publishing platforms. This Privacy Policy does not apply to those sites. We are not responsible for the privacy practices of third-party sites and encourage you to review their privacy policies before providing personal information.

---

## 13. AI-Specific Privacy Considerations

**Prompt Data:** Text prompts and story content you enter are transmitted to AI model providers via OpenRouter. While we instruct providers not to use your data for training without consent, you should avoid including sensitive personal information (Social Security numbers, financial account details, medical records, etc.) in your prompts.

**AI Model Training:** We do not currently use your content to train our own AI models. If this changes, we will update this Policy and obtain your consent where required.

**Third-Party AI Providers:** OpenRouter routes to various underlying AI model providers. Each provider has its own data retention and training policies. Visit openrouter.ai for information on current provider practices.

---

## 14. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by:
- Sending an email to your registered address, and/or
- Posting a prominent notice on the Service

Material changes will be effective 14 days after notice for paid subscribers, and upon posting for free accounts. Continued use after the effective date constitutes acceptance. If you disagree with changes, close your account before they take effect.

---

## 15. Contact Us

For questions, concerns, or to exercise your privacy rights:

**Privacy Contact / Data Controller:**
[YOUR COMPANY NAME]
[YOUR ADDRESS]
[CITY, STATE, ZIP, COUNTRY]
**Email:** [PRIVACY EMAIL]

**For EU/UK users:** [EU/UK Representative Name and Contact, if applicable]

**For DMCA notices:** See the DMCA Policy document.

---

*This Privacy Policy should be reviewed by a licensed attorney familiar with GDPR, CCPA, PIPEDA, BIPA, and related privacy laws before publication. Privacy law is jurisdiction-specific and evolving rapidly.*
