-- Add broader, consent-bound report categories and private discovery auditing.
-- This migration does not copy or migrate any Passport report contents.
BEGIN;

ALTER TABLE public.cush_verify_report_requests
  ADD COLUMN IF NOT EXISTS recipient_email_hash TEXT,
  ADD COLUMN IF NOT EXISTS invitation_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

ALTER TABLE public.cush_verify_report_requests
  DROP CONSTRAINT IF EXISTS cush_verify_report_requests_requested_categories_check,
  DROP CONSTRAINT IF EXISTS cush_verify_report_requests_categories_check,
  ADD CONSTRAINT cush_verify_report_requests_categories_check CHECK (
    cardinality(requested_categories) BETWEEN 1 AND 7
    AND requested_categories <@ ARRAY[
      'income_employment', 'rent_housing', 'savings', 'financial_commitments',
      'score_summary', 'assessment_status', 'evidence_summary'
    ]::text[]
  ),
  ADD CONSTRAINT cush_verify_report_requests_recipient_email_hash_check CHECK (
    recipient_email_hash IS NULL OR recipient_email_hash ~ '^[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT cush_verify_report_requests_invitation_hash_check CHECK (
    invitation_token_hash IS NULL OR (
      invitation_token_hash ~ '^[a-f0-9]{64}$'
      AND recipient_email_hash IS NOT NULL
      AND invitation_expires_at IS NOT NULL
      AND invitation_expires_at > created_at
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_report_requests_invitation_token_uq
  ON public.cush_verify_report_requests (invitation_token_hash)
  WHERE invitation_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS cush_verify_report_requests_invitation_email_hash_idx
  ON public.cush_verify_report_requests (recipient_email_hash, status)
  WHERE recipient_email_hash IS NOT NULL;

ALTER TABLE public.cush_verify_report_consents
  DROP CONSTRAINT IF EXISTS cush_verify_report_consents_approved_categories_check,
  DROP CONSTRAINT IF EXISTS cush_verify_report_consents_categories_check,
  ADD CONSTRAINT cush_verify_report_consents_categories_check CHECK (
    cardinality(approved_categories) BETWEEN 0 AND 7
    AND approved_categories <@ ARRAY[
      'income_employment', 'rent_housing', 'savings', 'financial_commitments',
      'score_summary', 'assessment_status', 'evidence_summary'
    ]::text[]
  );

ALTER TABLE public.cush_verify_report_deliveries
  DROP CONSTRAINT IF EXISTS cush_verify_report_deliveries_categories_check,
  ADD CONSTRAINT cush_verify_report_deliveries_categories_check CHECK (
    cardinality(categories) BETWEEN 1 AND 7
    AND categories <@ ARRAY[
      'income_employment', 'rent_housing', 'savings', 'financial_commitments',
      'score_summary', 'assessment_status', 'evidence_summary'
    ]::text[]
  );

ALTER TABLE public.cush_verify_report_events
  DROP CONSTRAINT IF EXISTS cush_verify_report_events_event_type_check,
  DROP CONSTRAINT IF EXISTS cush_verify_report_events_type_check,
  ADD CONSTRAINT cush_verify_report_events_type_check CHECK (
    event_type IN (
      'request_created', 'request_linked', 'consent_approved', 'consent_declined',
      'consent_revoked', 'report_delivered', 'report_accessed'
    )
  );

CREATE TABLE IF NOT EXISTS public.cush_verify_discovery_searches (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE RESTRICT,
  identifier_type TEXT NOT NULL
    CHECK (identifier_type IN ('email', 'reference_code')),
  identifier_digest TEXT NOT NULL
    CHECK (identifier_digest ~ '^[a-f0-9]{64}$'),
  match_found BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_discovery_searches_institution_created_idx
  ON public.cush_verify_discovery_searches (institution_id, created_at DESC);

ALTER TABLE public.cush_verify_discovery_searches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_discovery_searches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_discovery_searches_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
