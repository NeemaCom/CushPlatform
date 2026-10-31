BEGIN;

-- Stores only user-reviewed monthly aggregates, current GBP-normalized balance,
-- FX-rate provenance, and the user's consent timestamp. Raw statements,
-- transaction descriptions, transaction IDs, BVNs, and OTPs are not stored.
CREATE TABLE IF NOT EXISTS public.mono_v2_assessment_evidence (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  mono_linked_account_id integer NOT NULL UNIQUE
    REFERENCES public.mono_linked_accounts(id) ON DELETE CASCADE,
  evidence_data jsonb NOT NULL,
  statement_period_months integer NOT NULL
    CHECK (statement_period_months BETWEEN 1 AND 12),
  consent_version text NOT NULL,
  consent_accepted_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mono_v2_assessment_evidence_user_id_idx
  ON public.mono_v2_assessment_evidence(user_id);

ALTER TABLE public.mono_v2_assessment_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mono_v2_assessment_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mono_v2_assessment_evidence_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
