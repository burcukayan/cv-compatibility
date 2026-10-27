import "server-only";
import { z } from "zod";

const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, "GOOGLE_GENERATIVE_AI_API_KEY missing"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
});

export const env = envSchema.parse(process.env);