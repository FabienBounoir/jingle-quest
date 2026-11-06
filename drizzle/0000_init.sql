CREATE TABLE "answer_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "answer_lists_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"user_id" uuid NOT NULL,
	"question_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"points" integer NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answers_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "days" (
	"date" date PRIMARY KEY NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"question_id" integer,
	"notified_at" timestamp with time zone,
	CONSTRAINT "days_question_id_unique" UNIQUE("question_id")
);
--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "list_items_list_id_label_unique" UNIQUE("list_id","label")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "question_answers" (
	"question_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	CONSTRAINT "question_answers_question_id_item_id_pk" PRIMARY KEY("question_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"list_id" integer NOT NULL,
	"image" "bytea",
	"image_mime" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"event_name" text DEFAULT 'Le Calendrier de l''Avent' NOT NULL,
	"bg_color" text DEFAULT '#C62F3B' NOT NULL,
	"logo" "bytea",
	"logo_mime" text,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"start_date" date DEFAULT make_date(extract(year from now())::int, 12, 1) NOT NULL,
	"end_date" date DEFAULT make_date(extract(year from now())::int, 12, 24) NOT NULL,
	"workdays_only" boolean DEFAULT true NOT NULL,
	"default_open_time" time DEFAULT '09:00' NOT NULL,
	"points_correct" integer DEFAULT 100 NOT NULL,
	"points_catchup" integer DEFAULT 50 NOT NULL,
	"bonus_max" integer DEFAULT 50 NOT NULL,
	"bonus_minutes" integer DEFAULT 60 NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_dates" CHECK ("settings"."start_date" <= "settings"."end_date")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_item_id_list_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."list_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "days" ADD CONSTRAINT "days_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_answer_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."answer_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_item_id_list_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."list_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_list_id_answer_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."answer_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_question_id_index" ON "answers" USING btree ("question_id");
--> statement-breakpoint
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
