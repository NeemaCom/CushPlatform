-- Cush Verify institutional API keys and privacy-minimal request metering.
-- Raw API keys are never stored; report bodies and submitted identifiers are never logged.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_api_keys (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  created_by_institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  key_prefix TEXT NOT NULL UNIQUE
    CHECK (key_prefix ~ '^cvk_(sandbox|production)_[a-f0-9]{24}$'),
  secret_hash TEXT NOT NULL UNIQUE
    CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(scopes) = 'array'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_api_keys_status_timestamp_check CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_api_keys_institution_environment_status_idx
  ON public.cush_verify_api_keys (institution_id, environment, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_api_usage (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  institution_id INTEGER
    REFERENCES public.cush_verify_institutions(id) ON DELETE SET NULL,
  api_key_id INTEGER
    REFERENCES public.cush_verify_api_keys(id) ON DELETE SET NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  endpoint TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 1 AND 180),
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  state TEXT NOT NULL DEFAULT 'processing'
    CHECK (state IN ('processing', 'completed')),
  response_status INTEGER CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  billable_report BOOLEAN NOT NULL DEFAULT FALSE,
  client_ip_hash TEXT CHECK (client_ip_hash IS NULL OR client_ip_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT cush_verify_api_usage_state_timestamp_check CHECK (
    (state = 'processing' AND completed_at IS NULL)
    OR (state = 'completed' AND completed_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_institution_created_idx
  ON public.cush_verify_api_usage (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_institution_environment_created_idx
  ON public.cush_verify_api_usage (institution_id, environment, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_key_created_idx
  ON public.cush_verify_api_usage (api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_in_flight_idx
  ON public.cush_verify_api_usage (institution_id, created_at)
  WHERE state = 'processing';
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_monthly_reports_idx
  ON public.cush_verify_api_usage (institution_id, created_at)
  WHERE billable_report;
CREATE INDEX IF NOT EXISTS cush_verify_api_usage_client_ip_hash_created_idx
  ON public.cush_verify_api_usage (client_ip_hash, created_at)
  WHERE client_ip_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.cush_verify_api_key_events (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  api_key_id INTEGER
    REFERENCES public.cush_verify_api_keys(id) ON DELETE SET NULL,
  actor_institutional_user_id INTEGER
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'rotated', 'revoked')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_api_key_events_institution_created_idx
  ON public.cush_verify_api_key_events (institution_id, created_at DESC);

ALTER TABLE public.cush_verify_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_api_key_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_api_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_api_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_api_key_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_api_keys_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_api_usage_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_api_key_events_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
