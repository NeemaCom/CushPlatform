-- Dedicated server-side sessions for institutional users on the Verify database.
-- This table is separate from the Passport cush_sessions table.
CREATE TABLE IF NOT EXISTS public.cush_verify_sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT cush_verify_sessions_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS cush_verify_sessions_expire_idx
  ON public.cush_verify_sessions (expire);

ALTER TABLE public.cush_verify_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_sessions FROM PUBLIC, anon, authenticated;
