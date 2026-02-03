import Reminder from './models/Reminder';
import './models/User'; // Ensure User model is registered
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Connected to DB');

        const now = new Date();
        console.log('Current Server Time (UTC):', now.toISOString());
        console.log('Current Server Time (Local):', now.toString());

        // Find all reminders, sorted by creation (newest first)
        const reminders = await Reminder.find({}).sort({ createdAt: -1 }).limit(20).populate('user');
        console.log(`Found ${reminders.length} recent reminders (all statuses):`);

        reminders.forEach(r => {
            console.log('------------------------------------------------');
            console.log(`ID: ${r._id}`);
            console.log(`Text: ${r.text}`);
            console.log(`Status: ${r.status}`);
            console.log(`Created At: ${new Date(r.createdAt).toLocaleString()}`);
            console.log(`ScheduledAt (UTC): ${new Date(r.scheduledAt).toISOString()}`);
            console.log(`ScheduledAt (Local): ${new Date(r.scheduledAt).toString()}`);
            console.log(`Due in: ${(new Date(r.scheduledAt).getTime() - now.getTime()) / 1000} seconds`);
            // @ts-ignore
            console.log(`User: ${r.user?.name || 'Unknown'} (${r.user?.platform})`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
