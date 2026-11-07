-- Keep existing accounts usable; suspension is opt-in through the admin controls.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS users_active_role_idx
  ON public.users (role)
  WHERE is_active = true;
