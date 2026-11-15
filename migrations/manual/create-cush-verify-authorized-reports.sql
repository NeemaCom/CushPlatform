-- Cush Verify purpose-bound consent requests and authorized report deliveries.
-- Report bodies are not persisted; delivery rows contain only an idempotency digest.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_report_requests (
  id UUID PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  requested_by_institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  target_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_label TEXT NOT NULL
    CHECK (char_length(recipient_label) BETWEEN 3 AND 254),
  purpose TEXT NOT NULL
    CHECK (char_length(btrim(purpose)) BETWEEN 10 AND 500),
  requested_categories TEXT[] NOT NULL
    CHECK (
      cardinality(requested_categories) BETWEEN 1 AND 3
      AND requested_categories <@ ARRAY['score_summary', 'assessment_status', 'evidence_summary']::text[]
    ),
  requested_authorization_days INTEGER NOT NULL
    CHECK (requested_authorization_days BETWEEN 1 AND 90),
  status TEXT NOT NULL DEFAULT 'awaiting_consent'
    CHECK (status IN ('awaiting_consent', 'authorized', 'declined', 'revoked', 'expired')),
  request_expires_at TIMESTAMPTZ NOT NULL,
  authorization_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_report_requests_expiry_check CHECK (request_expires_at > created_at),
  CONSTRAINT cush_verify_report_requests_authorization_expiry_check CHECK (
    (status = 'authorized' AND authorization_expires_at IS NOT NULL)
    OR (status <> 'authorized' AND authorization_expires_at IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_report_requests_institution_status_created_idx
  ON public.cush_verify_report_requests (institution_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_report_requests_target_status_created_idx
  ON public.cush_verify_report_requests (target_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_report_requests_requested_by_created_idx
  ON public.cush_verify_report_requests (requested_by_institutional_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_report_consents (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE
    REFERENCES public.cush_verify_report_requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('approved', 'declined', 'revoked')),
  approved_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    CHECK (
      cardinality(approved_categories) BETWEEN 0 AND 3
      AND approved_categories <@ ARRAY['score_summary', 'assessment_status', 'evidence_summary']::text[]
    ),
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_report_consents_timestamps_check CHECK (
    (status = 'approved' AND approved_at IS NOT NULL AND declined_at IS NULL
      AND revoked_at IS NULL AND expires_at IS NOT NULL AND cardinality(approved_categories) > 0)
    OR (status = 'declined' AND approved_at IS NULL AND declined_at IS NOT NULL
      AND revoked_at IS NULL AND expires_at IS NULL AND cardinality(approved_categories) = 0)
    OR (status = 'revoked' AND approved_at IS NOT NULL AND declined_at IS NULL
      AND revoked_at IS NOT NULL AND expires_at IS NOT NULL AND cardinality(approved_categories) > 0)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_report_consents_user_status_idx
  ON public.cush_verify_report_consents (user_id, status);
CREATE INDEX IF NOT EXISTS cush_verify_report_consents_expires_at_idx
  ON public.cush_verify_report_consents (expires_at);

CREATE TABLE IF NOT EXISTS public.cush_verify_report_events (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL
    REFERENCES public.cush_verify_report_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'request_created', 'consent_approved', 'consent_declined',
      'consent_revoked', 'report_delivered', 'report_accessed'
    )),
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('institutional_user', 'passport_user', 'system')),
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  actor_institutional_user_id INTEGER
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_report_events_actor_check CHECK (
    (actor_type = 'passport_user' AND actor_institutional_user_id IS NULL)
    OR (actor_type = 'institutional_user' AND actor_user_id IS NULL)
    OR (actor_type = 'system' AND actor_user_id IS NULL AND actor_institutional_user_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_report_events_request_created_idx
  ON public.cush_verify_report_events (request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_report_deliveries (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL
    REFERENCES public.cush_verify_report_requests(id) ON DELETE CASCADE,
  report_digest TEXT NOT NULL
    CHECK (report_digest ~ '^[a-f0-9]{64}$'),
  categories TEXT[] NOT NULL
    CHECK (
      cardinality(categories) BETWEEN 1 AND 3
      AND categories <@ ARRAY['score_summary', 'assessment_status', 'evidence_summary']::text[]
    ),
  delivered_by_institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_report_deliveries_request_digest_uq UNIQUE (request_id, report_digest)
);
CREATE INDEX IF NOT EXISTS cush_verify_report_deliveries_actor_date_idx
  ON public.cush_verify_report_deliveries (delivered_by_institutional_user_id, delivered_at DESC);

ALTER TABLE public.cush_verify_report_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_report_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_report_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_report_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_report_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_report_consents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_report_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_report_deliveries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_report_consents_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_report_events_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_report_deliveries_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
