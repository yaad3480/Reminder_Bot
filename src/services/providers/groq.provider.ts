import Groq from "groq-sdk";

export async function parseWithGroq(text: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
You are a backend JSON API.

Your task is to extract reminder information.

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include text before or after JSON
- JSON must start with { and end with }

Schema:
{
  "intent": "create_reminder",
  "confidence": number,
  "isoDate": string,
  "recurrence": null | {
    "type": "daily" | "weekly" | "interval",
    "intervalValue"?: number
  },
  "confirmationText": string
}

Message:
"${text}"
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices[0].message.content!.trim();

// Extract JSON safely
const jsonMatch = raw.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  throw new Error("Groq NLP did not return valid JSON");
}

return JSON.parse(jsonMatch[0]);

}
