-- Add organisation-admin role and access-state actions to the audit history.
-- Apply before deploying the team-management API that writes these events.
BEGIN;

ALTER TABLE public.cush_verify_membership_events
  DROP CONSTRAINT IF EXISTS cush_verify_membership_events_type_check;

ALTER TABLE public.cush_verify_membership_events
  ADD CONSTRAINT cush_verify_membership_events_type_check
  CHECK (event_type IN (
    'invitation_created',
    'invitation_sent',
    'invitation_delivery_failed',
    'invitation_revoked',
    'invitation_accepted',
    'membership_role_changed',
    'membership_suspended',
    'membership_reactivated',
    'membership_revoked'
  ));

COMMIT;
