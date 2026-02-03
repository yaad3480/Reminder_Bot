import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
    action: string;
    adminId?: string;
    targetUserId?: string;
    details?: any;
    timestamp: Date;
}

const SystemLogSchema: Schema = new Schema({
    action: { type: String, required: true },
    adminId: { type: String },
    targetUserId: { type: String },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
