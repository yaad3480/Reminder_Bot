import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp client initialized');
} else {
    console.warn('⚠️ Twilio credentials missing. WhatsApp functionality disabled.');
}

/**
 * Send a WhatsApp message via Twilio
 * @param to - Recipient WhatsApp number (format: whatsapp:+919876543210)
 * @param message - Message text to send
 */
export const sendWhatsAppMessage = async (to: string, message: string): Promise<void> => {
    if (!twilioClient || !twilioWhatsAppNumber) {
        console.error('❌ Twilio client not initialized');
        return;
    }

    try {
        // Ensure 'to' number has 'whatsapp:' prefix
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const response = await twilioClient.messages.create({
            from: twilioWhatsAppNumber,
            to: formattedTo,
            body: message,
        });

        console.log(`✅ WhatsApp message sent to ${formattedTo}: ${response.sid}`);
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        throw error;
    }
};

/**
 * Send a WhatsApp media message via Twilio
 * @param to - Recipient WhatsApp number (format: whatsapp:+919876543210)
 * @param mediaUrl - URL of the media file
 * @param caption - Optional caption for the media
 */
export const sendWhatsAppMedia = async (
    to: string,
    mediaUrl: string,
    caption?: string
): Promise<void> => {
    if (!twilioClient || !twilioWhatsAppNumber) {
        console.error('❌ Twilio client not initialized');
        return;
    }

    try {
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const response = await twilioClient.messages.create({
            from: twilioWhatsAppNumber,
            to: formattedTo,
            body: caption || '',
            mediaUrl: [mediaUrl],
        });

        console.log(`✅ WhatsApp media sent to ${formattedTo}: ${response.sid}`);
    } catch (error) {
        console.error('❌ Error sending WhatsApp media:', error);
        throw error;
    }
};

/**
 * Format a phone number to WhatsApp format
 * @param phoneNumber - Phone number (with or without country code)
 * @returns Formatted WhatsApp number (whatsapp:+...)
 */
export const formatWhatsAppNumber = (phoneNumber: string): string => {
    // Remove any existing 'whatsapp:' prefix
    let cleaned = phoneNumber.replace('whatsapp:', '');

    // Ensure it starts with '+'
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }

    return `whatsapp:${cleaned}`;
};
