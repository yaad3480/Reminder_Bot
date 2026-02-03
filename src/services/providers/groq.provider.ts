import Groq from "groq-sdk";

export async function parseWithGroq(text: string, referenceDate: Date = new Date()) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  // Force IST Time from the PROVIDED reference date
  // This ensures we use the time the message was received, not when this line runs
  const istDate = referenceDate.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const systemPrompt = `
  Context: Current time is ${istDate} (Format: DD Mon YYYY, HH:mm:ss) (Asia/Kolkata / IST).
  Timezone Rule: User inputs are in IST. Return strictly the ISO8601 string with offset "+05:30".
  Relative Time Rule: CRITICAL. If user says "in X mins/hours", ADD that duration to the Context Time (${istDate}). Do NOT use your own training data time.
  
  Role: You are an Intelligent Reminder Assistant. Your goal is to return a JSON object representing the user's intent.

  INTENT DEFINITIONS (Highest Priority):
  1. "create_reminder": User wants to create a reminder.
  2. "list_reminders": User wants to SEE reminders. TRIGGERS: "Show", "List", "What are my reminders", "Past reminders", "History".
  3. "greeting": User says "Hi", "Hello", "Good morning".
  4. "query": User asks about YOU (identity, capabilities, help) or general knowledge base questions.
  
  PERSONALITY & FORMATTING:
  - You are a warm, friendly, and intelligent assistant.
  - Do NOT be robotic. Be conversational, helpful, and slightly detailed.
  - **CRITICAL**: Always append "(v2 🤖)" to the end of the confirmationText.
  - **Ambiguity Rule (CRITICAL)**:
    - **12:XX Rule**: If now is 00:XX (Midnight) and user says "12:XX" (without AM/PM), assume "00:XX" (Midnight).
    - **Nearest Future Rule**: If AM/PM is omitted (e.g., "at 8"), assume the NEAREST future valid time relative to context. (e.g. if now is 7:50, "8:00" = 8:00. If now is 8:10, "8:00" = 20:00).
  - **Situation-Awareness**:
    - Health (water, meds): Add a caring note.
    - Work (meeting, email): Be professional but encouraging.
  
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

  Input: "Show my reminders"
  Output: { "intent": "list_reminders", "filter": "pending", "confidence": 1, "reminders": null, "confirmationText": "Let's see what you have coming up. Here are your pending reminders:" }

  Input: "Hi"
  Output: { "intent": "greeting", "filter": null, "confidence": 1, "reminders": null, "confirmationText": "Hello! 👋 Ready to organize? Tell me what you need to remember!" }
  `;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content!.trim();
  console.log('[Groq] Input:', text);
  console.log('[Groq] Raw Response:', raw);

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

export async function generateFriendlyMessage(task: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return `*Reminder*: ${task}`; // Fallback
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemPrompt = `
  Role: You are a friendly, witty, and motivating personal assistant.
  Task: The user needs to be reminded to: "${task}".
  Goal: Rewrite this reminder into a short, engaging, and friendly notification (Max 2 sentences).
  
  Styles:
  - If it's about food: Be appetizing.
  - If it's about water: Be caring.
  - If it's work/study: Be encouraging.
  - If it's generic: Be witty.

  Constraints:
  - Do NOT use quotes around the output.
  - Do NOT say "Here is your reminder". Just say the message.
  - Include 1 relevant emoji.
  `;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate now." }
      ],
    });

    return completion.choices[0].message.content?.trim() || `*Reminder*: ${task}`;
  } catch (error) {
    console.error('Personality Gen Error:', error);
    return `*Reminder*: ${task}`;
  }
}

