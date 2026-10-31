BEGIN;

-- The initial evidence migration constrained all records to the review-only
-- state. The user-approved repayment formula is now wired into V2.
ALTER TABLE public.interswitch_credit_history_evidence
  ADD COLUMN IF NOT EXISTS mapping_version text NOT NULL
    DEFAULT 'interswitch-repayment-history-v1';

ALTER TABLE public.interswitch_credit_history_evidence
  DROP CONSTRAINT IF EXISTS interswitch_credit_history_evidence_mapping_status_check;

ALTER TABLE public.interswitch_credit_history_evidence
  ADD CONSTRAINT interswitch_credit_history_evidence_mapping_status_check
  CHECK (mapping_status IN ('draft_pending_review', 'score_applied', 'no_scoreable_history'));

COMMIT;
