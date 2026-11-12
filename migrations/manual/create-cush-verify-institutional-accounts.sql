-- Cush Verify institutional applications, invitations, identities, and access.
-- Apply this migration before deploying the institutional registration flow.
BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_applications (
  id SERIAL PRIMARY KEY,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  institution_type TEXT NOT NULL
    CHECK (institution_type IN ('university', 'housing_organisation', 'bank', 'landlord')),
  country_of_registration TEXT NOT NULL,
  website TEXT NOT NULL,
  business_email TEXT NOT NULL,
  normalized_business_email TEXT NOT NULL,
  duplicate_key TEXT NOT NULL,
  contact_full_name TEXT NOT NULL,
  contact_job_title TEXT NOT NULL,
  business_telephone TEXT NOT NULL,
  intended_use TEXT NOT NULL,
  estimated_monthly_verifications INTEGER
    CHECK (estimated_monthly_verifications IS NULL OR estimated_monthly_verifications BETWEEN 0 AND 10000000),
  contact_consent_accepted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'additional_information_required', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_applications_business_email_active_uq
  ON public.cush_verify_applications (normalized_business_email)
  WHERE status <> 'rejected';
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_applications_duplicate_active_uq
  ON public.cush_verify_applications (duplicate_key)
  WHERE status <> 'rejected';
CREATE INDEX IF NOT EXISTS cush_verify_applications_status_created_idx
  ON public.cush_verify_applications (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_institutions (
  id SERIAL PRIMARY KEY,
  source_application_id INTEGER NOT NULL UNIQUE
    REFERENCES public.cush_verify_applications(id) ON DELETE RESTRICT,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  institution_type TEXT NOT NULL
    CHECK (institution_type IN ('university', 'housing_organisation', 'bank', 'landlord')),
  country_of_registration TEXT NOT NULL,
  website TEXT NOT NULL,
  business_email TEXT NOT NULL,
  normalized_business_email TEXT NOT NULL,
  duplicate_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'suspended')),
  approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_institutions_legal_country_uq
  ON public.cush_verify_institutions (duplicate_key)
  WHERE status <> 'rejected';
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_institutions_business_email_uq
  ON public.cush_verify_institutions (normalized_business_email)
  WHERE status <> 'rejected';

CREATE TABLE IF NOT EXISTS public.cush_verify_institutional_users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  business_telephone TEXT NOT NULL,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cush_verify_invitations (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE CASCADE,
  application_id INTEGER NOT NULL
    REFERENCES public.cush_verify_applications(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  business_telephone TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_invitations_institution_created_idx
  ON public.cush_verify_invitations (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cush_verify_invitations_email_idx
  ON public.cush_verify_invitations (email);

CREATE TABLE IF NOT EXISTS public.cush_verify_institutional_memberships (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE CASCADE,
  institutional_user_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutional_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'organisation_admin'
    CHECK (role IN ('organisation_admin', 'analyst', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'active', 'suspended', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_memberships_institution_user_uq
    UNIQUE (institution_id, institutional_user_id)
);
CREATE INDEX IF NOT EXISTS cush_verify_memberships_user_status_idx
  ON public.cush_verify_institutional_memberships (institutional_user_id, status);

CREATE TABLE IF NOT EXISTS public.cush_verify_application_events (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL
    REFERENCES public.cush_verify_applications(id) ON DELETE CASCADE,
  institution_id INTEGER
    REFERENCES public.cush_verify_institutions(id) ON DELETE SET NULL,
  actor_admin_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'submitted', 'status_changed', 'organisation_onboarded',
      'invitation_created', 'invitation_sent', 'invitation_delivery_failed',
      'invitation_accepted', 'approved', 'rejected'
    )),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_application_events_application_created_idx
  ON public.cush_verify_application_events (application_id, created_at DESC);

ALTER TABLE public.cush_verify_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_institutional_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_institutional_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_application_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_applications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_institutions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_institutional_users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_institutional_memberships FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_application_events FROM PUBLIC, anon, authenticated;

REVOKE ALL ON SEQUENCE public.cush_verify_applications_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_institutions_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_institutional_users_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_invitations_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_institutional_memberships_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_application_events_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
