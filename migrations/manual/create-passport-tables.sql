CREATE TABLE "public"."evidence_vault" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "passport_id" integer NOT NULL,
  "document_type" text NOT NULL,
  "label" text NOT NULL,
  "status" text DEFAULT 'SELF_REPORTED' NOT NULL,
  "tier" integer DEFAULT 1 NOT NULL,
  "score_boost" integer DEFAULT 0 NOT NULL,
  "file_data" text,
  "file_name" text,
  "admin_notes" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
ALTER TABLE "public"."evidence_vault" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."financial_signals" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "passport_id" integer NOT NULL,
  "signal_type" text NOT NULL,
  "label" text NOT NULL,
  "raw_amount_cents" bigint NOT NULL,
  "currency_code" text NOT NULL,
  "normalized_value" numeric(10, 4),
  "country" text NOT NULL,
  "verification_status" text DEFAULT 'SELF_REPORTED' NOT NULL,
  "period" text DEFAULT 'monthly',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
ALTER TABLE "public"."financial_signals" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."passports" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "confidence_score" integer DEFAULT 0 NOT NULL,
  "mode" text DEFAULT 'pre_arrival' NOT NULL,
  "share_token" text,
  "score_breakdown" json,
  "reason_codes" text[],
  "generated_at" timestamp,
  "last_updated" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "passports_share_token_unique" UNIQUE("share_token")
);
ALTER TABLE "public"."passports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."evidence_vault" ADD CONSTRAINT "evidence_vault_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public"."evidence_vault" ADD CONSTRAINT "evidence_vault_passport_id_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."passports"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public"."financial_signals" ADD CONSTRAINT "financial_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public"."financial_signals" ADD CONSTRAINT "financial_signals_passport_id_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."passports"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "public"."passports" ADD CONSTRAINT "passports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
