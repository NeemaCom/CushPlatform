BEGIN;

-- Records the user's affirmative consent before requesting an Interswitch
-- bureau credit report. Phone numbers, BVNs, reports, and provider responses
-- are deliberately not stored in this table.
CREATE TABLE IF NOT EXISTS public.interswitch_credit_lookup_consents (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interswitch_credit_lookup_consents_user_accepted_at_idx
  ON public.interswitch_credit_lookup_consents(user_id, accepted_at);

ALTER TABLE public.interswitch_credit_lookup_consents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.interswitch_credit_lookup_consents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.interswitch_credit_lookup_consents_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
