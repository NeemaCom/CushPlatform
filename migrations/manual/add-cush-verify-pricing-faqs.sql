BEGIN;

ALTER TABLE public.cush_verify_pricing_versions
  ADD COLUMN IF NOT EXISTS faq_items jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cush_verify_pricing_versions_faq_items_array_check'
      AND conrelid = 'public.cush_verify_pricing_versions'::regclass
  ) THEN
    ALTER TABLE public.cush_verify_pricing_versions
      ADD CONSTRAINT cush_verify_pricing_versions_faq_items_array_check
      CHECK (jsonb_typeof(faq_items) = 'array');
  END IF;
END $$;

UPDATE public.cush_verify_pricing_versions
SET faq_items = '[
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
]'::jsonb
WHERE status = 'published'
  AND faq_items = '[]'::jsonb;

ALTER TABLE public.cush_verify_pricing_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cush_verify_pricing_versions FROM PUBLIC, anon, authenticated;

COMMIT;
