-- First-party visitor analytics. These tables are server-only.
-- Analytics events are created only after explicit opt-in; raw IP addresses
-- are deliberately not stored in visitor records.

CREATE TABLE IF NOT EXISTS public.cush_analytics_consents (
  visitor_id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'withdrawn')),
  accepted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL AND withdrawn_at IS NULL)
    OR (status = 'withdrawn' AND withdrawn_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS cush_analytics_consents_user_updated_idx
  ON public.cush_analytics_consents (user_id, updated_at);

CREATE TABLE IF NOT EXISTS public.cush_visitor_sessions (
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_route TEXT NOT NULL,
  current_route TEXT NOT NULL,
  device_type TEXT NOT NULL
    CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  browser TEXT NOT NULL,
  operating_system TEXT NOT NULL,
  referrer_host TEXT,
  CHECK (entry_route IN (
    '/', '/login', '/dashboard', '/admin', '/verify', '/sample', '/passport',
    '/passport/:share', '/account/profile', '/account/security',
    '/account/preferences', '/account/connected-accounts',
    '/account/financial-identity', '/account/documents',
    '/account/verification', '/support', '/contact', '/privacy-policy',
    '/terms-of-service'
  )),
  CHECK (current_route IN (
    '/', '/login', '/dashboard', '/admin', '/verify', '/sample', '/passport',
    '/passport/:share', '/account/profile', '/account/security',
    '/account/preferences', '/account/connected-accounts',
    '/account/financial-identity', '/account/documents',
    '/account/verification', '/support', '/contact', '/privacy-policy',
    '/terms-of-service'
  )),
  PRIMARY KEY (visitor_id, session_id)
);

CREATE INDEX IF NOT EXISTS cush_visitor_sessions_visitor_last_seen_idx
  ON public.cush_visitor_sessions (visitor_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_sessions_user_last_seen_idx
  ON public.cush_visitor_sessions (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_sessions_last_seen_idx
  ON public.cush_visitor_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_sessions_current_route_idx
  ON public.cush_visitor_sessions (current_route);

CREATE TABLE IF NOT EXISTS public.cush_visitor_events (
  id SERIAL PRIMARY KEY,
  visitor_id UUID NOT NULL,
  session_id UUID NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('page_view', 'signup_started', 'signup_completed', 'login_completed', 'session_ping')),
  route TEXT NOT NULL CHECK (route IN (
    '/', '/login', '/dashboard', '/admin', '/verify', '/sample', '/passport',
    '/passport/:share', '/account/profile', '/account/security',
    '/account/preferences', '/account/connected-accounts',
    '/account/financial-identity', '/account/documents',
    '/account/verification', '/support', '/contact', '/privacy-policy',
    '/terms-of-service'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cush_visitor_events_session_fk
    FOREIGN KEY (visitor_id, session_id)
    REFERENCES public.cush_visitor_sessions (visitor_id, session_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cush_visitor_events_visitor_occurred_idx
  ON public.cush_visitor_events (visitor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_events_user_occurred_idx
  ON public.cush_visitor_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_events_session_occurred_idx
  ON public.cush_visitor_events (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_events_route_occurred_idx
  ON public.cush_visitor_events (route, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cush_visitor_events_occurred_idx
  ON public.cush_visitor_events (occurred_at DESC);

ALTER TABLE public.cush_analytics_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cush_visitor_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.cush_analytics_consents FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.cush_visitor_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.cush_visitor_events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.cush_visitor_events_id_seq FROM PUBLIC, anon, authenticated;
