-- Cush Verify team invitations, activation, and access audit.
-- Apply this migration before deploying team-management routes.
BEGIN;

ALTER TABLE public.cush_verify_invitations
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'organisation_admin';
ALTER TABLE public.cush_verify_invitations
  ADD COLUMN IF NOT EXISTS created_by_type TEXT NOT NULL DEFAULT 'cush_admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cush_verify_invitations_role_check'
      AND conrelid = 'public.cush_verify_invitations'::regclass
  ) THEN
    ALTER TABLE public.cush_verify_invitations
      ADD CONSTRAINT cush_verify_invitations_role_check
      CHECK (role IN ('organisation_admin', 'analyst', 'viewer'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cush_verify_invitations_created_by_type_check'
      AND conrelid = 'public.cush_verify_invitations'::regclass
  ) THEN
    ALTER TABLE public.cush_verify_invitations
      ADD CONSTRAINT cush_verify_invitations_created_by_type_check
      CHECK (created_by_type IN ('cush_admin', 'organisation_admin'));
  END IF;
END
$$;

-- Team invitees are not asked for a telephone number unless the product later
-- establishes a clear operational need for one.
ALTER TABLE public.cush_verify_invitations
  ALTER COLUMN business_telephone DROP NOT NULL;
ALTER TABLE public.cush_verify_institutional_users
  ALTER COLUMN business_telephone DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.cush_verify_membership_events (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE CASCADE,
  invitation_id INTEGER
    REFERENCES public.cush_verify_invitations(id) ON DELETE SET NULL,
  membership_id INTEGER
    REFERENCES public.cush_verify_institutional_memberships(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL
    CHECK (actor_type IN ('organisation_admin', 'institutional_user', 'cush_admin', 'system')),
  actor_institutional_user_id INTEGER
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE SET NULL,
  actor_admin_user_id INTEGER,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'invitation_created',
      'invitation_sent',
      'invitation_delivery_failed',
      'invitation_revoked',
      'invitation_accepted',
      'membership_revoked'
    )),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cush_verify_membership_events_institution_created_idx
  ON public.cush_verify_membership_events (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_membership_events_membership_created_idx
  ON public.cush_verify_membership_events (membership_id, created_at DESC);

ALTER TABLE public.cush_verify_membership_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_membership_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_membership_events_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
