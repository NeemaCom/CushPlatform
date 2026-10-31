BEGIN;

-- Stores only Mono's provider account ID for owner-scoped statement requests.
-- BVNs, OTPs, full account numbers, and statement payloads are not persisted.
CREATE TABLE IF NOT EXISTS public.mono_linked_accounts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  mono_account_id text NOT NULL UNIQUE,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mono_linked_accounts_user_id_idx
  ON public.mono_linked_accounts(user_id);

-- Records affirmative consent for the billable BVN bank-account lookup flow.
-- No BVN, OTP, session ID, or lookup result is stored.
CREATE TABLE IF NOT EXISTS public.mono_bvn_lookup_consents (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mono_bvn_lookup_consents_user_accepted_at_idx
  ON public.mono_bvn_lookup_consents(user_id, accepted_at);

ALTER TABLE public.mono_linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mono_bvn_lookup_consents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.mono_linked_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.mono_bvn_lookup_consents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mono_linked_accounts_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mono_bvn_lookup_consents_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
