BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_post_arrival_profiles (
  user_id integer PRIMARY KEY
    REFERENCES public.users(id) ON DELETE CASCADE,
  arrival_status text NOT NULL DEFAULT 'awaiting_arrival'
    CHECK (arrival_status IN ('awaiting_arrival', 'arrived')),
  arrival_date date,
  arrival_confirmed_at timestamptz,
  profile_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (arrival_status <> 'arrived' OR arrival_date IS NULL OR arrival_date <= CURRENT_DATE)
);

CREATE TABLE IF NOT EXISTS public.cush_post_arrival_records (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  record_type text NOT NULL
    CHECK (record_type IN (
      'employment', 'income', 'accommodation', 'banking_savings',
      'expense', 'financial_activity', 'other_change'
    )),
  label text NOT NULL,
  details jsonb NOT NULL,
  activity_date date,
  country_code text NOT NULL DEFAULT 'GB'
    CHECK (country_code ~ '^[A-Z]{2}$'),
  currency_code text NOT NULL DEFAULT 'GBP'
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  evidence_status text NOT NULL DEFAULT 'user_recorded'
    CHECK (evidence_status IN (
      'user_recorded', 'pending_review', 'document_supported',
      'independently_verified', 'disputed_or_rejected'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cush_post_arrival_records_user_date_idx
  ON public.cush_post_arrival_records(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS cush_post_arrival_records_user_type_idx
  ON public.cush_post_arrival_records(user_id, record_type);

-- This records action metadata only, not financial or profile field values.
CREATE TABLE IF NOT EXISTS public.cush_post_arrival_audit_logs (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cush_post_arrival_audit_user_created_at_idx
  ON public.cush_post_arrival_audit_logs(user_id, created_at DESC);

ALTER TABLE public.cush_post_arrival_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_post_arrival_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_post_arrival_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_post_arrival_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_post_arrival_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_post_arrival_audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_post_arrival_records_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_post_arrival_audit_logs_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
