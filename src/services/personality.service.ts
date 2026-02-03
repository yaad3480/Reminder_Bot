import { generateFriendlyMessage } from './providers/groq.provider';

export class PersonalityService {
    static async rewriteReminder(originalText: string): Promise<string> {
        // Skip for very short or system-like messages if needed
        if (originalText.length < 3) return originalText;

        try {
            console.log(`[Personality] Rewriting: "${originalText}"...`);
            const friendlyMsg = await generateFriendlyMessage(originalText);
            console.log(`[Personality] Result: "${friendlyMsg}"`);
            return friendlyMsg;
        } catch (error) {
            console.error('[Personality] Failed to generate, using original.');
            return `*Reminder*: ${originalText}`;
        }
    }
}
