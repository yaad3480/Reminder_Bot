import { Request, Response } from 'express';
import Reminder from '../models/Reminder';
import SystemLog from '../models/SystemLog'; // Import Logging Model
import { sendMessage } from '../services/bot.service';

/**
 * Validates the cron secret to prevent unauthorized access.
 */
const isValidCronRequest = (req: Request): boolean => {
    // Check for Authorization header "Bearer <CRON_SECRET>"
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.warn('⚠️ CRON_SECRET not set in environment variables. Cron is insecure.');
        return true; // Fail open in dev, but bad for prod. Vercel usually sets this.
    }

    if (authHeader === `Bearer ${cronSecret}`) return true;

    // Also check query param ?key=... for easier debugging/setup
    if (req.query.key === cronSecret) return true;

    return false;
};

export const cronTick = async (req: Request, res: Response) => {
    // Security Check
    if (!isValidCronRequest(req)) {
        res.status(401).json({ error: 'Unauthorized Cron Request' });
        return;
    }

    try {
        const now = new Date();
        let logs: string[] = [];

        /* =============================
           1. Early Alerts Logic
        ============================= */
        const earlyAlertReminders = await Reminder.find({
            status: 'pending',
            earlyAlertMinutes: { $exists: true, $gt: 0 },
            earlyAlertSent: { $ne: true }, // Not yet sent
        }).populate('user');

        for (const reminder of earlyAlertReminders) {
            if (!reminder.earlyAlertMinutes) continue;
            const alertTime = new Date(reminder.scheduledAt);
            alertTime.setMinutes(alertTime.getMinutes() - reminder.earlyAlertMinutes);

            if (now >= alertTime) {
                const user: any = reminder.user;
                if (user?.platformId) {
                    const delivered = await sendMessage(
                        user.platform,
                        user.platformId,
                        `🔔 *Early Alert*: "${reminder.text}" is in ${reminder.earlyAlertMinutes} mins.`
                    );
                    if (delivered) {
                        reminder.earlyAlertSent = true;
                        await reminder.save();
                        await SystemLog.create({
                            action: 'EARLY_ALERT_SENT',
                            details: `To: ${user.name}, Reminder: ${reminder._id}`
                        });
                        logs.push(`Early alert sent for ${reminder._id}`);
                    }
                }
            }
        }

        /* =============================
           2. Standard Delivery Logic
        ============================= */
        // Find candidates
        const candidateReminders = await Reminder.find({
            status: 'pending',
            scheduledAt: { $lte: now }
        }).select('_id');

        for (const candidate of candidateReminders) {
            // Atomic Lock
            const reminder = await Reminder.findOneAndUpdate(
                { _id: candidate._id, status: 'pending' },
                { status: 'processing' },
                { new: true }
            ).populate('user');

            if (!reminder) continue;

            const user: any = reminder.user;

            if (!user?.platform || !user?.platformId) {
                console.error(`❌ Bad Reminder Data: ${reminder._id}`);
                reminder.status = 'failed';
                await reminder.save();
                continue;
            }

            try {
                // ATTEMPT DELIVERY
                const delivered = await sendMessage(
                    user.platform,
                    user.platformId,
                    `⏰ *Reminder*: ${reminder.text}`
                );

                if (!delivered) throw new Error("Delivery failed");

                /* ========================
                   SUCCESS
                ======================== */
                await SystemLog.create({
                    action: 'REMINDER_SENT',
                    details: `To: ${user.name}, ID: ${reminder._id}`
                });
                logs.push(`Reminder sent: ${reminder._id}`);

                // Handle Recurrence
                let nextDate: Date | undefined;
                if (reminder.recurrence) {
                    const lastDate = new Date(reminder.scheduledAt);
                    if (reminder.recurrence.type === 'daily') {
                        nextDate = new Date(lastDate);
                        nextDate.setDate(nextDate.getDate() + 1);
                    } else if (reminder.recurrence.type === 'weekly') {
                        nextDate = new Date(lastDate);
                        nextDate.setDate(nextDate.getDate() + 7);
                    } else if (reminder.recurrence.type === 'monthly') {
                        nextDate = new Date(lastDate);
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    }
                    // ... (Interval logic if needed)
                }

                if (nextDate) {
                    await Reminder.create({
                        user: reminder.user,
                        text: reminder.text,
                        originalText: reminder.originalText,
                        scheduledAt: nextDate,
                        status: 'pending',
                        recurrence: reminder.recurrence,
                        earlyAlertMinutes: reminder.earlyAlertMinutes
                    });
                    logs.push(`Rescheduled ${reminder._id} to ${nextDate}`);
                }

                reminder.status = 'sent';
                await reminder.save();

            } catch (error) {
                /* ========================
                   FAILURE
                ======================== */
                reminder.retryCount = (reminder.retryCount || 0) + 1;
                if (reminder.retryCount >= (reminder.maxRetries || 3)) {
                    reminder.status = 'failed';
                    logs.push(`Reminder ${reminder._id} FAILED max retries`);
                } else {
                    reminder.status = 'pending';
                    logs.push(`Reminder ${reminder._id} retrying later`);
                }
                await reminder.save();
            }
        }

        res.status(200).json({ success: true, processed: logs });

    } catch (error) {
        console.error('Cron Error:', error);
        res.status(500).json({ error: 'Cron Tick Failed' });
    }
};
