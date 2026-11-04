BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_plaid_connections (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL UNIQUE,
  institution_name text,
  access_token_ciphertext text NOT NULL,
  access_token_iv text NOT NULL,
  access_token_auth_tag text NOT NULL,
  identity_consent_accepted_at timestamptz NOT NULL,
  transactions_consent_accepted_at timestamptz NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cush_plaid_connections_user_linked_at_idx
  ON public.cush_plaid_connections(user_id, linked_at DESC);

ALTER TABLE public.cush_plaid_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_plaid_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_plaid_connections_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
