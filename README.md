---
title: Reminder Bot
emoji: 🤖
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# 🤖 Intelligent Reminder Chatbot

A powerful, AI-driven reminder assistant that works on **WhatsApp** and **Telegram**. It supports natural language (English/Hindi/Hinglish), voice notes, recurring reminders, and includes a full Admin Dashboard.

## 🌟 Features

-   **Natural Language Processing**: "Remind me to call Mom tomorrow at 5pm" or "Kal subah 9 baje meeting hai".
-   **Voice Notes**: Send voice messages on WhatsApp/Telegram; they are transcribed and processed automatically.
-   **Smart Recurrence**: Daily, Weekly, Monthly, and Custom Interval support.
-   **Admin Dashboard**: Manage users, view stats, ban spammers, and monitor system logs.
-   **Abuse Prevention**: Rate limiting, spam detection, and free-tier limits.
-   **Secure**: Strict webhook verification and environment security.

---

## 🛠️ Prerequisites

Before running the project, ensure you have:

1.  **Node.js** (v18 or higher)
2.  **MongoDB** (Local or Atlas URL)
3.  **WhatsApp Cloud API** Account (Meta Developers)
4.  **Telegram Bot Token** (@BotFather)
5.  **Groq API Key** (for LLM & Whisper)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
(If `.env.example` doesn't exist, create `.env` with the following variables):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/chatbot

# Security
ADMIN_SECRET=your_admin_secret_key

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# WhatsApp
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret

# AI / NLP
GROQ_API_KEY=your_groq_api_key
ENABLE_NLP=true
```

### 4. Build the Project
```bash
npm run build
```
*(Or verify TypeScript compilation)*

---

## 🏃‍♂️ Running Locally

### 1. Start MongoDB
Ensure your local MongoDB instance is running:
```bash
mongod
```

### 2. Start the Server
Run the development server (with hot-reload):
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 3. Expose Webhooks (Ngrok)
To receive messages from WhatsApp/Telegram locally, you need a public URL.
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://xyz.ngrok-free.app`).

### 4. Configure Webhooks
-   **WhatsApp**: Go to Meta Developers Dashboard -> WhatsApp -> Configuration. Set Callback URL to `https://xyz.ngrok-free.app/webhook/whatsapp` and Verify Token.
-   **Telegram**: The bot polls automatically (or you can set webhook).

---

## 🖥️ Admin Dashboard

Access the admin panel to monitor your bot:
-   **URL**: `http://localhost:3000/admin.html`
-   **Capabilities**:
    -   View total users and reminders.
    -   Ban/Unban users.
    -   Increase reminder limits for premium users.
    -   View system logs (Retry attempts, Early alerts).

---

## 🧪 Testing

1.  **WhatsApp**: Send "Hi" or "Remind me to drink water in 5 mins".
2.  **Voice**: Send a voice note saying "Kal subah gym jana hai".
3.  **Queries**: Ask "Show my reminders".

---

## 📂 Project Structure

-   `src/app.ts`: Entry point.
-   `src/controllers`: Handles webhooks and admin API.
-   `src/services`: Business logic (NLP, Scheduler, Voice, Message Handler).
-   `src/models`: Database schemas (User, Reminder, SystemLog).
-   `public/`: Static files (Landing page, Admin panel).

---

## 🛡️ License
ISC
