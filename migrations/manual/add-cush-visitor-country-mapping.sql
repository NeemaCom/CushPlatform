-- Adds an approximate ISO-3166-1 alpha-2 country code to opted-in analytics
-- sessions. Source IP addresses are processed transiently by the application
-- and are never stored in this table.

ALTER TABLE public.cush_visitor_sessions
  ADD COLUMN IF NOT EXISTS country_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cush_visitor_sessions_country_code_check'
      AND conrelid = 'public.cush_visitor_sessions'::regclass
  ) THEN
    ALTER TABLE public.cush_visitor_sessions
      ADD CONSTRAINT cush_visitor_sessions_country_code_check
      CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cush_visitor_sessions_country_last_seen_idx
  ON public.cush_visitor_sessions (country_code, last_seen_at DESC)
  WHERE country_code IS NOT NULL;

ALTER TABLE public.cush_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.cush_visitor_sessions FROM PUBLIC, anon, authenticated;
