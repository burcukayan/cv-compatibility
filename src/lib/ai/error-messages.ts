export const AI_BUSY_MESSAGE =
  "The AI service is busy right now. Please wait a minute and try again.";

export const AI_UNAVAILABLE_MESSAGE =
  "The AI service is temporarily unavailable. Please try again later.";

export const AI_TIMEOUT_MESSAGE = "The request timed out.";

const KNOWN_AI_SERVICE_MESSAGES = new Set<string>([
  AI_BUSY_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  AI_TIMEOUT_MESSAGE,
]);

export function isKnownAiServiceMessage(message: string): boolean {
  return KNOWN_AI_SERVICE_MESSAGES.has(message);
}
