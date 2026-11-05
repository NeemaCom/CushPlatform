-- Progressive sign-in lockout state.
-- This table is server-only because it contains normalized email addresses
-- and must never be directly accessible through Supabase's client API.
CREATE TABLE IF NOT EXISTS public.cush_login_attempts (
  email text PRIMARY KEY
    CHECK (email = lower(btrim(email))),
  failed_attempts integer NOT NULL DEFAULT 0
    CHECK (failed_attempts BETWEEN 0 AND 5),
  locked_until timestamptz,
  permanently_locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cush_login_attempts_locked_until_idx
  ON public.cush_login_attempts (locked_until);

ALTER TABLE public.cush_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.cush_login_attempts FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.cush_login_attempts FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.cush_login_attempts FROM authenticated;
