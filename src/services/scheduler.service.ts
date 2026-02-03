import cron from 'node-cron';
import Reminder from '../models/Reminder';
import SystemLog from '../models/SystemLog'; // Import Logging Model
import { sendMessage } from './bot.service';
import { PersonalityService } from './personality.service';
import dayjs from 'dayjs';

export const initScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    // console.log('--- Scheduler Tick ---');

    await processDueReminders();
  });
};

export const processDueReminders = async () => {
  try {
    const now = new Date();
    // console.log(`[Scheduler] Tick at ${now.toISOString()}`);

    /* =============================
       1. Early Alerts Logic
    ============================= */
    const earlyAlertReminders = await Reminder.find({
      status: 'pending',
      earlyAlertMinutes: { $exists: true, $gt: 0 },
      earlyAlertSent: { $ne: true }, // Not yet sent
      // scheduledAt is roughly (now + earlyAlertMinutes)
      // We check if (scheduledAt - earlyAlertMinutes) <= now
    }).populate('user');

    for (const reminder of earlyAlertReminders) {
      if (!reminder.earlyAlertMinutes) continue;
      const alertTime = dayjs(reminder.scheduledAt).subtract(reminder.earlyAlertMinutes, 'minute').toDate();

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
            // Log
            await SystemLog.create({
              action: 'EARLY_ALERT_SENT',
              details: `To: ${user.name}, Reminder: ${reminder._id}`
            });
          }
        }
      }
    }

    /* =============================
       2. Standard Delivery Logic (With Atomic Locking)
    ============================= */
    // Find candidates first
    const candidateReminders = await Reminder.find({
      status: 'pending',
      scheduledAt: { $lte: now }
    }).select('_id'); // Just get IDs

    if (candidateReminders.length > 0) {
      console.log(`[Scheduler] Found ${candidateReminders.length} due reminders to process.`);
    }

    for (const candidate of candidateReminders) {
      // Atomic Lock: Try to flip status from 'pending' to 'processing'
      // This ensures only ONE instance picks up this reminder
      const reminder = await Reminder.findOneAndUpdate(
        { _id: candidate._id, status: 'pending' },
        { status: 'processing' },
        { new: true }
      ).populate('user');

      if (!reminder) {
        // Locked by another process or already sent - Skip
        continue;
      }

      const user: any = reminder.user;

      if (!user?.platform || !user?.platformId) {
        console.error(`❌ Bad Reminder Data: ${reminder._id}`);
        reminder.status = 'failed';
        await reminder.save();
        continue;
      }

      try {
        // ATTEMPT DELIVERY
        const friendlyMessage = await PersonalityService.rewriteReminder(reminder.text);
        const delivered = await sendMessage(
          user.platform,
          user.platformId,
          friendlyMessage
        );

        if (!delivered) {
          throw new Error("Message delivery returned false");
        }

        /* ========================
           SUCCESS
        ======================== */

        await SystemLog.create({
          action: 'REMINDER_SENT',
          details: `To: ${user.name}, ID: ${reminder._id}`
        });

        // Update lastTriggeredAt
        reminder.lastTriggeredAt = new Date();

        // Handle Recurrence or Mark Done
        if (reminder.recurrence) {
          let nextDate: dayjs.Dayjs | undefined;
          const lastScheduled = dayjs(reminder.scheduledAt);

          if (reminder.recurrence.type === 'daily') {
            nextDate = lastScheduled.add(1, 'day');
          } else if (reminder.recurrence.type === 'weekly') {
            nextDate = lastScheduled.add(1, 'week');
          } else if (reminder.recurrence.type === 'monthly') {
            nextDate = lastScheduled.add(1, 'month');
          } else if (
            reminder.recurrence.type === 'interval' &&
            reminder.recurrence.intervalValue
          ) {
            nextDate = lastScheduled.add(reminder.recurrence.intervalValue, 'day');
          }

          if (nextDate) {
            // UPDATE IN PLACE (The Core Fix)
            reminder.scheduledAt = nextDate.toDate();
            reminder.status = 'pending'; // Reset to pending for next cycle
            reminder.earlyAlertSent = false; // Reset early alert
            reminder.retryCount = 0; // Reset retries

            console.log(`🔁 Recurring Reminder ${reminder._id} updated for ${nextDate.toISOString()}`);
          } else {
            // Should not happen if recurrence is valid, but fallback
            reminder.status = 'sent';
          }
        } else {
          // One-time reminder
          reminder.status = 'sent';
        }

        await reminder.save();

      } catch (error) {
        /* ========================
           FAILURE / RETRY
        ======================== */
        console.error(`❌ Failed Reminder ${reminder._id}:`, error);

        reminder.retryCount = (reminder.retryCount || 0) + 1;

        if (reminder.retryCount >= (reminder.maxRetries || 3)) {
          reminder.status = 'failed';
          await SystemLog.create({
            action: 'REMINDER_FAILED',
            details: `ID: ${reminder._id}, Retries: ${reminder.retryCount}`
          });
          console.error(`💀 Reminder ${reminder._id} marked FAILED after max retries.`);
        } else {
          // Unlock: Reset status to 'pending' so it can be picked up again next tick
          reminder.status = 'pending';
          console.log(`⚠️ Reminder ${reminder._id} failed, resetting to pending for retry (Attempt ${reminder.retryCount})`);
        }

        await reminder.save();
      }
    }
  } catch (error) {
    console.error('Scheduler Error:', error);
  }
};
