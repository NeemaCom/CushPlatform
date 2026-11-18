-- Cush Verify subscriptions, Stripe references, report-credit ledger, and invoice outbox.
-- Apply only after the institutional account, pricing catalog, and authorized reports migrations.
-- Stripe IDs and delivery metadata are stored; report contents are never copied into billing records.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.cush_verify_institutions') IS NULL
    OR to_regclass('public.cush_verify_pricing_versions') IS NULL
    OR to_regclass('public.cush_verify_pricing_plans') IS NULL
    OR to_regclass('public.cush_verify_report_deliveries') IS NULL THEN
    RAISE EXCEPTION 'Apply the Cush Verify institutional, pricing catalog, and authorized reports migrations first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cush_verify_billing_accounts (
  institution_id INTEGER PRIMARY KEY
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT UNIQUE,
  available_credits INTEGER NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  current_period_used INTEGER NOT NULL DEFAULT 0 CHECK (current_period_used >= 0),
  current_period_start_at TIMESTAMPTZ,
  current_period_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_billing_accounts_period_check CHECK (
    (current_period_start_at IS NULL AND current_period_end_at IS NULL)
    OR (current_period_start_at IS NOT NULL AND current_period_end_at IS NOT NULL
      AND current_period_end_at > current_period_start_at)
  )
);

CREATE TABLE IF NOT EXISTS public.cush_verify_stripe_price_mappings (
  id SERIAL PRIMARY KEY,
  pricing_version_id INTEGER NOT NULL
    REFERENCES public.cush_verify_pricing_versions(id) ON DELETE RESTRICT,
  plan_key TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit_amount_minor INTEGER NOT NULL CHECK (unit_amount_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_stripe_price_mappings_plan_fk
    FOREIGN KEY (pricing_version_id, plan_key)
    REFERENCES public.cush_verify_pricing_plans(version_id, plan_key) ON DELETE RESTRICT,
  CONSTRAINT cush_verify_stripe_price_mappings_version_plan_interval_uq
    UNIQUE (pricing_version_id, plan_key, billing_interval)
);
CREATE INDEX IF NOT EXISTS cush_verify_stripe_price_mappings_version_plan_idx
  ON public.cush_verify_stripe_price_mappings (pricing_version_id, plan_key);

CREATE TABLE IF NOT EXISTS public.cush_verify_subscriptions (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  pricing_version_id INTEGER NOT NULL
    REFERENCES public.cush_verify_pricing_versions(id) ON DELETE RESTRICT,
  plan_key TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
  status TEXT NOT NULL CHECK (
    status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'suspended')
  ),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit_amount_minor INTEGER NOT NULL CHECK (unit_amount_minor >= 0),
  included_reports INTEGER NOT NULL CHECK (included_reports >= 0),
  additional_report_price_minor INTEGER CHECK (
    additional_report_price_minor IS NULL OR additional_report_price_minor >= 0
  ),
  current_period_start_at TIMESTAMPTZ NOT NULL,
  current_period_end_at TIMESTAMPTZ NOT NULL,
  next_credit_allocation_at TIMESTAMPTZ,
  rollover_policy TEXT NOT NULL DEFAULT 'carry_all'
    CHECK (rollover_policy = 'carry_all'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  grace_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  CONSTRAINT cush_verify_subscriptions_period_check CHECK (current_period_end_at > current_period_start_at),
  CONSTRAINT cush_verify_subscriptions_plan_fk
    FOREIGN KEY (pricing_version_id, plan_key)
    REFERENCES public.cush_verify_pricing_plans(version_id, plan_key) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_subscriptions_one_current_per_institution_idx
  ON public.cush_verify_subscriptions (institution_id)
  WHERE status IN ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'paused', 'suspended');
CREATE INDEX IF NOT EXISTS cush_verify_subscriptions_institution_status_idx
  ON public.cush_verify_subscriptions (institution_id, status);
CREATE INDEX IF NOT EXISTS cush_verify_subscriptions_credit_allocation_idx
  ON public.cush_verify_subscriptions (status, next_credit_allocation_at);

CREATE TABLE IF NOT EXISTS public.cush_verify_credit_ledger (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL
    REFERENCES public.cush_verify_institutions(id) ON DELETE RESTRICT,
  subscription_id INTEGER
    REFERENCES public.cush_verify_subscriptions(id) ON DELETE RESTRICT,
  report_delivery_id INTEGER
    REFERENCES public.cush_verify_report_deliveries(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'allocation', 'report_debit', 'overage', 'rollover',
      'promotional_credit', 'reversal', 'admin_adjustment', 'expiration'
    )
  ),
  credit_delta INTEGER NOT NULL DEFAULT 0,
  amount_minor INTEGER,
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  idempotency_key TEXT NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  created_by_admin_user_id INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cush_verify_credit_ledger_amount_check CHECK (
    abs(credit_delta::BIGINT) <= 2000000000
    AND (amount_minor IS NULL OR abs(amount_minor::BIGINT) <= 2000000000)
  ),
  CONSTRAINT cush_verify_credit_ledger_delivery_uq UNIQUE (report_delivery_id)
);
CREATE INDEX IF NOT EXISTS cush_verify_credit_ledger_institution_created_idx
  ON public.cush_verify_credit_ledger (institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cush_verify_stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 100),
  stripe_object_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_stripe_webhook_events_processed_idx
  ON public.cush_verify_stripe_webhook_events (processed_at);

CREATE TABLE IF NOT EXISTS public.cush_verify_billing_outbox (
  id SERIAL PRIMARY KEY,
  ledger_id INTEGER NOT NULL UNIQUE
    REFERENCES public.cush_verify_credit_ledger(id) ON DELETE RESTRICT,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent')),
  stripe_invoice_item_id TEXT UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cush_verify_billing_outbox_retry_idx
  ON public.cush_verify_billing_outbox (status, next_attempt_at);

ALTER TABLE public.cush_verify_billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_stripe_price_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_billing_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_billing_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_stripe_price_mappings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_credit_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_stripe_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_billing_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_stripe_price_mappings_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_subscriptions_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_credit_ledger_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_billing_outbox_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cush_verify_reject_billing_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Cush Verify credit ledger is append-only; record a reversal or adjustment instead.';
END;
$$;

DROP TRIGGER IF EXISTS cush_verify_credit_ledger_immutable_trigger
  ON public.cush_verify_credit_ledger;
CREATE TRIGGER cush_verify_credit_ledger_immutable_trigger
  BEFORE UPDATE OR DELETE ON public.cush_verify_credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.cush_verify_reject_billing_ledger_mutation();

COMMIT;
