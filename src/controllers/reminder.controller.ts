import { Request, Response } from 'express';
import Reminder from '../models/Reminder';
import { processTextReminder } from '../services/reminder.service';
import { transcribeAudio } from '../services/voice.service';
// User said "Create reminder", "Confirm reminder".
// Let's assume standard API create.

export const createReminderController = async (req: Request, res: Response) => {
    try {
        const { userId, text, platform, platformId, scheduledAt, recurrence } = req.body;

        const result = await processTextReminder(
            userId,
            platform,
            platformId,
            text,
            scheduledAt,
            recurrence
        );

        res.status(201).json({
            message: result.confirmationText,
            reminder: result.reminder
        });

    } catch (error: any) {
        console.error('Create Reminder Error:', error);
        if (error.message === 'Could not parse date from text') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

export const createVoiceReminderController = async (req: Request, res: Response) => {
    try {
        const { userId, audioUrl, platform, platformId } = req.body;

        if (!audioUrl) {
            res.status(400).json({ error: 'audioUrl is required' });
            return;
        }

        // 1. Download & Transcribe
        // Note: platform is needed if it's a WhatsApp URL to attach headers
        const text = await transcribeAudio(audioUrl, platform || 'telegram');

        if (!text) {
            res.status(400).json({ error: 'Could not transcribe audio' });
            return;
        }

        console.log(`Transcribed Voice: "${text}"`);

        // 2. Reuse Reminder Logic
        const result = await processTextReminder(
            userId,
            platform,
            platformId,
            text
        );

        res.status(201).json({
            message: result.confirmationText,
            transcription: text,
            reminder: result.reminder
        });

    } catch (error: any) {
        console.error('Voice Reminder Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const confirmReminderController = async (req: Request, res: Response) => {
    // "Confirm reminder" - usually implies transition from a draft/awaiting-confirmation state to active.
    // Or just acknowledging a created reminder.
    // Since our create flow sets 'pending' (active) immediately, maybe this is just ensuring it exists?
    // OR, maybe the user wants a flow where Create -> Draft, Confirm -> Pending.
    // Given the previous bot flow was "Bot asks for confirmation: Reply YES", 
    // let's assume this controller mimics that "YES" action if we had a "waiting_confirmation" state.
    // BUT, the MVP supported features said "Bot asks for confirmation... On confirmation: Reminder is stored".
    // So "Create" might just be "Parse & Preview", and "Confirm" is "Store".

    // However, to keep it simple and robust as requested:
    // Let's implement confirm as "Get by ID and verify details" or "Force status to pending if it was draft".
    // For now, I'll interpret "Confirm reminder" as "Mark as confirmed/pending" if I introduce a 'draft' state,
    // OR just simple "get info".
    // Actually, looking at "3.2 Controllers... Create... Confirm", it mirrors the user flow.

    // Let's stick to the current schema where 'pending' means active. 
    // I will return the reminder details effectively confirming it.

    try {
        const { id } = req.params;
        const reminder = await Reminder.findById(id).populate('user');
        if (!reminder) {
            res.status(404).json({ error: 'Reminder not found' });
            return;
        }
        res.json({ message: 'Reminder confirmed', reminder });
    } catch (error) {
        res.status(500).json({ error: 'Error confirming reminder' });
    }
};

export const fetchDueRemindersController = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        // Find pending reminders <= now
        const reminders = await Reminder.find({
            status: 'pending',
            scheduledAt: { $lte: now }
        }).populate('user');

        res.json({ count: reminders.length, reminders });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching due reminders' });
    }
};
