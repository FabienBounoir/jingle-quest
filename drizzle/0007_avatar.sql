ALTER TABLE "users" ADD COLUMN "avatar" "bytea";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_hidden" boolean DEFAULT false NOT NULL;