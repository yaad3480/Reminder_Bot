/*
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const parseReminderIntent = async (text: string, referenceDate: Date = new Date()) => {
    try {
        const prompt = `
      Current time: ${referenceDate.toISOString()} (IST approx).
      User input: "${text}"
      
      Task: Extract the reminder date, time, and recurrence from the user's input.
      
      Output JSON Format:
      {
        "isoDate": "ISO8601 string of the exact scheduled time in UTC",
        "recurrence": { "type": "daily" | "weekly" | "interval" | null, "intervalValue": number | null },
        "confirmationText": "A natural language confirmation message in the same language as input (English or Hindi Hinglish)"
      }
      
      Rules:
      1. If no date/time is found or it's just "hi", return null for isoDate.
      2. Assume IST (India Standard Time) timezone logic if time is vague (e.g. "9 am" means 9 am IST).
      3. Handle Hinglish: "Kal" = Tomorrow, "Parson" = Day after tomorrow, "Subah" = Morning, "Shaam" = Evening.
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // fallback to gpt-3.5-turbo if unavailable
            messages: [
                { role: "system", content: "You are a helpful assistant that extracts reminder details and outputs JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) return null;
        return JSON.parse(content);
    } catch (error) {
        console.error('NLP Error:', error);
        return null;
    }
};
*/
// If no API key use this part of code
/*export function parseReminderIntent(text: string) {
  return {
    intent: "create_reminder",
    confidence: 1.0,

    isoDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    recurrence: undefined, // ✅ FIXED
    confirmationText: `Reminder set for 5 minutes from now`,

    extracted: {
      message: text,
      time: "5 minutes"
    }
  };
}*/
import { parseMock } from "./providers/mock.provider";
import { parseWithGroq } from "./providers/groq.provider";

export async function parseReminderIntent(text: string, referenceDate: Date = new Date()) {
  const lowerText = text.toLowerCase();

  // 1. Static FAQ Checks - REMOVED to allow AI Personality
  // if (lowerText.match(/what.*(do|can).*you.*do/)) { ... }

  // 2. Mock Fallback
  if (process.env.ENABLE_NLP !== "true") {
    return parseMock(text);
  }

  // 3. Groq Provider
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️ GROQ_API_KEY missing, falling back to mock NLP");
    return parseMock(text);
  }

  return parseWithGroq(text, referenceDate);
}




