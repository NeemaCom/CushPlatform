BEGIN;

-- Stores only normalized credit-history counts. Do not add BVNs, identity
-- profile fields, institution names, account balances, schedule dates, or raw
-- provider responses to this table.
CREATE TABLE IF NOT EXISTS public.interswitch_credit_history_evidence (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  consent_id integer NOT NULL
    REFERENCES public.interswitch_credit_lookup_consents(id) ON DELETE CASCADE,
  evidence_data jsonb NOT NULL,
  mapping_status text NOT NULL DEFAULT 'draft_pending_review'
    CHECK (mapping_status = 'draft_pending_review'),
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS interswitch_credit_history_evidence_user_id_key
  ON public.interswitch_credit_history_evidence(user_id);

CREATE INDEX IF NOT EXISTS interswitch_credit_history_evidence_user_fetched_at_idx
  ON public.interswitch_credit_history_evidence(user_id, fetched_at DESC);

ALTER TABLE public.interswitch_credit_history_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interswitch_credit_history_evidence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.interswitch_credit_history_evidence_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
