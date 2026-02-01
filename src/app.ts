import dotenv from 'dotenv';
dotenv.config(); // Must be first

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            subdomain?: 'admin' | 'main';
        }
    }
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import { verifyWhatsapp, handleWhatsappEvent } from './controllers/webhook.controller';
import { telegramBot } from './services/bot.service';
import { handleIncomingMessage } from './services/message_handler.service';
import { initScheduler } from './services/scheduler.service';
import adminRoutes from './admin/admin.routes';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 3000;

// Rate Limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Stricter limit for heavy APIs
    message: 'Too many API requests, please slow down.'
});


// Middleware
// CORS Configuration - strict for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || false // Only specified origins in production
        : true, // Allow all in development
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
// app.use(helmet()); // DISABLING HELMET TO FIX CSP ISSUES FOR ADMIN DASHBOARD
app.use(morgan('dev'));
app.use('/api/', apiLimiter); // Apply stricter limit to /api routes
app.use(globalLimiter); // Apply global limit to everything else (like webhooks if not excluded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to Database
connectDB();

// Initialize Scheduler
initScheduler();

// Routes
app.use(express.static('public')); // Serve landing page assets
app.use('/admin', express.static('admin')); // Serve admin assets at /admin

// Root Route -> Landing Page
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// Admin Route -> Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile('index.html', { root: 'admin' });
});

// Admin routes
app.use(adminRoutes);

import { createReminderController, confirmReminderController, fetchDueRemindersController, createVoiceReminderController } from './controllers/reminder.controller';
// Explicit Routes for "Do only these"
app.post('/api/reminders', createReminderController as any);
app.post('/api/reminders/voice', createVoiceReminderController as any);
app.get('/api/reminders/due', fetchDueRemindersController as any);
app.get('/api/reminders/:id/confirm', confirmReminderController as any);


// WhatsApp Webhooks
app.get('/webhooks/whatsapp', verifyWhatsapp);
app.post('/webhooks/whatsapp', handleWhatsappEvent);

// Telegram Polling (for local dev/simplicity)
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'dummy_token' && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token') {
    telegramBot.launch().then(() => {
        console.log('Telegram Bot launched');
    }).catch(err => console.error('Telegram Bot Launch Error:', err));

    telegramBot.on('text', (ctx) => {
        const userId = ctx.from.id.toString();
        const userName = ctx.from.first_name || 'User';
        const text = ctx.message.text;
        handleIncomingMessage('telegram', userId, userName, text);
    });

    telegramBot.on('voice', async (ctx) => {
        const userId = ctx.from.id.toString();
        const userName = ctx.from.first_name || 'User';
        try {
            const fileId = ctx.message.voice.file_id;
            const fileUrl = await ctx.telegram.getFileLink(fileId);

            await ctx.reply("🎧 Processing your voice message...");

            // Dynamic import to avoid circular dependency if valid, or just normal import if structured well.
            // But voice.service imports nothing that imports app.ts.
            const { transcribeAudio } = await import('./services/voice.service');
            const text = await transcribeAudio(fileUrl.toString(), 'telegram');

            if (text) {
                await ctx.reply(`🗣 I heard: "${text}"`);
                handleIncomingMessage('telegram', userId, userName, text);
            } else {
                await ctx.reply("Sorry, I couldn't understand the audio.");
            }
        } catch (error) {
            console.error('Telegram Voice Error:', error);
            await ctx.reply("Error processing voice message.");
        }
    });

    // Graceful stop
    process.once('SIGINT', () => telegramBot.stop('SIGINT'));
    process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));
} else {
    console.log('Telegram Token not set, skipping bot launch.');
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
