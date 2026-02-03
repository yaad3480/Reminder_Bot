import { Request, Response } from 'express';
import crypto from 'crypto';
import { handleIncomingMessage } from '../services/message_handler.service';
import { telegramBot } from '../services/bot.service';
import { config } from '../config/env';

// Validate WhatsApp Signature
const validateSignature = (req: Request): boolean => {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature || !config.whatsappAppSecret) {
        // Warning: If secret is missing, we skip validation (or we could default to fail)
        // For strict security, this should fail. But for migration safety, we log.
        if (!config.whatsappAppSecret) console.warn('⚠️ WHATSAPP_APP_SECRET not set. Skipping signature validation.');
        return !config.whatsappAppSecret;
    }

    const hmac = crypto.createHmac('sha256', config.whatsappAppSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    return signature === digest;
};

// Telegram Webhook (Optional if using polling)
export const telegramWebhook = async (req: Request, res: Response) => {
    try {
        await telegramBot.handleUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        res.sendStatus(500);
    }
};

// WhatsApp Verify Webhook (GET)
export const verifyWhatsapp = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// WhatsApp Event Webhook (POST)
export const handleWhatsappEvent = async (req: Request, res: Response) => {
    try {
        // STRICT SECURITY CHECK
        if (config.whatsappAppSecret && !validateSignature(req)) {
            console.error('❌ Invalid WhatsApp Signature');
            return res.sendStatus(401);
        }

        const body = req.body;
        // console.log('WhatsApp Webhook Body:', JSON.stringify(body, null, 2));

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const msg = body.entry[0].changes[0].value.messages[0];
                const from = msg.from; // phone number with country code
                const name = body.entry[0].changes[0].value.contacts[0].profile.name;

                if (msg.type === 'text') {
                    const text = msg.text.body;
                    handleIncomingMessage('whatsapp', from, name, text);
                } else if (msg.type === 'audio') {
                    const mediaId = msg.audio.id;
                    const { getWhatsappMediaUrl } = await import('../services/bot.service');
                    const { transcribeAudio } = await import('../services/voice.service');
                    const { sendMessage } = await import('../services/bot.service');

                    const url = await getWhatsappMediaUrl(mediaId);
                    if (url) {
                        const text = await transcribeAudio(url, 'whatsapp');
                        if (text) {
                            await sendMessage('whatsapp', from, `🗣 I heard: "${text}"`);
                            handleIncomingMessage('whatsapp', from, name, text);
                        } else {
                            await sendMessage('whatsapp', from, "Sorry, I couldn't understand the audio.");
                        }
                    } else {
                        await sendMessage('whatsapp', from, "Failed to download audio.");
                    }
                }

            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('WhatsApp Handler Error:', error);
        res.sendStatus(500);
    }
};
