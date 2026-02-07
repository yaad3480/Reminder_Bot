# Moving RemindBot to Production: WhatsApp Business API Guide

To replace the "Twilio Sandbox" name with your own custom name (e.g., "RemindBot") and remove the need for users to join a sandbox, you must move to the **WhatsApp Business Platform (API)**. This guide outlines the steps, timeline, and costs involved.

## 1. Step-by-Step Implementation

### Phase 1: Prerequisites (Client Side)
1.  **Facebook Business Manager:** You must have a verified [Meta Business Suite](https://business.facebook.com/) account. Meta requires business verification (uploading business license/registration documents) to approve your display name.
2.  **Twilio Account:** An upgraded Twilio account (not trial) with a credit card attached.

### Phase 2: Configuration (Developer Side)
1.  **Purchase a Number:** Buy a fresh phone number on Twilio (~$1.15/month).
    *   *Note: You cannot use a number already registered on WhatsApp personal/business app. It must be a clean number.*
2.  **Request WhatsApp Access:**
    *   In the Twilio Console > Messaging > WhatsApp > Senders.
    *   Link your Twilio account to your Facebook Business Manager.
    *   Submit your **Business Display Name** (e.g., "RemindBot") for approval.
3.  **Verification:** Meta reviews the display name and business details. This typically takes **5-20 business days**.
4.  **Go Live:** Once approved, we update the bot to use the new number. Users can simply message this number to start—no "join" codes needed.

---

## 2. Estimated Pricing (India Region)

Costs are split between Twilio connection fees and WhatsApp (Meta) conversation charges.

### A. Fixed Monthly Costs
| Item | Cost (Approx) | Notes |
| :--- | :--- | :--- |
| **Phone Number Rental** | ~$1.15 / month | Paid to Twilio for the dedicated number. |

### B. Variable Costs (Per Message/Conversation)
*Effective as of recent 2024/2025 pricing models.*

**1. Twilio Service Fee:**
*   **$0.005 (approx ₹0.42)** per message sent or received.

**2. WhatsApp (Meta) Conversation Fees:**
Pricing is based on 24-hour conversation windows, categorized by template type.

| Category | Cost (INR) | Definition |
| :--- | :--- | :--- |
| **Service (User-Initiated)** | **FREE** | When a user messages you first (e.g., requesting a reminder). Free for the first 24 hours. |
| **Utility** | ~₹0.13 / msg | Transactional updates (e.g., "Here is your reminder for 10 AM"). |
| **Marketing** | ~₹0.88 / msg | Promotional offers (RemindBot likely won't use this initially). |
| **Authentication** | ~₹0.13 / msg | OTPs/Verification codes. |

> **Typical Scenario for RemindBot:**
> *   **Setting a reminder:** User sends text → Bot replies. (**Free Service conversation**).
> *   **Receiving a reminder:** Bot sends reminder later. (**Utility category** charge applies if outside 24h window).

### C. Free Tier
*   Twilio/Meta typically offers **1,000 free service conversations** per month.

---

## 3. Summary for Client

| Feature | Sandbox (Current) | Production (Goal) |
| :--- | :--- | :--- |
| **Name** | "Twilio Sandbox" | **"RemindBot"** (Your Custom Name) |
| **Entry** | User must type "join soil-silence" | **Direct Message** (Click to Chat) |
| **Verification** | None | **Green Tick** (Eligible to apply later) |
| **Messaging limit** | Limited (Testing only) | **Scalable** (Production limits) |
| **Cost** | Free (Trial) | **~$2/mo + Usage fees** |

### Recommendation
For a professional launch, moving to production is essential. The cost is low for low-volume usage (mostly free service conversations), but the business verification process with Meta is the primary time bottleneck (1-3 weeks).
