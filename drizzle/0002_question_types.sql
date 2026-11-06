ALTER TABLE "answers" ALTER COLUMN "item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "list_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "value" jsonb;--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "score" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "type" text DEFAULT 'list' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "solution" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_type" CHECK ("questions"."type" in ('list', 'choice', 'number', 'order', 'zone'));
--> statement-breakpoint
UPDATE "answers" SET "score" = CASE WHEN "is_correct" THEN 1 ELSE 0 END;
