# Authorr AI — Voice Cloning Biometric Data Consent and Disclosure

**Version:** 1.0
**Effective Date:** [INSERT DATE BEFORE PUBLISHING]

> This document is designed to satisfy explicit consent and disclosure requirements under the Illinois Biometric Information Privacy Act (BIPA), the Texas Capture or Use of Biometric Identifier Act (CUBI), California AB 2602, Washington biometric laws, the EU AI Act, and analogous laws worldwide. It should be displayed to users as a modal consent screen **before** they upload any voice recording for cloning.

---

## FOR IMPLEMENTATION: Required UI Consent Flow

Before any user can upload audio to the Voice Cloning feature, display the following notice in a modal dialog with:
1. Full text of the disclosure (or a summary with a link to this full document)
2. A checkbox: "I have read and agree to the Voice Cloning Biometric Data Consent"
3. A "Consent and Continue" button (disabled until checkbox is checked)
4. A "Cancel" button
5. Log the timestamp and user ID of consent for compliance records

---

## Voice Cloning — Biometric Data Notice and Consent

### What You Are About to Do

You are about to upload an audio recording to Authorr AI's Voice Cloning feature. This feature processes the audio recording to create a synthetic voice model ("Voice Clone") that can generate AI-narrated audio matching the tonal characteristics of the voice in the recording.

**Before you proceed, please read and understand the following disclosures.**

---

### 1. Nature of the Data — Biometric Information

The audio recording you upload, and the voice model derived from it, may constitute **biometric identifiers** or **biometric information** under the following laws:

- **Illinois:** Biometric Information Privacy Act (BIPA), 740 ILCS 14
- **Texas:** Capture or Use of Biometric Identifier Act (CUBI), Tex. Bus. & Com. Code § 503.001
- **Washington:** biometric identifier statutes
- **California:** AB 2602 (2024) — digital voice replica of a performer
- **New York:** Civil Rights Law § 52-c
- **European Union:** EU AI Act; General Data Protection Regulation (GDPR) Article 9 (special category data)

Biometric data is sensitive and afforded special legal protections. You have the right to control whether and how your biometric data is collected and used.

---

### 2. Who Collects and Processes This Data

**[YOUR COMPANY NAME]** ("Authorr AI") collects your audio recording and transmits it to our voice synthesis partner:

**Cartesia, Inc.**
A technology company specializing in AI voice synthesis.
Privacy policy: cartesia.ai/legal

Cartesia processes your audio recording to generate a voice model and returns a voice model ID to us. The raw audio file is processed per Cartesia's data retention policies. Authorr AI does not store the raw audio file on our servers after transmission to Cartesia.

The resulting **voice model ID** is stored only in your browser's localStorage (not on our servers) until you delete the Voice Clone.

---

### 3. Purpose of Collection

Your audio recording is collected **solely** for the following purpose:
- To create a synthetic AI voice model that you can use within Authorr AI to generate narrated audio for your creative projects.

Your biometric data will **not** be used for:
- Advertising or profiling
- Sale to third parties
- Identity verification
- Any purpose beyond the Voice Cloning feature described above

---

### 4. Who Has Access to Your Data

| Party | Access | Purpose |
|---|---|---|
| Cartesia, Inc. | Receives the audio recording | Creates the voice model |
| Authorr AI | Receives the voice model ID only | Stores ID in your browser, enables you to use the clone |
| Other Authorr AI users | None | Your Voice Clones are private to your account |
| Third parties | None — except as required by law | Law enforcement if legally compelled |

---

### 5. Retention and Destruction Schedule

| Data | Retained By | Retention Period |
|---|---|---|
| Audio recording (raw) | Cartesia, Inc. | Per Cartesia's policy; typically deleted after model creation |
| Voice model (derived) | Cartesia, Inc. | Until you request deletion through Authorr AI |
| Voice model ID | Your browser (localStorage only) | Until you delete the clone or clear your browser data |

**To request deletion:** Delete your Voice Clone within the app, or contact us at **[CONTACT EMAIL]**. Upon your deletion request, we will instruct Cartesia to delete the voice model.

We will comply with deletion requests **within 30 days**.

---

### 6. Your Rights

You have the right to:
- **Refuse consent** — You are not required to use the Voice Cloning feature. Choosing not to consent will not affect your access to other features on your plan (e.g., standard Cartesia voices will still be available).
- **Access** — Request information about the biometric data we have collected.
- **Delete** — Request destruction of your biometric data at any time by deleting your Voice Clone in the app or contacting **[CONTACT EMAIL]**.
- **Withdraw consent** — You may withdraw consent at any time by deleting your Voice Clones. Withdrawal does not affect the lawfulness of processing prior to withdrawal.
- **Complain** — File a complaint with applicable data protection authorities in your jurisdiction.

---

### 7. Your Obligation — Consent for Third-Party Voices

**IMPORTANT:** You may ONLY submit:
(a) **Your own voice**, OR
(b) Another person's voice for which you have obtained **explicit, written consent** from that person authorizing you to clone their voice for your intended purpose.

By using the Voice Cloning feature, you represent and warrant under penalty of legal consequence that:

- [ ] I am submitting my own voice, OR I have obtained explicit written consent from the person whose voice I am submitting.
- [ ] I understand that submitting another person's voice without consent may violate biometric privacy laws including BIPA (which provides for statutory damages of $1,000–$5,000 per violation), right-of-publicity laws, and may expose me to civil and criminal liability.
- [ ] I will not use any Voice Clone to impersonate, defraud, defame, or harm any person.
- [ ] I will not use any Voice Clone for election interference, deepfake fraud, or any other deceptive or illegal purpose.
- [ ] I will not attempt to clone the voice of a celebrity, public figure, or professional voice actor without their explicit consent.

---

### 8. No Sale of Biometric Data

**[YOUR COMPANY NAME]** will not sell, lease, trade, or otherwise profit from your biometric data. We will not disclose your biometric data to third parties except:
(a) To Cartesia, Inc. as necessary to provide the Voice Cloning feature;
(b) As required by law, regulation, or court order;
(c) With your explicit consent.

---

### 9. Illinois BIPA — Specific Disclosures

For Illinois residents, we provide the following disclosures as required by 740 ILCS 14/15:

**(a)** We are collecting biometric identifiers/information from you.

**(b)** The specific biometric identifiers/information being collected: voice recordings and derived voice models.

**(c)** The purpose for which the data is being collected: to create a synthetic voice model via Cartesia, Inc. for use in AI narration.

**(d)** The length of time for which the data will be stored and used: until you request deletion or close your account (see Section 5 above).

**(e)** Whether the data will be disseminated to third parties: yes, the audio recording is transmitted to Cartesia, Inc. for processing as described above. We will not sell or profit from your biometric data.

By checking the consent box and clicking "Consent and Continue," you provide the written release required by 740 ILCS 14/15(b) authorizing collection and use of your biometric data for the purposes described above.

---

### 10. Contact for Biometric Data Requests

For any questions, access requests, deletion requests, or concerns about your biometric data:

**Email:** [CONTACT EMAIL]
**Subject line:** "Biometric Data Request"

**Mailing Address:**
[YOUR COMPANY NAME]
[YOUR ADDRESS]
[CITY, STATE, ZIP, COUNTRY]

We will respond to biometric data requests within **30 days**.

---

*By clicking "Consent and Continue" in the Voice Cloning interface, you acknowledge that you have read, understood, and agreed to this Biometric Data Notice and Consent, and that all statements in Section 7 are true.*

---

*This document should be reviewed by a licensed attorney before deployment. BIPA in particular has been a source of significant class action litigation in Illinois. If you have Illinois users, strict compliance with BIPA's written consent and notice requirements is strongly advised.*
