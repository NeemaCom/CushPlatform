BEGIN;

-- Stores only an administrator's freshness-date decision. It deliberately
-- contains no statements, credit report payload, BVN, or other provider data.
CREATE TABLE IF NOT EXISTS public.cush_evidence_freshness_reviews (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  mono_evidence_id integer
    REFERENCES public.mono_v2_assessment_evidence(id) ON DELETE CASCADE,
  credit_evidence_id integer
    REFERENCES public.interswitch_credit_history_evidence(id) ON DELETE CASCADE,
  decision text NOT NULL
    CHECK (decision IN ('confirm_source_date', 'confirm_retrieval_date')),
  confirmed_source_date date,
  evidence_fetched_at timestamptz NOT NULL,
  reviewed_by integer NOT NULL
    REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cush_evidence_freshness_reviews_one_target_check
    CHECK ((mono_evidence_id IS NULL) <> (credit_evidence_id IS NULL)),
  CONSTRAINT cush_evidence_freshness_reviews_date_decision_check
    CHECK (
      (decision = 'confirm_source_date' AND confirmed_source_date IS NOT NULL)
      OR (decision = 'confirm_retrieval_date' AND confirmed_source_date IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS cush_evidence_freshness_reviews_mono_evidence_key
  ON public.cush_evidence_freshness_reviews(mono_evidence_id)
  WHERE mono_evidence_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cush_evidence_freshness_reviews_credit_evidence_key
  ON public.cush_evidence_freshness_reviews(credit_evidence_id)
  WHERE credit_evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cush_evidence_freshness_reviews_user_reviewed_at_idx
  ON public.cush_evidence_freshness_reviews(user_id, reviewed_at);

ALTER TABLE public.cush_evidence_freshness_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_evidence_freshness_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_evidence_freshness_reviews_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
