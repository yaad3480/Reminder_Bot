import axios from 'axios';
import { Telegraf } from 'telegraf';
import { config } from '../config/env';
import https from 'https';

/* =========================
   Telegram Setup
========================= */

// Config now guarantees these are present or throws on startup
// Force IPv4 Agent to fix ENOTFOUND errors on Hugging Face
export const telegramBot = new Telegraf(config.telegramToken, {
  telegram: {
    agent: new https.Agent({ family: 4, keepAlive: true })
  }
});

/* =========================
   WhatsApp Setup
========================= */
const { whatsappToken, whatsappPhoneId } = config;

/* =========================
   Send Message (CRITICAL FIX)
========================= */

export const sendMessage = async (
  platform: 'whatsapp' | 'telegram',
  platformId: string,
  text: string
): Promise<boolean> => {
  if (platform === 'telegram') {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await telegramBot.telegram.sendMessage(platformId, text);
        console.log(
          '✅ Telegram message delivered:',
          `chatId=${platformId}, messageId=${res.message_id}`
        );
        return true;
      } catch (error: any) {
        const isNetworkError = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.type === 'system';

        if (isNetworkError && attempt < MAX_RETRIES) {
          console.warn(`⚠️ Telegram sendMessage failed (Attempt ${attempt}/${MAX_RETRIES}). Retrying in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }

        console.error('❌ Telegram sendMessage FAILED:', error);
        throw error;
      }
    }
  }

  if (platform === 'whatsapp') {
    try {
      // Use Twilio for WhatsApp instead of WhatsApp Cloud API
      const { sendWhatsAppMessage, formatWhatsAppNumber } = await import('./twilio.service');
      const formattedNumber = formatWhatsAppNumber(platformId);
      await sendWhatsAppMessage(formattedNumber, text);
      return true;
    } catch (error: any) {
      console.error(
        '❌ WhatsApp sendMessage FAILED:',
        error.message || error
      );
      throw error;
    }
  }

  return false;
};

/* =========================
   WhatsApp Media Helper
========================= */

export const getWhatsappMediaUrl = async (
  mediaId: string
): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${whatsappToken}` },
      }
    );

    return response.data.url;
  } catch (error) {
    console.error('Error fetching WhatsApp media URL:', error);
    return null;
  }
};
