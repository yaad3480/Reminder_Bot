export class UserRateLimiter {
    private static instance: UserRateLimiter;
    private userTimestamps: Map<string, number[]>; // userId -> timestamp[]
    private userLastMessage: Map<string, { text: string; timestamp: number }>; // userId -> last message details

    private constructor() {
        this.userTimestamps = new Map();
        this.userLastMessage = new Map();
        // Clean up every hour
        setInterval(() => this.cleanup(), 3600000);
    }

    public static getInstance(): UserRateLimiter {
        if (!UserRateLimiter.instance) {
            UserRateLimiter.instance = new UserRateLimiter();
        }
        return UserRateLimiter.instance;
    }

    public checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): { allowed: boolean; reason?: string } {
        const now = Date.now();
        const timestamps = this.userTimestamps.get(userId) || [];

        // Filter out timestamps older than the window
        const validTimestamps = timestamps.filter(t => now - t < windowMs);

        if (validTimestamps.length >= limit) {
            return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED' };
        }

        validTimestamps.push(now);
        this.userTimestamps.set(userId, validTimestamps);

        return { allowed: true };
    }

    public isDuplicate(userId: string, text: string, thresholdMs: number = 10000): boolean {
        const now = Date.now();
        const lastMsg = this.userLastMessage.get(userId);

        if (lastMsg) {
            if (lastMsg.text === text && (now - lastMsg.timestamp < thresholdMs)) {
                return true;
            }
        }

        this.userLastMessage.set(userId, { text, timestamp: now });
        return false;
    }

    private cleanup() {
        const now = Date.now();
        // Simple cleanup of old entries
        for (const [userId, timestamps] of this.userTimestamps.entries()) {
            if (timestamps.length > 0 && (now - timestamps[timestamps.length - 1] > 3600000)) {
                this.userTimestamps.delete(userId);
                this.userLastMessage.delete(userId);
            }
        }
    }
}
