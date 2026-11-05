-- Shared, server-only IP rate-limit counters for authentication endpoints.
-- IP addresses are stored as keyed SHA-256 hashes, not as plain text.
CREATE TABLE IF NOT EXISTS public.cush_ip_rate_limits (
  scope text NOT NULL
    CHECK (scope IN ('auth', 'password-signin')),
  ip_hash text NOT NULL
    CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0
    CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, ip_hash)
);

CREATE INDEX IF NOT EXISTS cush_ip_rate_limits_updated_at_idx
  ON public.cush_ip_rate_limits (updated_at);

ALTER TABLE public.cush_ip_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.cush_ip_rate_limits FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.cush_ip_rate_limits FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.cush_ip_rate_limits FROM authenticated;
