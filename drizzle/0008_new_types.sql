ALTER TABLE "questions" DROP CONSTRAINT "questions_type";--> statement-breakpoint
ALTER TABLE "reveals" ADD COLUMN "guesses" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_type" CHECK ("questions"."type" in ('list', 'choice', 'number', 'order', 'zone', 'match', 'blur', 'zoom', 'pin', 'word'));