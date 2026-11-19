-- Cush Verify production API access requests and immutable review audit events.
-- Approval is an additional gate; it never overrides organisation or plan entitlement checks.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_api_access_requests (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  requested_by_institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  intended_use TEXT NOT NULL
    CHECK (char_length(btrim(intended_use)) BETWEEN 10 AND 1200),
  estimated_monthly_requests INTEGER
    CHECK (estimated_monthly_requests IS NULL OR estimated_monthly_requests BETWEEN 0 AND 10000000),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected')),
  reviewed_by_admin_user_id INTEGER,
  decision_note TEXT
    CHECK (decision_note IS NULL OR char_length(btrim(decision_note)) BETWEEN 1 AND 1200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT cush_verify_api_access_requests_decision_actor_timestamp_check CHECK (
    (status = 'submitted' AND reviewed_by_admin_user_id IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_by_admin_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT cush_verify_api_access_requests_rejection_note_check CHECK (
    status <> 'rejected' OR decision_note IS NOT NULL
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_api_access_requests_one_submitted_per_institution_idx
  ON public.cush_verify_api_access_requests (institution_id)
  WHERE status = 'submitted';
CREATE INDEX IF NOT EXISTS cush_verify_api_access_requests_institution_created_idx
  ON public.cush_verify_api_access_requests (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_api_access_requests_status_created_idx
  ON public.cush_verify_api_access_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_api_access_request_events (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL
    REFERENCES public.cush_verify_api_access_requests(id) ON DELETE RESTRICT,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('organisation_admin', 'cush_admin')),
  actor_institutional_user_id INTEGER
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  -- Cush administrators are Passport users; retain only the opaque ID, never a cross-project FK.
  actor_cush_user_id INTEGER,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('submitted', 'approved', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_api_access_request_events_actor_identity_check CHECK (
    (actor_type = 'organisation_admin' AND actor_institutional_user_id IS NOT NULL AND actor_cush_user_id IS NULL)
    OR (actor_type = 'cush_admin' AND actor_institutional_user_id IS NULL AND actor_cush_user_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_api_access_request_events_institution_created_idx
  ON public.cush_verify_api_access_request_events (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_api_access_request_events_request_created_idx
  ON public.cush_verify_api_access_request_events (request_id, created_at DESC);

ALTER TABLE public.cush_verify_api_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_api_access_request_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_api_access_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_api_access_request_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_api_access_requests_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_api_access_request_events_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
