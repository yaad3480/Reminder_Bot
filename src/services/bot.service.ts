import axios from 'axios';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

/* =========================
   Telegram Setup
========================= */

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set');
}

export const telegramBot = new Telegraf(telegramBotToken || 'dummy_token');

/* =========================
   WhatsApp Setup
========================= */

const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

/* =========================
   Send Message (CRITICAL FIX)
========================= */

export const sendMessage = async (
  platform: 'whatsapp' | 'telegram',
  platformId: string,
  text: string
): Promise<boolean> => {
  if (platform === 'telegram') {
    if (!telegramBotToken) {
      throw new Error('Telegram token not set');
    }

    try {
      const res = await telegramBot.telegram.sendMessage(platformId, text);

      console.log(
        '✅ Telegram message delivered:',
        `chatId=${platformId}, messageId=${res.message_id}`
      );

      return true;
    } catch (error) {
      console.error('❌ Telegram sendMessage FAILED:', error);
      throw error; // IMPORTANT: propagate failure
    }
  }

  if (platform === 'whatsapp') {
    try {
      await axios.post(
        `https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: platformId,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ WhatsApp message delivered:', platformId);
      return true;
    } catch (error: any) {
      console.error(
        '❌ WhatsApp sendMessage FAILED:',
        error.response?.data || error.message
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
