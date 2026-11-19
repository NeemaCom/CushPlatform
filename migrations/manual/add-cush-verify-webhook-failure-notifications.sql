-- Persistent admin alerts and email outbox for terminal webhook delivery failures.
-- Apply only after create-cush-verify-institutional-webhooks.sql and the
-- institutional-membership migration have been applied to the Cush Verify DB.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cush_verify_webhook_deliveries_id_institution_uq'
      AND conrelid = 'public.cush_verify_webhook_deliveries'::regclass
  ) THEN
    ALTER TABLE public.cush_verify_webhook_deliveries
      ADD CONSTRAINT cush_verify_webhook_deliveries_id_institution_uq
      UNIQUE (id, institution_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cush_verify_webhook_failure_notifications (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL,
  institution_id INTEGER NOT NULL,
  institutional_user_id INTEGER NOT NULL,
  read_at TIMESTAMPTZ,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_attempt_count INTEGER NOT NULL DEFAULT 0,
  email_next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_locked_until TIMESTAMPTZ,
  email_last_attempted_at TIMESTAMPTZ,
  email_last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_webhook_failure_notifications_delivery_tenant_fk
    FOREIGN KEY (delivery_id, institution_id)
    REFERENCES public.cush_verify_webhook_deliveries(id, institution_id) ON DELETE CASCADE,
  CONSTRAINT cush_verify_webhook_failure_notifications_membership_fk
    FOREIGN KEY (institution_id, institutional_user_id)
    REFERENCES public.cush_verify_institutional_memberships(institution_id, institutional_user_id) ON DELETE CASCADE,
  CONSTRAINT cush_verify_webhook_failure_notifications_email_status_check
    CHECK (email_status IN ('pending', 'sending', 'sent', 'failed', 'not_configured')),
  CONSTRAINT cush_verify_webhook_failure_notifications_email_attempts_check
    CHECK (email_attempt_count BETWEEN 0 AND 5),
  CONSTRAINT cush_verify_webhook_failure_notifications_email_error_code_check
    CHECK (email_last_error_code IS NULL OR email_last_error_code ~ '^[a-z0-9_]{1,60}$'),
  CONSTRAINT cush_verify_webhook_failure_notifications_delivery_recipient_uq
    UNIQUE (delivery_id, institutional_user_id)
);

CREATE INDEX IF NOT EXISTS cush_verify_webhook_failure_notifications_recipient_created_idx
  ON public.cush_verify_webhook_failure_notifications (institution_id, institutional_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_webhook_failure_notifications_email_queue_idx
  ON public.cush_verify_webhook_failure_notifications (email_status, email_next_attempt_at, email_locked_until);

ALTER TABLE public.cush_verify_webhook_failure_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_webhook_failure_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_webhook_failure_notifications_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;

-- Read-only verification. Expected values: true for table_present, rls_enabled,
-- anon_select_blocked, authenticated_select_blocked, and delivery_tenant_unique.
SELECT
  to_regclass('public.cush_verify_webhook_failure_notifications') IS NOT NULL AS table_present,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = to_regclass('public.cush_verify_webhook_failure_notifications')
  ), FALSE) AS rls_enabled,
  NOT has_table_privilege('anon', 'public.cush_verify_webhook_failure_notifications', 'SELECT') AS anon_select_blocked,
  NOT has_table_privilege('authenticated', 'public.cush_verify_webhook_failure_notifications', 'SELECT') AS authenticated_select_blocked,
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.cush_verify_webhook_deliveries'::regclass
      AND conname = 'cush_verify_webhook_deliveries_id_institution_uq'
      AND contype = 'u'
  ) AS delivery_tenant_unique;
