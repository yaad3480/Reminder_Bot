import { findOrCreateUser } from './user.service';
import { parseReminderIntent } from './nlp.service';
import { createReminder } from './reminder.service';
import { sendMessage } from './bot.service';
import Reminder from '../models/Reminder';
import { UserRateLimiter } from './rate_limiter.service';

const rateLimiter = UserRateLimiter.getInstance();

export const handleIncomingMessage = async (
    platform: 'whatsapp' | 'telegram',
    platformId: string,
    userName: string,
    text: string
) => {
    try {
        console.log(`Received message from ${userName} (${platform}): ${text}`);

        // 0. Rate Limit & Spam Check
        // Use platformId as user identifier before we even fetch the User doc to save DB calls
        const limitCheck = rateLimiter.checkRateLimit(platformId, 10, 60000); // 10 msgs / min
        if (!limitCheck.allowed) {
            console.warn(`Rate limit exceeded for ${platformId}`);
            if (Math.random() < 0.3) { // Only send warning sometimes to avoid spamming the spammer
                await sendMessage(platform, platformId, "⚠️ You are sending messages too fast. Please slow down.");
            }
            return;
        }

        if (rateLimiter.isDuplicate(platformId, text)) {
            console.warn(`Duplicate message ignored from ${platformId}`);
            return;
        }

        // 1. Get User
        const user = await findOrCreateUser(platform, platformId, userName);

        if (user.isBanned) {
            console.log(`Ignored message from banned user: ${platformId}`);
            return;
        }

        // 2. Parse Intent
        // Capture specific time of message processing as the "Reference Time" for NLP
        // This ensures "in 5 mins" is relative to THIS moment.
        const referenceTime = new Date();
        const nlpResult = await parseReminderIntent(text, referenceTime);

        if (!nlpResult) {
            await sendMessage(platform, platformId, "Sorry, I encountered an error parsing your request.");
            return;
        }

        // HANDLE LIST REMINDERS (NEW)
        if (nlpResult.intent === 'list_reminders') {
            const filter = nlpResult.filter || 'pending';
            let query: any = { user: user._id };
            let sort: any = { scheduledAt: 1 };
            let header = "📅 *Your Reminders*";

            if (filter === 'history') {
                // Last 15 days, completed/sent
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                query.status = { $ne: 'pending' };
                query.scheduledAt = { $gte: fifteenDaysAgo };
                sort = { scheduledAt: -1 };
                header = "📜 *History (Last 15 Days)*";
            } else if (filter === 'today') {
                // Today (IST Start to End) - SHOW ALL STATUSES
                const now = new Date();
                const startOfDay = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                startOfDay.setHours(0, 0, 0, 0);

                const endOfDay = new Date(startOfDay);
                endOfDay.setHours(23, 59, 59, 999);

                query.scheduledAt = { $gte: startOfDay, $lte: endOfDay };
                // No status filter implies ALL statuses (pending, sent, failed)
                sort = { scheduledAt: 1 };
                header = "📅 *Today's Agenda*";
            } else if (filter === 'all') {
                // Show everything (active + history), constrained to 15 days history
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                query.scheduledAt = { $gte: fifteenDaysAgo };

                sort = { scheduledAt: -1 };
                header = "🗂️ *All Reminders (Last 15 Days + Pending)*";
            } else {
                // Pending (Default)
                query.status = 'pending';
                header = "⏳ *Pending Reminders*";
            }

            const reminders = await Reminder.find(query).sort(sort).limit(20);

            if (reminders.length === 0) {
                await sendMessage(platform, platformId, `You have no ${filter} reminders.`);
                return;
            }

            let msg = `${header}\n\n`;
            reminders.forEach((r: any, i: number) => {
                const dateStr = new Date(r.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                msg += `${i + 1}. ${r.text}\n   🕒 ${dateStr} (${r.status})\n`;
            });

            await sendMessage(platform, platformId, msg);
            return;
        }

        // Handle Greeting/Query without reminders
        if (!nlpResult.reminders || nlpResult.reminders.length === 0) {
            if (nlpResult.confirmationText) {
                await sendMessage(platform, platformId, nlpResult.confirmationText);
            } else {
                await sendMessage(platform, platformId, "I couldn't catch the time properly. Please try again (e.g., 'Remind me at 8pm to drink water').");
            }
            return;
        }

        // Check if user can create the requested number of reminders
        const activeRemindersCount = await Reminder.countDocuments({
            user: user._id,
            status: { $in: ['pending', 'processing'] }
        });
        const requestedCount = nlpResult.reminders.length;
        const userLimit = user.reminderLimit || 10;

        if (activeRemindersCount + requestedCount > userLimit) {
            await sendMessage(platform, platformId, `⚠️ Limit Reached! You have ${activeRemindersCount}/${userLimit} active reminders. You're trying to add ${requestedCount} more. Upgrade to Premium for unlimited.`);
            return;
        }

        // 3. Create ALL Reminders
        const createdReminders = [];
        let rescheduledCount = 0;

        for (const reminderData of nlpResult.reminders) {
            let scheduledAt = new Date(reminderData.isoDate);
            const now = new Date();

            // Smart Scheduling: If recurring and time passed today, start tomorrow
            if (reminderData.recurrence && scheduledAt < now) {
                // If it's a daily reminder (or generally recurring), bump to tomorrow
                // to avoid immediate "missed" alert.
                scheduledAt.setDate(scheduledAt.getDate() + 1);
                rescheduledCount++;
            }

            const reminder = await createReminder(
                user._id,
                reminderData.message,
                reminderData.message,
                scheduledAt,
                reminderData.recurrence
            );
            createdReminders.push(reminder);
        }

        // 4. Confirm with count
        let confirmMsg = nlpResult.confirmationText ||
            (createdReminders.length > 1
                ? `✅ I've set ${createdReminders.length} reminders for you! 📝`
                : '✅ specific reminder set! I\'ll notify you on time. 🕰️');

        if (rescheduledCount > 0) {
            confirmMsg += `\n(Note: Since the time passed today, I started ${rescheduledCount} of them from **tomorrow**).`;
        }

        await sendMessage(platform, platformId, confirmMsg);

    } catch (error) {
        console.error('Handler Error:', error);
        await sendMessage(platform, platformId, "Sorry, I encountered an error.");
    }
};
