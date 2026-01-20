import cron from 'node-cron';
import Reminder from '../models/Reminder';
import { sendMessage } from './bot.service';

export const initScheduler = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('--- Scheduler Tick ---');

    try {
      const now = new Date();

      // 1. Find due reminders
      const reminders = await Reminder.find({
        status: 'pending',
        scheduledAt: { $lte: now }
      }).populate('user');

      if (reminders.length === 0) {
        console.log('No due reminders.');
        return;
      }

      console.log(`Found ${reminders.length} due reminders.`);

      for (const reminder of reminders) {
        const user: any = reminder.user;

        if (!user?.platform || !user?.platformId) {
          console.error(
            `❌ Missing platform or platformId for reminder ${reminder._id}`
          );
          continue;
        }

        try {
          // 2. REAL message delivery
          const delivered = await sendMessage(
            user.platform,
            user.platformId,
            `🔔 Reminder: ${reminder.text}`
          );

          if (!delivered) {
            console.warn(
              `⚠️ Message not delivered for reminder ${reminder._id}`
            );
            continue;
          }

          // 3. Handle recurrence
          let nextDate: Date | undefined;

          if (reminder.recurrence) {
            const lastDate = new Date(reminder.scheduledAt);

            if (reminder.recurrence.type === 'daily') {
              nextDate = new Date(lastDate);
              nextDate.setDate(nextDate.getDate() + 1);
            } else if (reminder.recurrence.type === 'weekly') {
              nextDate = new Date(lastDate);
              nextDate.setDate(nextDate.getDate() + 7);
            } else if (
              reminder.recurrence.type === 'interval' &&
              reminder.recurrence.intervalValue
            ) {
              nextDate = new Date(lastDate);
              nextDate.setDate(
                nextDate.getDate() + reminder.recurrence.intervalValue
              );
            }
          }

          // 4. Create next reminder if recurring
          if (nextDate) {
            await Reminder.create({
              user: reminder.user,
              text: reminder.text,
              originalText: reminder.originalText,
              scheduledAt: nextDate,
              status: 'pending',
              recurrence: reminder.recurrence
            });

            console.log(
              `🔁 Rescheduled recurring reminder for ${nextDate.toISOString()}`
            );
          }

          // 5. Mark current reminder as SENT (ONLY AFTER SUCCESS)
          reminder.status = 'sent';
          await reminder.save();

          console.log(`✅ Reminder ${reminder._id} marked as SENT.`);
        } catch (error) {
          console.error(
            `❌ Failed to deliver reminder ${reminder._id}. Will retry.`,
            error
          );
          // IMPORTANT: do NOT mark as sent
        }
      }
    } catch (error) {
      console.error('Scheduler Error:', error);
    }

    console.log('----------------------');
  });
};
