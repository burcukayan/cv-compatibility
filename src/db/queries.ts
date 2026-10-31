import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import type { CoverLetterRequest, MatchAnalysis } from "@/lib/schemas";

import { db } from "./index";
import { analyses } from "./schema";

type CreateAnalysisData = {
  jobTitle: string;
  companyName: string | null;
  jobDescription: string;
  matchScore: number;
  result: MatchAnalysis;
};

export async function createAnalysis(userId: string, data: CreateAnalysisData): Promise<string> {
  const [row] = await db
    .insert(analyses)
    .values({
      userId,
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      jobDescription: data.jobDescription,
      matchScore: data.matchScore,
      result: data.result,
    })
    .returning({ id: analyses.id });

  if (!row) {
    const error = new Error("Analysis insert did not return an id.");
    error.name = "InsertFailed";
    throw error;
  }

  return row.id;
}

export async function listAnalyses(
  userId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  return db
    .select({
      id: analyses.id,
      jobTitle: analyses.jobTitle,
      companyName: analyses.companyName,
      matchScore: analyses.matchScore,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAnalyses(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(analyses)
    .where(eq(analyses.userId, userId));

  return Number(row?.value ?? 0);
}

export async function getAnalysis(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.userId, userId), eq(analyses.id, id)))
    .limit(1);

  return row;
}

export async function saveCoverLetter(
  userId: string,
  id: string,
  text: string,
  tone: CoverLetterRequest["tone"],
): Promise<void> {
  await db
    .update(analyses)
    .set({
      coverLetter: text,
      coverLetterTone: tone,
    })
    .where(and(eq(analyses.userId, userId), eq(analyses.id, id)));
}

export async function deleteAnalysis(userId: string, id: string): Promise<void> {
  await db.delete(analyses).where(and(eq(analyses.userId, userId), eq(analyses.id, id)));
}

export async function deleteAllAnalyses(userId: string): Promise<void> {
  await db.delete(analyses).where(eq(analyses.userId, userId));
}

export async function exportAnalyses(userId: string) {
  return db
    .select({
      id: analyses.id,
      jobTitle: analyses.jobTitle,
      companyName: analyses.companyName,
      jobDescription: analyses.jobDescription,
      matchScore: analyses.matchScore,
      result: analyses.result,
      coverLetter: analyses.coverLetter,
      coverLetterTone: analyses.coverLetterTone,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));
}
