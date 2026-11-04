CREATE TABLE IF NOT EXISTS public.cush_verify_institution_interests (
  id SERIAL PRIMARY KEY,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL
    CHECK (institution_type IN ('bank', 'lender', 'housing', 'employer', 'other')),
  contact_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  intended_use TEXT,
  contact_consent_accepted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'in_review', 'approved_for_follow_up', 'not_approved')),
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cush_verify_institution_interests_status_created_idx
  ON public.cush_verify_institution_interests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS cush_verify_institution_interests_email_idx
  ON public.cush_verify_institution_interests (email);

ALTER TABLE public.cush_verify_institution_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_institution_interests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_institution_interests_id_seq FROM PUBLIC, anon, authenticated;
