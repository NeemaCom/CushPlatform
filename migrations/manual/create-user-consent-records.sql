-- Append-only consent acceptance records. Existing users are not backfilled.
CREATE TABLE IF NOT EXISTS "public"."user_consent_records" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "policy_type" text NOT NULL,
  "policy_version" text NOT NULL,
  "accepted_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_consent_records_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "user_consent_records_policy_type_check"
    CHECK ("policy_type" IN ('terms', 'privacy')),
  CONSTRAINT "user_consent_records_user_policy_version_unique"
    UNIQUE ("user_id", "policy_type", "policy_version")
);

CREATE INDEX IF NOT EXISTS "user_consent_records_user_accepted_at_idx"
  ON "public"."user_consent_records" ("user_id", "accepted_at");

-- Consent records are server-only, not Supabase Data API resources.
ALTER TABLE "public"."user_consent_records" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."user_consent_records" FROM PUBLIC;
REVOKE ALL ON TABLE "public"."user_consent_records" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "public"."user_consent_records_id_seq" FROM PUBLIC;
REVOKE ALL ON SEQUENCE "public"."user_consent_records_id_seq" FROM anon, authenticated;
