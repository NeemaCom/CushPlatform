-- Remove the stale event check that blocks activation events in production.
-- This changes validation only; it does not alter or delete existing rows.
BEGIN;

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

COMMIT;
