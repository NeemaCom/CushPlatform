-- Extend encrypted Passport evidence intake for pre- and post-arrival records.
-- Original amounts and currency codes remain encrypted in the profile payload.
-- Unsupported currencies are stored but excluded from GBP-normalized scoring.

create table if not exists public.cush_passport_post_arrival_financial_profiles (
  user_id integer primary key references public.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  encrypted_profile text not null,
  updated_at timestamptz not null default now()
);

alter table public.cush_passport_evidence_submissions
  add column if not exists period text not null default 'pre_arrival';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cush_passport_evidence_submissions_period_check'
      and conrelid = 'public.cush_passport_evidence_submissions'::regclass
  ) then
    alter table public.cush_passport_evidence_submissions
      add constraint cush_passport_evidence_submissions_period_check
      check (period in ('pre_arrival', 'post_arrival'));
  end if;
end $$;

create index if not exists cush_passport_evidence_submissions_user_period_created_idx
  on public.cush_passport_evidence_submissions(user_id, period, created_at desc);

alter table public.cush_passport_post_arrival_financial_profiles enable row level security;
revoke all on table public.cush_passport_post_arrival_financial_profiles from public, anon, authenticated;
