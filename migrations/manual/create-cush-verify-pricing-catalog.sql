BEGIN;

CREATE TABLE IF NOT EXISTS public.cush_verify_pricing_versions (
  id serial PRIMARY KEY,
  version integer NOT NULL UNIQUE CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'superseded', 'abandoned')),
  default_currency text NOT NULL DEFAULT 'USD'
    CHECK (default_currency ~ '^[A-Z]{3}$'),
  annual_discount_bps integer NOT NULL DEFAULT 1500
    CHECK (annual_discount_bps BETWEEN 0 AND 9999),
  faq_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by integer,
  published_by integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT cush_verify_pricing_versions_publication_timestamp_check CHECK (
    (status IN ('draft', 'abandoned') AND published_at IS NULL)
    OR (status IN ('published', 'superseded') AND published_at IS NOT NULL)
  ),
  CONSTRAINT cush_verify_pricing_versions_faq_items_array_check
    CHECK (jsonb_typeof(faq_items) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_pricing_versions_one_published_idx
  ON public.cush_verify_pricing_versions(status)
  WHERE status = 'published';
CREATE UNIQUE INDEX IF NOT EXISTS cush_verify_pricing_versions_one_draft_idx
  ON public.cush_verify_pricing_versions(status)
  WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS cush_verify_pricing_versions_status_version_idx
  ON public.cush_verify_pricing_versions(status, version);

CREATE TABLE IF NOT EXISTS public.cush_verify_pricing_plans (
  id serial PRIMARY KEY,
  version_id integer NOT NULL
    REFERENCES public.cush_verify_pricing_versions(id) ON DELETE CASCADE,
  plan_key text NOT NULL CHECK (plan_key ~ '^[a-z0-9][a-z0-9_-]{0,59}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  description text NOT NULL CHECK (char_length(description) <= 500),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  monthly_price_minor integer CHECK (monthly_price_minor IS NULL OR monthly_price_minor >= 0),
  included_reports integer NOT NULL DEFAULT 0 CHECK (included_reports >= 0),
  allocation_mode text NOT NULL DEFAULT 'exact'
    CHECK (allocation_mode IN ('sandbox', 'exact', 'minimum')),
  additional_report_price_minor integer
    CHECK (additional_report_price_minor IS NULL OR additional_report_price_minor >= 0),
  sales_mode text NOT NULL DEFAULT 'self_service'
    CHECK (sales_mode IN ('sandbox_only', 'self_service', 'contact_sales')),
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(feature_flags) = 'object'),
  api_limits jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(api_limits) = 'object'),
  support_level text NOT NULL DEFAULT 'not_configured'
    CHECK (support_level IN ('not_configured', 'community', 'standard', 'priority', 'dedicated')),
  CONSTRAINT cush_verify_pricing_plans_availability_check
    CHECK (NOT (is_active AND is_archived)),
  CONSTRAINT cush_verify_pricing_plans_sales_price_check CHECK (
    (sales_mode <> 'contact_sales'
      OR (monthly_price_minor IS NULL AND additional_report_price_minor IS NULL))
    AND (monthly_price_minor IS NOT NULL OR sales_mode = 'contact_sales')
  ),
  CONSTRAINT cush_verify_pricing_plans_sandbox_mode_check CHECK (
    (allocation_mode <> 'sandbox' OR sales_mode = 'sandbox_only')
    AND (sales_mode <> 'sandbox_only' OR allocation_mode = 'sandbox')
  ),
  CONSTRAINT cush_verify_pricing_plans_minimum_allocation_check CHECK (
    allocation_mode <> 'minimum' OR included_reports > 0
  ),
  CONSTRAINT cush_verify_pricing_plans_version_key_uq UNIQUE (version_id, plan_key)
);

CREATE INDEX IF NOT EXISTS cush_verify_pricing_plans_version_id_idx
  ON public.cush_verify_pricing_plans(version_id);
CREATE INDEX IF NOT EXISTS cush_verify_pricing_plans_version_active_idx
  ON public.cush_verify_pricing_plans(version_id, is_active, is_archived);

ALTER TABLE public.cush_verify_pricing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_verify_pricing_plans ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cush_verify_pricing_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cush_verify_pricing_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_pricing_versions_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.cush_verify_pricing_plans_id_seq FROM PUBLIC, anon, authenticated;

INSERT INTO public.cush_verify_pricing_versions (
  version, status, default_currency, annual_discount_bps, faq_items, created_at, updated_at, published_at
)
VALUES (
  1,
  'published',
  'USD',
  1500,
  '[
    {
      "question": "When does a report use one credit?",
      "answer": "Only a successfully returned, authorised full report consumes one report credit. Searching for a profile, a profile not being found, a declined consent request, and consent being obtained by itself are free."
    },
    {
      "question": "Are failed requests or technical retries charged?",
      "answer": "No. A failed API request is not charged, and repeated technical retries do not consume additional credits."
    },
    {
      "question": "Are individual endpoint results charged separately?",
      "answer": "Individual endpoint retrieval is included within the allocation for a full report; it does not add another report credit."
    },
    {
      "question": "What if a profile changes materially?",
      "answer": "A new report requested after a material profile update consumes one new report credit when Cush successfully returns the authorised report."
    },
    {
      "question": "Can we subscribe or retrieve reports now?",
      "answer": "Not yet. This is a pricing preview; subscriptions, checkout, report retrieval, and credit balances are not currently active."
    }
  ]'::jsonb,
  now(),
  now(),
  now()
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.cush_verify_pricing_plans (
  version_id,
  plan_key,
  name,
  description,
  currency,
  monthly_price_minor,
  included_reports,
  allocation_mode,
  additional_report_price_minor,
  sales_mode,
  is_active,
  is_archived,
  feature_flags,
  api_limits,
  support_level
)
SELECT
  version_row.id,
  seed.plan_key,
  seed.name,
  seed.description,
  'USD',
  seed.monthly_price_minor,
  seed.included_reports,
  seed.allocation_mode,
  seed.additional_report_price_minor,
  seed.sales_mode,
  true,
  false,
  '{
    "fullPassportReports": false,
    "incomeEmploymentHistory": false,
    "rentHousingHistory": false,
    "savingsHistory": false,
    "financialCommitments": false,
    "cushScore": false,
    "confidenceInformation": false,
    "evidenceClassifications": false,
    "apiAccess": false,
    "webhooks": false,
    "usageAnalytics": false,
    "auditLogs": false,
    "teamAccounts": false
  }'::jsonb,
  '{
    "requestsPerMinute": null,
    "requestsPerHour": null,
    "maxConcurrentRequests": null,
    "monthlyReportLimit": null
  }'::jsonb,
  'not_configured'
FROM public.cush_verify_pricing_versions AS version_row
CROSS JOIN (
  VALUES
    ('developer', 'Developer', 'Free sandbox-only plan configuration; live reports are not included.', 0, 0, 'sandbox', NULL::integer, 'sandbox_only'),
    ('starter', 'Starter', '25 authorised reports per month.', 4900, 25, 'exact', 200, 'self_service'),
    ('growth', 'Growth', '100 authorised reports per month.', 14900, 100, 'exact', 150, 'self_service'),
    ('business', 'Business', '500 authorised reports per month.', 39900, 500, 'exact', 100, 'self_service'),
    ('enterprise', 'Enterprise', 'Custom institutional terms; contact Cush for a proposal.', NULL::integer, 1000, 'minimum', NULL::integer, 'contact_sales')
) AS seed(
  plan_key,
  name,
  description,
  monthly_price_minor,
  included_reports,
  allocation_mode,
  additional_report_price_minor,
  sales_mode
)
WHERE version_row.version = 1
ON CONFLICT (version_id, plan_key) DO NOTHING;

COMMIT;
