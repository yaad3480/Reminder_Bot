import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
    user: mongoose.Types.ObjectId;
    text: string;
    originalText: string;
    scheduledAt: Date;
    status: 'pending' | 'processing' | 'sent' | 'failed';
    earlyAlertMinutes?: number;
    earlyAlertSent?: boolean;
    retryCount: number;
    maxRetries: number;
    recurrence?: {
        type: 'daily' | 'weekly' | 'monthly' | 'interval';
        intervalValue?: number;
    };
    lastTriggeredAt?: Date;
    createdAt: Date;
}

const ReminderSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    originalText: { type: String },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending' },

    // Delivery Logic
    earlyAlertMinutes: { type: Number },
    earlyAlertSent: { type: Boolean, default: false },
    lastTriggeredAt: { type: Date },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },

    recurrence: {
        type: { type: String, enum: ['daily', 'weekly', 'monthly', 'interval'] },
        intervalValue: { type: Number }
    },
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient scheduler polling
ReminderSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model<IReminder>('Reminder', ReminderSchema);
