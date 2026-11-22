-- Cush Passport private evidence intake.
-- Financial values, extracted text, corrections, review notes, and file bytes
-- are encrypted by the application before being stored in encrypted_* fields.
-- The application must set PASSPORT_EVIDENCE_ENCRYPTION_KEY before using these
-- endpoints. This migration does not add or change any scoring inputs.

create table if not exists public.cush_passport_financial_profiles (
  user_id integer primary key references public.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  encrypted_profile text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cush_passport_evidence_submissions (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'payslip', 'bank_statement', 'rent_receipt', 'savings_statement',
    'commitment_statement', 'proof_of_residency', 'tax_return',
    'employment_contract', 'transfer_receipt', 'other'
  )),
  label text not null,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'text/csv')),
  file_size integer not null check (file_size between 1 and 5242880),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  encrypted_file text not null,
  encrypted_extraction text not null,
  encrypted_correction text,
  encrypted_review text,
  review_status text not null default 'draft' check (review_status in (
    'draft', 'submitted', 'under_review', 'additional_information_required',
    'approved', 'rejected'
  )),
  evidence_classification text not null default 'self_declared' check (
    evidence_classification in (
      'self_declared', 'document_supported', 'independently_verified',
      'institution_confirmed'
    )
  ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by integer references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cush_passport_evidence_submissions_user_created_idx
  on public.cush_passport_evidence_submissions(user_id, created_at desc);
create index if not exists cush_passport_evidence_submissions_status_created_idx
  on public.cush_passport_evidence_submissions(review_status, created_at desc);

create table if not exists public.cush_passport_evidence_events (
  id serial primary key,
  submission_id integer references public.cush_passport_evidence_submissions(id) on delete set null,
  user_id integer references public.users(id) on delete set null,
  actor_user_id integer references public.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'admin', 'system')),
  event_type text not null check (event_type in (
    'profile_saved', 'profile_deleted', 'document_uploaded', 'draft_corrected',
    'document_submitted', 'document_deleted', 'document_accessed',
    'review_opened', 'review_decided'
  )),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cush_passport_evidence_events_user_created_idx
  on public.cush_passport_evidence_events(user_id, created_at desc);
create index if not exists cush_passport_evidence_events_submission_created_idx
  on public.cush_passport_evidence_events(submission_id, created_at desc);

alter table public.cush_passport_financial_profiles enable row level security;
alter table public.cush_passport_evidence_submissions enable row level security;
alter table public.cush_passport_evidence_events enable row level security;

revoke all on table public.cush_passport_financial_profiles from public, anon, authenticated;
revoke all on table public.cush_passport_evidence_submissions from public, anon, authenticated;
revoke all on table public.cush_passport_evidence_events from public, anon, authenticated;
revoke all on sequence public.cush_passport_evidence_submissions_id_seq from public, anon, authenticated;
revoke all on sequence public.cush_passport_evidence_events_id_seq from public, anon, authenticated;
