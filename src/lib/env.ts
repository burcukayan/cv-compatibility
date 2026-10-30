import "server-only";
import { z } from "zod";

const AUTH0_SECRET_PATTERN = /^[0-9a-fA-F]{64}$/;

const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, "GOOGLE_GENERATIVE_AI_API_KEY missing"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  AUTH0_DOMAIN: z
    .string()
    .min(1, "AUTH0_DOMAIN missing")
    .refine((value) => !value.includes("://"), "AUTH0_DOMAIN must not include a scheme"),
  AUTH0_CLIENT_ID: z.string().min(1, "AUTH0_CLIENT_ID missing"),
  AUTH0_CLIENT_SECRET: z.string().min(1, "AUTH0_CLIENT_SECRET missing"),
  APP_BASE_URL: z.url("APP_BASE_URL must be a valid URL"),
  AUTH0_SECRET: z
    .string()
    .regex(AUTH0_SECRET_PATTERN, "AUTH0_SECRET must be exactly 64 hex characters"),
});

export const env = envSchema.parse(process.env);