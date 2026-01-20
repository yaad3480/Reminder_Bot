/*import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

ffmpeg.setFfmpegPath(ffmpegPath);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        writer.on('error', (err) => {
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

export const transcribeAudio = async (url: string, platform: 'whatsapp' | 'telegram') => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileId = uuidv4();
    const inputPath = path.join(tempDir, `${fileId}_input`); // Extension depends on platform (oga, ogg, etc)
    const outputPath = path.join(tempDir, `${fileId}.mp3`);

    try {
        let headers = {};
        if (platform === 'whatsapp') {
            headers = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
        }

        // Determine extension mostly for debugging or if ffmpeg needs it, but ffmpeg usually auto-detects.
        // However, saving without extension might confuse it.
        // Telegram usually sends .oga (Opus). WhatsApp .ogg (Opus).
        // Let's force .ogg for input.
        const inputPathWithExt = inputPath + '.ogg';

        await downloadFile(url, inputPathWithExt, headers);

        // Convert to MP3 (Whisper supports OGG but MP3 is safer standard)
        console.time(`Transcode-${fileId}`);
        await convertToMp3(inputPathWithExt, outputPath);
        console.timeEnd(`Transcode-${fileId}`);

        console.time(`Whisper-${fileId}`);
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(outputPath),
            model: "whisper-1",
        });
        console.timeEnd(`Whisper-${fileId}`);

        // Cleanup
        if (fs.existsSync(inputPathWithExt)) fs.unlinkSync(inputPathWithExt);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        return transcription.text;

    } catch (error) {
        console.error('Transcription Error:', error);
        // Cleanup on error
        if (fs.existsSync(inputPath + '.ogg')) fs.unlinkSync(inputPath + '.ogg');
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return null;
    }
};*/
export async function transcribeAudio(
  _filePath: string,
  _platform: 'telegram' | 'whatsapp'
) {
  // Voice support disabled for local testing
  return "";
}


