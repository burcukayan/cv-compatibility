import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import type { MatchAnalysis } from "../lib/schemas";

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    jobTitle: varchar("job_title", { length: 200 }).notNull(),
    companyName: varchar("company_name", { length: 200 }),
    jobDescription: text("job_description").notNull(),
    matchScore: integer("match_score").notNull(),
    result: jsonb("result").$type<MatchAnalysis>().notNull(),
    coverLetter: text("cover_letter"),
    coverLetterTone: varchar("cover_letter_tone", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("analyses_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
