-- Secure, tenant-isolated Cush Verify webhook destinations and delivery outbox.
-- Payloads contain metadata only; API keys and report bodies are never persisted here.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_destinations (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  created_by_institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  url TEXT NOT NULL CHECK (url ~ '^https://' AND char_length(url) <= 2048),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  event_types TEXT[] NOT NULL CHECK (
    cardinality(event_types) BETWEEN 1 AND 8 AND
    event_types <@ ARRAY[
      'report.requested', 'request.linked', 'consent.approved', 'consent.declined',
      'consent.revoked', 'report.delivered', 'report.accessed', 'usage.threshold_reached'
    ]::text[]
  ),
  usage_threshold_percentages INTEGER[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(usage_threshold_percentages) <= 10 AND
      usage_threshold_percentages <@ ARRAY[5,10,20,25,50,75,80,90,95,100]::integer[]),
  secret_ciphertext TEXT NOT NULL,
  secret_iv TEXT NOT NULL,
  secret_tag TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT cush_verify_webhook_destinations_status_timestamp_check CHECK (
    (status IN ('active', 'disabled') AND deleted_at IS NULL)
    OR (status = 'deleted' AND deleted_at IS NOT NULL)
  ),
  CONSTRAINT cush_verify_webhook_destinations_encrypted_secret_state_check CHECK (
    (status = 'deleted' AND secret_ciphertext = '' AND secret_iv = '' AND secret_tag = '')
    OR (status IN ('active', 'disabled') AND secret_ciphertext <> '' AND secret_iv <> '' AND secret_tag <> '')
  ),
  CONSTRAINT cush_verify_webhook_destinations_id_institution_uq UNIQUE (id, institution_id)
);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_destinations_tenant_status_idx
  ON public.cush_verify_webhook_destinations (institution_id, environment, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_events (
  id UUID PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'report.requested', 'request.linked', 'consent.approved', 'consent.declined',
    'consent.revoked', 'report.delivered', 'report.accessed', 'usage.threshold_reached'
  )),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 180),
  payload JSONB NOT NULL CHECK (
    jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 8192
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_webhook_events_tenant_idempotency_uq
    UNIQUE (institution_id, environment, idempotency_key),
  CONSTRAINT cush_verify_webhook_events_id_institution_uq UNIQUE (id, institution_id)
);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_events_tenant_created_idx
  ON public.cush_verify_webhook_events (institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_deliveries (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  destination_id INTEGER NOT NULL,
  institution_id INTEGER NOT NULL REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 8),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  last_status_code INTEGER CHECK (last_status_code IS NULL OR last_status_code BETWEEN 100 AND 599),
  last_error_code TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_webhook_deliveries_delivered_at_check CHECK (
    (status = 'delivered' AND delivered_at IS NOT NULL)
    OR (status <> 'delivered' AND delivered_at IS NULL)
  ),
  CONSTRAINT cush_verify_webhook_deliveries_event_tenant_fk
    FOREIGN KEY (event_id, institution_id)
    REFERENCES public.cush_verify_webhook_events(id, institution_id) ON DELETE RESTRICT,
  CONSTRAINT cush_verify_webhook_deliveries_destination_tenant_fk
    FOREIGN KEY (destination_id, institution_id)
    REFERENCES public.cush_verify_webhook_destinations(id, institution_id) ON DELETE RESTRICT,
  CONSTRAINT cush_verify_webhook_deliveries_event_destination_uq UNIQUE (event_id, destination_id)
);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_deliveries_queue_idx
  ON public.cush_verify_webhook_deliveries (status, next_attempt_at, locked_until);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_deliveries_tenant_created_idx
  ON public.cush_verify_webhook_deliveries (institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_delivery_attempts (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL
    REFERENCES public.cush_verify_webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 8),
  outcome TEXT NOT NULL DEFAULT 'processing'
    CHECK (outcome IN ('processing', 'delivered', 'retrying', 'failed')),
  response_status INTEGER CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
  error_code TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT cush_verify_webhook_delivery_attempts_delivery_number_uq
    UNIQUE (delivery_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_audit_events (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  destination_id INTEGER REFERENCES public.cush_verify_webhook_destinations(id) ON DELETE SET NULL,
  actor_institutional_user_id INTEGER
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'updated', 'disabled', 'deleted', 'secret_rotated')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_audit_events_tenant_created_idx
  ON public.cush_verify_webhook_audit_events (institution_id, created_at DESC);

ALTER TABLE public.cush_verify_webhook_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_webhook_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_webhook_destinations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_webhook_deliveries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_webhook_delivery_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_webhook_audit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_webhook_destinations_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_webhook_deliveries_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_webhook_delivery_attempts_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_webhook_audit_events_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
