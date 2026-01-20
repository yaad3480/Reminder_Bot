export function parseMock(text: string) {
  return {
    intent: "create_reminder",
    confidence: 1.0,
    isoDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    recurrence: undefined,
    confirmationText: "Reminder set for 5 minutes from now",
    extracted: {
      message: text
    }
  };
}
