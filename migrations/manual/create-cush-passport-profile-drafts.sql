BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_passport_profile_drafts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  draft_type text NOT NULL
    CHECK (draft_type IN (
      'pre_arrival_financial',
      'post_arrival_financial',
      'post_arrival_profile'
    )),
  encrypted_draft text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cush_passport_profile_drafts_user_type_key
    UNIQUE (user_id, draft_type)
);

CREATE INDEX IF NOT EXISTS cush_passport_profile_drafts_user_updated_idx
  ON public.cush_passport_profile_drafts(user_id, updated_at DESC);

ALTER TABLE public.cush_passport_profile_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_passport_profile_drafts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_passport_profile_drafts_id_seq FROM PUBLIC, anon, authenticated;

COMMIT;
