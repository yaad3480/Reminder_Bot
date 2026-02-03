import dotenv from 'dotenv';

dotenv.config();

// Core required variables
const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'MONGO_URI',
    'GROQ_API_KEY'  // Required for NLP features
];

// Check for missing variables
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
    throw new Error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN!,
    // WhatsApp is optional
    whatsappToken: process.env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
    mongoUri: process.env.MONGO_URI!,
    port: process.env.PORT || 3000,
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY!,
    adminSecret: process.env.ADMIN_SECRET || 'change-this-in-production'  // For admin authentication
};
