BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_assessment_inputs (
  user_id integer PRIMARY KEY
    REFERENCES public.users(id) ON DELETE CASCADE,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cush_score_policy_versions (
  id serial PRIMARY KEY,
  version integer NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  configuration jsonb NOT NULL,
  created_by integer NOT NULL REFERENCES public.users(id),
  approved_by integer REFERENCES public.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cush_score_policy_versions_status_idx
  ON public.cush_score_policy_versions(status);

CREATE UNIQUE INDEX IF NOT EXISTS cush_score_policy_versions_one_active_idx
  ON public.cush_score_policy_versions(status)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS cush_score_policy_versions_one_draft_idx
  ON public.cush_score_policy_versions(status)
  WHERE status = 'draft';

ALTER TABLE public.cush_assessment_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_score_policy_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_assessment_inputs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_score_policy_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_score_policy_versions_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
