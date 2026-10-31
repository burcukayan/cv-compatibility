CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"job_title" varchar(200) NOT NULL,
	"company_name" varchar(200),
	"job_description" text NOT NULL,
	"match_score" integer NOT NULL,
	"result" jsonb NOT NULL,
	"cover_letter" text,
	"cover_letter_tone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analyses_user_id_created_at_idx" ON "analyses" USING btree ("user_id","created_at");