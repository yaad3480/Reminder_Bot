import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    platform: 'whatsapp' | 'telegram';
    platformId: string;
    name?: string;
    language: string;
    isBanned: boolean;
    reminderLimit: number;
    tier: 'free' | 'premium';
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    platform: { type: String, required: true, enum: ['whatsapp', 'telegram'] },
    platformId: { type: String, required: true },
    name: { type: String },
    language: { type: String, default: 'en' },
    isBanned: { type: Boolean, default: false },
    reminderLimit: { type: Number, default: 10 },
    tier: { type: String, enum: ['free', 'premium'], default: 'free' },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique user per platform
UserSchema.index({ platform: 1, platformId: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);
