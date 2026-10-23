-- REVIEW ONLY. Do not run until the intended Supabase project is confirmed.
-- Drafted after a read-only schema comparison and aggregate-only data preflight.
-- This migration changes constraints/default metadata only; it does not update,
-- delete, or backfill user rows. In particular, false consent values stay false.
-- Run once as the database owner in the intended Supabase SQL Editor.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Keep the preflight checks and DDL in one locked transaction so new writes
-- cannot introduce nulls or duplicate identifiers between the check and ALTER.
-- If the lock cannot be acquired quickly, this draft aborts without changes.
LOCK TABLE public.users IN ACCESS EXCLUSIVE MODE;

DO $preflight$
DECLARE
  firebase_uid_attnum smallint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind IN ('r', 'p')
  ) THEN
    RAISE EXCEPTION 'Expected table public.users was not found; no changes applied.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE username IS NULL
       OR email IS NULL
       OR password_hash IS NULL
       OR first_name IS NULL
       OR last_name IS NULL
       OR accept_terms IS NULL
       OR accept_privacy IS NULL
  ) THEN
    RAISE EXCEPTION 'Required users columns contain NULL values; review data before applying constraints.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE btrim(username) = '' OR btrim(email) = ''
  ) THEN
    RAISE EXCEPTION 'Empty username or email values exist; review data before applying constraints.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    GROUP BY username HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.users
    GROUP BY email HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Exact duplicate usernames or emails exist; review data before applying unique constraints.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    GROUP BY lower(btrim(username)) HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.users
    GROUP BY lower(btrim(email)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Case/whitespace-normalized duplicate usernames or emails exist; review data before applying constraints.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname IN ('users_username_unique', 'users_email_unique')
  ) THEN
    RAISE EXCEPTION 'An expected username/email constraint name already exists; inspect the live schema instead of rerunning.';
  END IF;

  SELECT attnum::smallint
  INTO firebase_uid_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.users'::regclass
    AND attname = 'firebase_uid'
    AND NOT attisdropped;

  IF firebase_uid_attnum IS NULL THEN
    RAISE EXCEPTION 'Expected public.users.firebase_uid column was not found; no changes applied.';
  END IF;

  -- The comparator found this unique constraint under its legacy name. Verify
  -- that it still covers exactly firebase_uid before renaming it to Drizzle's name.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_firebase_uid_unique'
      AND contype = 'u'
      AND convalidated
      AND conkey = ARRAY[firebase_uid_attnum]
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_firebase_uid_key'
      AND contype = 'u'
      AND convalidated
      AND conkey = ARRAY[firebase_uid_attnum]
  ) THEN
    RAISE EXCEPTION 'The expected Firebase UID unique constraint was not found; inspect the live schema before applying.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_firebase_uid_unique'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_firebase_uid_unique'
      AND contype = 'u'
      AND convalidated
      AND conkey = ARRAY[firebase_uid_attnum]
  ) THEN
    RAISE EXCEPTION 'Constraint name users_firebase_uid_unique is already used for a different definition.';
  END IF;
END;
$preflight$;

ALTER TABLE public.users
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL,
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN accept_terms SET NOT NULL,
  ALTER COLUMN accept_privacy SET NOT NULL;

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'customer',
  ALTER COLUMN accept_terms DROP DEFAULT,
  ALTER COLUMN accept_privacy DROP DEFAULT;

ALTER TABLE public.users
  ADD CONSTRAINT users_username_unique UNIQUE (username),
  ADD CONSTRAINT users_email_unique UNIQUE (email);

DO $rename_firebase_uid_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_firebase_uid_unique'
  ) THEN
    ALTER TABLE public.users
      RENAME CONSTRAINT users_firebase_uid_key TO users_firebase_uid_unique;
  END IF;
END;
$rename_firebase_uid_constraint$;

COMMIT;
