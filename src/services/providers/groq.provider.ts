import Groq from "groq-sdk";

export async function parseWithGroq(text: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  // Force IST Time
  const istDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const prompt = `
  Context: Current time is ${istDate} (Asia/Kolkata / IST).
  Timezone Rule: User inputs are in IST. Return strictly the ISO8601 string with offset "+05:30".
  Relative Time Rule: If user says "in X mins/hours", ADD that duration to the Current Time context calculated above.
  
  Role: You are an Intelligent Reminder Assistant. Your goal is to return a JSON object representing the user's intent.

  INTENT DEFINITIONS (Highest Priority):
  1. "create_reminder": User wants to create a reminder.
  2. "list_reminders": User wants to SEE reminders. TRIGGERS: "Show", "List", "What are my reminders", "Past reminders", "History".
  3. "greeting": User says "Hi", "Hello", "Good morning".
  4. "query": User asks about YOU (identity, capabilities, help) or general knowledge base questions.
  
  KNOWLEDGE BASE (For "query" intent):
  - Identity: "I'm your intelligent Reminder Assistant!"
  - Help: "Say 'Remind me to...' or 'Show reminders'."
  - Privacy: "Data is safe."
  - Cost: "Free tier available."
  
  PERSONALITY & FORMATTING:
  - You are a warm, friendly, and intelligent assistant.
  - Do NOT be robotic. Be conversational, helpful, and slightly detailed.
  - **Situation-Awareness**:
    - Health (water, meds): Add a caring note (e.g., "Stay healthy! 💧").
    - Work (meeting, email): Be professional but encouraging (e.g., "You got this! 💼").
    - Personal (call mom, birthday): Be enthusiastic (e.g., "Aww, don't forget! ❤️").
  - **Format**:
    - Instead of just "Set for 5pm", say "I've set that reminder for 5 pm today. I'll make sure you don't forget!"
  
  STRICT JSON OUTPUT RULES:
  - Return ONLY valid JSON.
  
  Schema:
  {
    "intent": "create_reminder" | "list_reminders" | "greeting" | "query",
    "filter": "pending" | "history" | "all" | "today" | null,
    "confidence": number,
    "reminders": [
      {
        "message": string,
        "isoDate": string,
        "recurrence": null | { "type": "daily" | "weekly" | "monthly" | "interval", "intervalValue"?: number }
      }
    ] | null,
    "confirmationText": string
  }
  
  Examples:
  Input: "Remind me to drink water in 10 mins"
  Output: { "intent": "create_reminder", "filter": null, "confidence": 1, "reminders": [{"message": "drink water", "isoDate": "(Current Time + 10 mins in ISO format)", "recurrence": null}], "confirmationText": "Okay! 💧 I'll remind you to drink water in 10 minutes. Stay hydrated!" }

  Input: "Remind me to call Mom at 5pm"
  Output: { "intent": "create_reminder", "filter": null, "confidence": 1, "reminders": [{"message": "call Mom", "isoDate": "2026-01-30T17:00:00+05:30", "recurrence": null}], "confirmationText": "Aww, calling Mom is important! ❤️ I've set a reminder for 5 pm. Enjoy your chat!" }
  
  Input: "Show my reminders"
  Output: { "intent": "list_reminders", "filter": "pending", "confidence": 1, "reminders": null, "confirmationText": "Let's see what you have coming up. Here are your pending reminders:" }

  Input: "What are my reminders for today?"
  Output: { "intent": "list_reminders", "filter": "today", "confidence": 1, "reminders": null, "confirmationText": "Here is your agenda for today:" }
  
  Input: "Reminders I kept today"
  Output: { "intent": "list_reminders", "filter": "today", "confidence": 1, "reminders": null, "confirmationText": "Here are your reminders for today:" }

  Input: "Show me my past reminders"
  Output: { "intent": "list_reminders", "filter": "history", "confidence": 1, "reminders": null, "confirmationText": "Here are your past reminders:" }

  Input: "Where is my list?"
  Output: { "intent": "list_reminders", "filter": "all", "confidence": 1, "reminders": null, "confirmationText": "Here is your full list:" }

  Input: "Hi"
  Output: { "intent": "greeting", "filter": null, "confidence": 1, "reminders": null, "confirmationText": "Hello! 👋 Ready to organize? Tell me what you need to remember!" }
  
  Input: "Who are you?"
  Output: { "intent": "query", "filter": null, "confidence": 1, "reminders": null, "confirmationText": "I'm your intelligent Reminder Assistant! 🕰️ I can help you remember tasks, meetings, and important moments." }
  
  Input: "Tell me a joke"
  Output: { "intent": "query", "filter": null, "confidence": 0, "reminders": null, "confirmationText": "I'm strictly business today! Remind you of anything?" }

  Input: "${text}"
  `;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content!.trim();

  // Remove markdown code blocks if present
  let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Extract JSON safely - find the first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
    console.error('Groq response:', raw);
    throw new Error("Groq NLP did not return valid JSON");
  }

  const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('Failed to parse JSON:', jsonStr);
    console.error('Original response:', raw);
    throw new Error("Groq returned malformed JSON");
  }


}
