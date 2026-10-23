-- Dedicated Express session storage. Do not reuse the existing public.session table.
CREATE TABLE "public"."cush_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "cush_sessions_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "cush_sessions_expire_idx" ON "public"."cush_sessions" ("expire");

-- Session records are private server-side data, not Supabase Data API resources.
ALTER TABLE "public"."cush_sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."cush_sessions" FROM PUBLIC;
REVOKE ALL ON TABLE "public"."cush_sessions" FROM anon, authenticated;
