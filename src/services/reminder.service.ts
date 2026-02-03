import Reminder, { IReminder } from '../models/Reminder';
import mongoose from 'mongoose';

export const createReminder = async (
    userId: string | mongoose.Types.ObjectId,
    text: string,
    originalText: string,
    scheduledAt: Date,
    recurrence?: IReminder['recurrence']
): Promise<IReminder> => {
    return await Reminder.create({
        user: userId,
        text,
        originalText,
        scheduledAt,
        recurrence,
        status: 'pending'
    });
};

export const getPendingRemindersToTrigger = async (now: Date = new Date()): Promise<IReminder[]> => {
    return await Reminder.find({
        status: 'pending',
        scheduledAt: { $lte: now }
    }).populate('user');
};

export const updateReminderStatus = async (
    reminderId: string | mongoose.Types.ObjectId,
    status: 'sent' | 'failed' | 'pending',
    nextScheduledAt?: Date
) => {
    if (status === 'sent' && nextScheduledAt) {
        // If recurring, we might want to create a new reminder or update the current one's schedule.
        // Creating a new one preserves history. Updating is simpler.
        // Let's create a new one for history if needed, but for MVP updating schedule allows keeping the same ID? 
        // Actually, "status: sent" implies it's done. 
        // If recurring, we should probably treat the "sent" reminder as done and create a NEW pending reminder.

        // 1. Mark current as sent
        await Reminder.findByIdAndUpdate(reminderId, { status: 'sent' });

        // 2. Fetch original to copy details
        const original = await Reminder.findById(reminderId);
        if (original && original.recurrence) {
            await Reminder.create({
                user: original.user,
                text: original.text,
                originalText: original.originalText,
                scheduledAt: nextScheduledAt,
                status: 'pending',
                recurrence: original.recurrence
            });
        }
    } else {
        await Reminder.findByIdAndUpdate(reminderId, { status });
    }
};

export const getReminderStats = async () => {
    const total = await Reminder.countDocuments();
    const active = await Reminder.countDocuments({ status: 'pending' });
    const sent = await Reminder.countDocuments({ status: 'sent' });
    return { total, active, sent };
};

import { parseReminderIntent } from './nlp.service';
import User from '../models/User';

export const processTextReminder = async (
    userId: string | null,
    platform: 'whatsapp' | 'telegram' | undefined,
    platformId: string | undefined,
    text: string,
    providedScheduledAt?: Date,
    providedRecurrence?: any
) => {
    // 1. Resolve User
    let user;
    if (userId) {
        user = await User.findById(userId);
    } else if (platform && platformId) {
        user = await User.findOne({ platform, platformId });
        if (!user) {
            user = await User.create({ platform, platformId, name: 'API User' });
        }
    }

    if (!user) {
        throw new Error('User not found and could not be created');
    }

    // 1.5 Enforce Reminder Limit (Total Lifetime Count)
    const totalReminders = await Reminder.countDocuments({ user: user._id });
    if (totalReminders >= user.reminderLimit) {
        return {
            reminder: null,
            confirmationText: `⚠️ *Limit Reached*\n\nYou have used ${totalReminders}/${user.reminderLimit} free reminders.\n\nPlease upgrade to Premium to continue setting reminders!`
        };
    }

    // 2. Resolve Date/Time (NLP if needed)
    let scheduledAt = providedScheduledAt;
    let recurrence = providedRecurrence;
    let confirmationText = "Reminder created";

    if (!scheduledAt) {
        const nlpResult = await parseReminderIntent(text);
        if (nlpResult && nlpResult.isoDate) {
            scheduledAt = new Date(nlpResult.isoDate);
            recurrence = nlpResult.recurrence;
            confirmationText = nlpResult.confirmationText || confirmationText;
        } else {
            throw new Error('Could not parse date from text');
        }
    }

    // 3. Create Reminder
    const reminder = await Reminder.create({
        user: user._id,
        text,
        originalText: text,
        scheduledAt,
        recurrence,
        status: 'pending'
    });

    return { reminder, confirmationText };
};
