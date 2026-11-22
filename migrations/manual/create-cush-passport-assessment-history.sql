BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_passport_assessment_history (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  input_fingerprint text NOT NULL,
  source_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  algorithm_version text NOT NULL,
  policy_version integer,
  previous_score integer,
  score integer,
  previous_confidence integer,
  confidence integer,
  score_coverage_percent integer NOT NULL
    CHECK (score_coverage_percent BETWEEN 0 AND 100),
  assessment_status text NOT NULL
    CHECK (assessment_status IN ('not_started', 'incomplete', 'provisional', 'complete')),
  maturity_status text NOT NULL
    CHECK (maturity_status IN ('getting_started', 'provisional', 'evidence_supported', 'institution_supported')),
  source_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  changed_information text[] NOT NULL DEFAULT ARRAY[]::text[],
  change_summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cush_passport_assessment_history_score_check CHECK (
    (score IS NULL OR score BETWEEN 0 AND 1000) AND
    (previous_score IS NULL OR previous_score BETWEEN 0 AND 1000)
  ),
  CONSTRAINT cush_passport_assessment_history_confidence_check CHECK (
    (confidence IS NULL OR confidence BETWEEN 1 AND 100) AND
    (previous_confidence IS NULL OR previous_confidence BETWEEN 1 AND 100)
  ),
  CONSTRAINT cush_passport_assessment_history_user_fingerprint_key
    UNIQUE (user_id, input_fingerprint)
);

CREATE INDEX IF NOT EXISTS cush_passport_assessment_history_user_created_idx
  ON public.cush_passport_assessment_history(user_id, created_at DESC);

ALTER TABLE public.cush_passport_assessment_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_passport_assessment_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_passport_assessment_history_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
