-- One-time email activation for self-service Cush Verify institutional signup.
-- Apply this migration to the Cush Verify database before deploying this flow.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_email_activations (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL
    REFERENCES public.cush_verify_applications(id) ON DELETE CASCADE,
  firebase_uid TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_email_activations_expiry_check
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS cush_verify_email_activations_application_created_idx
  ON public.cush_verify_email_activations (application_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_email_activations_pending_application_uq
  ON public.cush_verify_email_activations (application_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.cush_verify_application_events
  DROP CONSTRAINT IF EXISTS cush_verify_application_events_event_type_check,
  DROP CONSTRAINT IF EXISTS cush_verify_application_events_type_check;
ALTER TABLE public.cush_verify_application_events
  ADD CONSTRAINT cush_verify_application_events_event_type_check
  CHECK (event_type IN (
    'submitted', 'status_changed', 'organisation_onboarded',
    'invitation_created', 'invitation_sent', 'invitation_delivery_failed',
    'invitation_accepted', 'activation_email_sent', 'activation_email_resent',
    'activation_email_delivery_failed', 'account_activated', 'approved', 'rejected'
  ));

ALTER TABLE public.cush_verify_email_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_email_activations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_email_activations_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
