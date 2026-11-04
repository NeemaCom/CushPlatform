-- Add structured verification and engagement preferences to existing
-- Cush Verify institution-interest submissions.
BEGIN;

ALTER TABLE public.cush_verify_institution_interests
  ADD COLUMN IF NOT EXISTS verification_requirements TEXT,
  ADD COLUMN IF NOT EXISTS preferred_engagement_model TEXT;

ALTER TABLE public.cush_verify_institution_interests
  DROP CONSTRAINT IF EXISTS cush_verify_institution_interests_type_check,
  DROP CONSTRAINT IF EXISTS cush_verify_institution_interests_institution_type_check;

ALTER TABLE public.cush_verify_institution_interests
  ADD CONSTRAINT cush_verify_institution_interests_type_check
    CHECK (institution_type IN ('bank', 'lender', 'housing', 'employer', 'university', 'other')),
  ADD CONSTRAINT cush_verify_institution_interests_engagement_model_check
    CHECK (preferred_engagement_model IN ('institutional_portal', 'api_integration', 'partnership_discussion')),
  ADD CONSTRAINT cush_verify_institution_interests_verification_requirements_length_check
    CHECK (verification_requirements IS NULL OR char_length(verification_requirements) <= 1200);

COMMIT;
