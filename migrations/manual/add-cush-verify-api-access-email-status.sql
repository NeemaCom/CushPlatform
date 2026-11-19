-- Persist Cush Verify production API approval-email outcomes and retry audit events.
-- Email state remains server-only; production API entitlement rules are unchanged.
BEGIN;

ALTER TABLE public.cush_verify_api_access_requests
  ADD COLUMN IF NOT EXISTS email_notification_status TEXT,
  ADD COLUMN IF NOT EXISTS email_notification_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_notification_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_notification_last_attempted_by_admin_user_id INTEGER;

ALTER TABLE public.cush_verify_api_access_requests
  DROP CONSTRAINT IF EXISTS cush_verify_api_access_requests_email_notification_status_check,
  DROP CONSTRAINT IF EXISTS cush_verify_api_access_requests_email_notification_attempt_count_check,
  DROP CONSTRAINT IF EXISTS cush_verify_api_access_requests_email_notification_metadata_check;

ALTER TABLE public.cush_verify_api_access_requests
  ADD CONSTRAINT cush_verify_api_access_requests_email_notification_status_check
    CHECK (email_notification_status IS NULL OR email_notification_status IN ('sending', 'sent', 'not_configured', 'failed')),
  ADD CONSTRAINT cush_verify_api_access_requests_email_notification_attempt_count_check
    CHECK (email_notification_attempt_count >= 0),
  ADD CONSTRAINT cush_verify_api_access_requests_email_notification_metadata_check
    CHECK (
      (email_notification_status IS NULL
        AND email_notification_attempt_count = 0
        AND email_notification_attempted_at IS NULL
        AND email_notification_last_attempted_by_admin_user_id IS NULL)
      OR
      (email_notification_status IS NOT NULL
        AND email_notification_attempt_count > 0
        AND email_notification_attempted_at IS NOT NULL
        AND email_notification_last_attempted_by_admin_user_id IS NOT NULL)
    );

-- The original manual migration created an inline event_type CHECK. Drop either
-- PostgreSQL's generated name or the ORM's named constraint before replacing it.
ALTER TABLE public.cush_verify_api_access_request_events
  DROP CONSTRAINT IF EXISTS cush_verify_api_access_request_events_event_type_check,
  DROP CONSTRAINT IF EXISTS cush_verify_api_access_request_events_type_check;

ALTER TABLE public.cush_verify_api_access_request_events
  ADD CONSTRAINT cush_verify_api_access_request_events_type_check
    CHECK (event_type IN (
      'submitted',
      'approved',
      'rejected',
      'approval_email_retry_started',
      'approval_email_retry_completed'
    ));

COMMIT;
