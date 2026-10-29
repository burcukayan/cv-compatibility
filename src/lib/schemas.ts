import { z } from "zod";

export const TEXT_MIN_LENGTH = 100;
export const TEXT_MAX_LENGTH = 10000;

export const analyzeRequestSchema = z.object({
  resumeText: z
    .string({ error: "Resume text must be a string." })
    .trim()
    .min(TEXT_MIN_LENGTH, `Resume must be at least ${TEXT_MIN_LENGTH} characters.`)
    .max(TEXT_MAX_LENGTH, `Resume must be at most ${TEXT_MAX_LENGTH} characters.`),
  jobDescription: z
    .string({ error: "Job description must be a string." })
    .trim()
    .min(
      TEXT_MIN_LENGTH,
      `Job description must be at least ${TEXT_MIN_LENGTH} characters.`,
    )
    .max(
      TEXT_MAX_LENGTH,
      `Job description must be at most ${TEXT_MAX_LENGTH} characters.`,
    ),
});

const suggestionSchema = z.object({
  section: z
    .string()
    .describe("Resume section to change, such as Summary, Experience, or Skills."),
  suggestion: z
    .string()
    .describe("A concrete edit the candidate can make in that section."),
});

export const matchAnalysisSchema = z.object({
  matchScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "Integer fit score from 0 to 100. Be honest and do not inflate the score.",
    ),
  summary: z
    .string()
    .describe("Overall assessment of the resume against the job, in 2 to 3 sentences."),
  matchedSkills: z
    .array(z.string())
    .describe("Skills found in both the resume and the job description."),
  missingSkills: z
    .array(z.string())
    .describe("Skills required by the job that are not shown in the resume."),
  suggestions: z
    .array(suggestionSchema)
    .describe("Concrete resume improvements, each tied to a section."),
});

export const extractedPdfSchema = z
  .object({
    text: z.string().min(100),
    pageCount: z.number().int().min(1).max(5),
    charCount: z.number().int(),
  })
  .refine((value) => value.charCount === value.text.length);

export const coverLetterRequestSchema = analyzeRequestSchema.extend({
  tone: z.enum(["professional", "enthusiastic", "concise"]),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>;
export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>;
export type ExtractedPdf = z.infer<typeof extractedPdfSchema>;
