import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { config } from '../config/env';

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

// LAZY INITIALIZATION inside function to prevent startup crashes if key is missing/loaded late
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const downloadFile = async (url: string, outputPath: string, headers: any = {}) => {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers,
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error: Error | null = null;
        writer.on('error', (err: any) => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) resolve(true);
        });
    });
};

const convertToMp3 = (inputPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('error', (err: Error) => reject(err))
            .on('end', () => resolve(outputPath))
            .save(outputPath);
    });
};

export const transcribeAudio = async (url: string, platform: 'whatsapp' | 'telegram'): Promise<string | null> => {
    // Determine temp dir relatively or absolutely
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileId = uuidv4();
    const inputPath = path.join(tempDir, `${fileId}_input`);
    const outputPath = path.join(tempDir, `${fileId}.mp3`);

    // Add necessary extension for ffmpeg detection
    // WhatsApp often sends .ogg (Opus), Telegram .oga (Opus)
    const inputPathWithExt = inputPath + '.ogg';

    try {
        let headers = {};
        if (platform === 'whatsapp') {
            headers = { Authorization: `Bearer ${config.whatsappToken}` };
        }
        // Telegram URL contains token, no header needed usually for file download

        console.log(`⬇️ Downloading audio from ${platform}...`);
        await downloadFile(url, inputPathWithExt, headers);

        console.time(`Transcode-${fileId}`);
        console.log(`🎵 Converting to MP3...`);
        await convertToMp3(inputPathWithExt, outputPath);
        console.timeEnd(`Transcode-${fileId}`);

        console.time(`GroqWhisper-${fileId}`);
        console.log(`🗣 Transcribing with Groq Whisper...`);



        if (!config.groqApiKey) {
            throw new Error("GROQ_API_KEY is not set in environment");
        }

        const groq = new Groq({ apiKey: config.groqApiKey });

        // Groq SDK requires a ReadStream (or File object)
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(outputPath),
            model: "whisper-large-v3", // Best for multilingual/Hinglish
            response_format: "json", // or 'text'
            language: "en", // Optional: prompting 'en' might help mixed Hinglish, or leave auto
            // prompt: "Transcribe Hindi or English audio." 
        });
        console.timeEnd(`GroqWhisper-${fileId}`);

        const text = transcription.text;
        console.log(`📝 Transcribed: "${text}"`);

        // Cleanup
        if (fs.existsSync(inputPathWithExt)) fs.unlinkSync(inputPathWithExt);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        return text;

    } catch (error) {
        console.error('❌ Transcription Error:', error);
        // Cleanup on error
        if (fs.existsSync(inputPathWithExt)) fs.unlinkSync(inputPathWithExt);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return null;
    }
};
