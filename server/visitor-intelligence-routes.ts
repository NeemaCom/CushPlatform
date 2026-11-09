import type { Express, Request } from "express";
import type { PoolClient } from "pg";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ADMIN_PERMISSION } from "@shared/admin-permissions";
import { isAuthenticated, requireAdminPermission, requireTrustedAdminOrigin, type AuthenticatedRequest } from "./auth";
import { pgPool } from "./db";
import { storage } from "./storage";
import { isAdminAuditTableMissing, recordAdminAuditEvent } from "./admin-audit";
import { createVisitorAnalyticsCsv, type VisitorAnalyticsExportRow } from "./visitor-analytics-export";
import {
  VISITOR_ANALYTICS_POLICY_VERSION,
  VISITOR_ANALYTICS_RETENTION_DAYS,
  VISITOR_EVENT_TYPES,
  VISITOR_ROUTE_ALLOWLIST,
} from "@shared/visitor-analytics-policy";

const visitorIdSchema = z.string().uuid();
const consentSchema = z.object({
  visitorId: visitorIdSchema.optional(),
  accepted: z.boolean(),
  policyVersion: z.literal(VISITOR_ANALYTICS_POLICY_VERSION),
}).refine((value) => !value.accepted || Boolean(value.visitorId), {
  message: "A visitor identifier is required to opt in.",
});
const eventSchema = z.object({
  visitorId: visitorIdSchema,
  sessionId: z.string().uuid(),
  eventType: z.enum(VISITOR_EVENT_TYPES),
  route: z.string().max(80),
  referrerHost: z.string().max(253).optional().nullable(),
});
const SAFE_ROUTES = new Set<string>(VISITOR_ROUTE_ALLOWLIST);

const analyticsRangeSchema = z.coerce.number().int().refine((value) => [7, 30, 90].includes(value));
const visitorKindSchema = z.enum(["all", "registered", "anonymous"]);
const MAX_VISITOR_EXPORT_ROWS = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type VisitorAnalyticsWindow = {
  start: Date;
  endExclusive: Date;
  rangeDays: number | null;
  startDate: string;
  endDate: string;
  custom: boolean;
};

type VisitorExportAuditRow = {
  id: number;
  admin_user_id: number;
  resource_id: string | null;
  outcome: "success" | "denied" | "failed";
  created_at: Date | string;
};

function parseVisitorExportAuditResource(resourceId: string | null) {
  const presetMatch = resourceId?.match(/^(7|30|90)d:(all|registered|anonymous):rows=(\d+):truncated=(true|false):searched=(true|false)$/);
  const customMatch = resourceId?.match(/^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2}):(all|registered|anonymous):rows=(\d+):truncated=(true|false):searched=(true|false)$/);
  if (!presetMatch && !customMatch) {
    return {
      rangeDays: null,
      startDate: null,
      endDate: null,
      visitorKind: null,
      rowCount: null,
      truncated: null,
      searchApplied: null,
    };
  }
  const match = presetMatch ?? customMatch!;
  return {
    rangeDays: presetMatch ? Number(match[1]) : null,
    startDate: customMatch ? match[1] : null,
    endDate: customMatch ? match[2] : null,
    visitorKind: customMatch ? match[3] : match[2],
    rowCount: Number(customMatch ? match[4] : match[3]),
    truncated: (customMatch ? match[5] : match[4]) === "true",
    searchApplied: (customMatch ? match[6] : match[5]) === "true",
  };
}

function isMissingTable(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === "42P01";
}

function getRequestDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const deviceType = /ipad|tablet|playbook|silk/.test(ua)
    ? "tablet"
    : /mobile|iphone|ipod|android/.test(ua)
      ? "mobile"
      : userAgent
        ? "desktop"
        : "unknown";
  const browser = /edg\//.test(ua)
    ? "Edge"
    : /opr\//.test(ua)
      ? "Opera"
      : /firefox\//.test(ua)
        ? "Firefox"
        : /chrome\//.test(ua) && !/edg\//.test(ua)
          ? "Chrome"
          : /safari\//.test(ua) && !/chrome\//.test(ua)
            ? "Safari"
            : "Other";
  const operatingSystem = /windows/.test(ua)
    ? "Windows"
    : /android/.test(ua)
      ? "Android"
      : /iphone|ipad|ipod/.test(ua)
        ? "iOS"
        : /mac os|macintosh/.test(ua)
          ? "macOS"
          : /linux/.test(ua)
            ? "Linux"
            : "Other";
  return { deviceType, browser, operatingSystem };
}

function normalizeReferrerHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().slice(0, 253);
  } catch {
    return null;
  }
}

async function getVerifiedSessionUserId(req: Request): Promise<number | null> {
  const userId = req.session?.userId;
  if (!Number.isSafeInteger(userId) || !userId) return null;
  const user = await storage.getUser(userId);
  if (!user?.isActive || !user.isEmailVerified) return null;
  return user.id;
}

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function purgeExpiredVisitorAnalytics(now = new Date()) {
  await pgPool.query(
    `DELETE FROM public.cush_visitor_events
     WHERE occurred_at < $1::timestamptz - ($2::int * interval '1 day')`,
    [now.toISOString(), VISITOR_ANALYTICS_RETENTION_DAYS],
  );
  await pgPool.query(
    `DELETE FROM public.cush_visitor_sessions
     WHERE last_seen_at < $1::timestamptz - ($2::int * interval '1 day')`,
    [now.toISOString(), VISITOR_ANALYTICS_RETENTION_DAYS],
  );
  await pgPool.query(
    `DELETE FROM public.cush_analytics_consents
     WHERE status = 'withdrawn'
       AND updated_at < $1::timestamptz - interval '1 year'`,
    [now.toISOString()],
  );
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? parsed
    : null;
}

function getVisitorAnalyticsWindow(
  rangeValue: unknown,
  startDateValue: unknown,
  endDateValue: unknown,
  now = new Date(),
): VisitorAnalyticsWindow | null {
  const hasCustomDate = startDateValue !== undefined || endDateValue !== undefined;
  if (hasCustomDate) {
    const start = parseDateOnly(startDateValue);
    const endDate = parseDateOnly(endDateValue);
    if (!start || !endDate) return null;

    const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const oldestAllowed = new Date(todayStart.getTime() - 89 * DAY_MS);
    const dayCount = Math.floor((endDate.getTime() - start.getTime()) / DAY_MS) + 1;
    if (
      endDate < start
      || endDate > todayStart
      || start < oldestAllowed
      || dayCount < 1
      || dayCount > 90
    ) {
      return null;
    }

    return {
      start,
      endExclusive: new Date(Math.min(endDate.getTime() + DAY_MS, now.getTime())),
      rangeDays: null,
      startDate: start.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      custom: true,
    };
  }

  const parsedRange = analyticsRangeSchema.safeParse(rangeValue ?? "7");
  if (!parsedRange.success) return null;
  const start = new Date(now.getTime() - parsedRange.data * DAY_MS);
  return {
    start,
    endExclusive: now,
    rangeDays: parsedRange.data,
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    custom: false,
  };
}

export function registerVisitorIntelligenceRoutes(app: Express) {
  app.post("/api/visitor-intelligence/consent", requireTrustedAdminOrigin, async (req, res) => {
    const parsed = consentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid analytics choice." });
    }

    try {
      const { visitorId, accepted, policyVersion } = parsed.data;
      const userId = await getVerifiedSessionUserId(req);
      if (accepted) {
        await pgPool.query(
          `INSERT INTO public.cush_analytics_consents
             (visitor_id, user_id, policy_version, status, accepted_at, withdrawn_at, updated_at)
           VALUES ($1::uuid, $2::int, $3, 'accepted', now(), NULL, now())
           ON CONFLICT (visitor_id) DO UPDATE SET
             user_id = COALESCE(EXCLUDED.user_id, public.cush_analytics_consents.user_id),
             policy_version = EXCLUDED.policy_version,
             status = 'accepted',
             accepted_at = CASE
               WHEN public.cush_analytics_consents.status = 'accepted'
                 THEN public.cush_analytics_consents.accepted_at
               ELSE now()
             END,
             withdrawn_at = NULL,
             updated_at = now()`,
          [visitorId!, userId, policyVersion],
        );
        return res.json({ success: true, status: "accepted", policyVersion });
      }

      if (!visitorId && !userId) {
        return res.json({ success: true, status: "withdrawn", deletedVisitorData: false });
      }
      await inTransaction(async (client) => {
        if (visitorId) {
          await client.query(
            `UPDATE public.cush_analytics_consents
             SET status = 'withdrawn', withdrawn_at = now(), updated_at = now(),
                 user_id = COALESCE($2::int, user_id)
             WHERE visitor_id = $1::uuid`,
            [visitorId, userId],
          );
          await client.query(
            `DELETE FROM public.cush_visitor_sessions
             WHERE visitor_id = $1::uuid OR ($2::int IS NOT NULL AND user_id = $2::int)`,
            [visitorId, userId],
          );
        }
        if (userId) {
          await client.query(
            `UPDATE public.cush_analytics_consents
             SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
             WHERE user_id = $1::int`,
            [userId],
          );
          await client.query(
            `DELETE FROM public.cush_visitor_sessions WHERE user_id = $1::int`,
            [userId],
          );
        }
      });
      return res.json({ success: true, status: "withdrawn", deletedVisitorData: true });
    } catch (error) {
      console.error("[visitor-intelligence] Could not save consent:", error);
      if (isMissingTable(error)) {
        return res.status(503).json({
          error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
          code: "VISITOR_SCHEMA_MISSING",
        });
      }
      return res.status(503).json({ error: "Could not save the analytics choice." });
    }
  });

  app.post("/api/visitor-intelligence/events", requireTrustedAdminOrigin, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success || !SAFE_ROUTES.has(parsed.data.route)) {
      return res.status(400).json({ error: "Invalid analytics event." });
    }

    try {
      const { visitorId, sessionId, eventType, route, referrerHost } = parsed.data;
      const userId = await getVerifiedSessionUserId(req);
      const { deviceType, browser, operatingSystem } = getRequestDevice(req.get("user-agent") ?? "");
      const safeReferrerHost = normalizeReferrerHost(referrerHost);
      const recorded = await inTransaction(async (client) => {
        const consent = await client.query(
          `SELECT 1 FROM public.cush_analytics_consents
           WHERE visitor_id = $1::uuid
             AND status = 'accepted'
             AND policy_version = $2
           FOR SHARE`,
          [visitorId, VISITOR_ANALYTICS_POLICY_VERSION],
        );
        if (consent.rowCount !== 1) return false;
        await client.query(
          `INSERT INTO public.cush_visitor_sessions
             (visitor_id, session_id, user_id, entry_route, current_route,
              device_type, browser, operating_system, referrer_host, started_at, last_seen_at)
           VALUES ($1::uuid, $2::uuid, $3::int, $4, $4, $5, $6, $7, $8, now(), now())
           ON CONFLICT (visitor_id, session_id) DO UPDATE SET
             user_id = COALESCE(EXCLUDED.user_id, public.cush_visitor_sessions.user_id),
             current_route = EXCLUDED.current_route,
             last_seen_at = now(),
             device_type = EXCLUDED.device_type,
             browser = EXCLUDED.browser,
             operating_system = EXCLUDED.operating_system,
             referrer_host = COALESCE(EXCLUDED.referrer_host, public.cush_visitor_sessions.referrer_host)`,
          [visitorId, sessionId, userId, route, deviceType, browser, operatingSystem, safeReferrerHost],
        );
        if (eventType !== "session_ping") {
          await client.query(
            `INSERT INTO public.cush_visitor_events
               (visitor_id, session_id, user_id, event_type, route, occurred_at)
             VALUES ($1::uuid, $2::uuid, $3::int, $4, $5, now())`,
            [visitorId, sessionId, userId, eventType, route],
          );
        }
        return true;
      });
      if (!recorded) {
        return res.status(403).json({ error: "Analytics consent is not active.", code: "CONSENT_REQUIRED" });
      }
      return res.status(202).json({ accepted: true });
    } catch (error) {
      console.error("[visitor-intelligence] Event write failed:", error);
      if (isMissingTable(error)) {
        return res.status(503).json({
          error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
          code: "VISITOR_SCHEMA_MISSING",
        });
      }
      return res.status(503).json({ error: "Could not record the analytics event." });
    }
  });

  app.get(
    "/api/admin/visitor-intelligence/overview",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.visitorAnalyticsRead),
    async (req, res) => {
      const window = getVisitorAnalyticsWindow(req.query.range, req.query.startDate, req.query.endDate);
      if (!window) {
        return res.status(400).json({
          error: "Choose a valid date range within the most recent 90 days, or select a 7-, 30-, or 90-day window.",
        });
      }
      try {
        const [metrics, topRoutes, recent] = await Promise.all([
          pgPool.query(
            `SELECT
               COUNT(DISTINCT visitor_id)::int AS unique_visitors,
               COUNT(*)::int AS sessions,
               (SELECT COUNT(DISTINCT active.visitor_id)::int
                FROM public.cush_visitor_sessions active
                WHERE active.last_seen_at >= now() - interval '5 minutes') AS active_visitors,
               COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS identified_users,
               COUNT(DISTINCT s.visitor_id) FILTER (
                 WHERE s.user_id IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM public.cush_visitor_sessions identified
                     WHERE identified.visitor_id = s.visitor_id
                       AND identified.user_id IS NOT NULL
                       AND identified.last_seen_at >= $1::timestamptz
                       AND identified.last_seen_at < $2::timestamptz
                   )
               )::int AS anonymous_visitors
             FROM public.cush_visitor_sessions s
             WHERE s.last_seen_at >= $1::timestamptz
               AND s.last_seen_at < $2::timestamptz`,
            [window.start.toISOString(), window.endExclusive.toISOString()],
          ),
          pgPool.query(
            `SELECT route, COUNT(*)::int AS page_views
             FROM public.cush_visitor_events
             WHERE event_type = 'page_view'
               AND occurred_at >= $1::timestamptz
               AND occurred_at < $2::timestamptz
             GROUP BY route
             ORDER BY page_views DESC, route
             LIMIT 8`,
            [window.start.toISOString(), window.endExclusive.toISOString()],
          ),
          pgPool.query(
            `SELECT e.id, e.event_type, e.route, e.occurred_at, e.visitor_id,
                    e.user_id, u.first_name, u.last_name, u.email
             FROM public.cush_visitor_events e
             LEFT JOIN public.users u ON u.id = e.user_id
             WHERE e.occurred_at >= $1::timestamptz
               AND e.occurred_at < $2::timestamptz
             ORDER BY e.occurred_at DESC
             LIMIT 30`,
            [window.start.toISOString(), window.endExclusive.toISOString()],
          ),
        ]);
        const events = await pgPool.query(
          `SELECT
             COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
             COUNT(*) FILTER (WHERE event_type = 'signup_completed')::int AS signups,
             COUNT(*) FILTER (WHERE event_type = 'login_completed')::int AS logins
           FROM public.cush_visitor_events
           WHERE occurred_at >= $1::timestamptz
             AND occurred_at < $2::timestamptz`,
          [window.start.toISOString(), window.endExclusive.toISOString()],
        );
        return res.json({
          rangeDays: window.rangeDays,
          startDate: window.startDate,
          endDate: window.endDate,
          customDateRange: window.custom,
          generatedAt: new Date().toISOString(),
          metrics: {
            ...metrics.rows[0],
            ...events.rows[0],
          },
          topRoutes: topRoutes.rows,
          recent: recent.rows,
          privacy: {
            consentRequired: true,
            rawIpStored: false,
            retentionDays: VISITOR_ANALYTICS_RETENTION_DAYS,
          },
        });
      } catch (error) {
        if (isMissingTable(error)) {
          return res.status(503).json({
            error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
            code: "VISITOR_SCHEMA_MISSING",
          });
        }
        console.error("[visitor-intelligence] Overview failed:", error);
        return res.status(500).json({ error: "Could not load visitor analytics." });
      }
    },
  );

  app.get(
    "/api/admin/visitor-intelligence/visitors",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.visitorAnalyticsRead),
    async (req, res) => {
      const window = getVisitorAnalyticsWindow(req.query.range, req.query.startDate, req.query.endDate);
      const page = z.coerce.number().int().min(1).max(10_000).safeParse(req.query.page ?? "1");
      const kind = z.enum(["all", "registered", "anonymous"]).safeParse(req.query.kind ?? "all");
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
      if (!window || !page.success || !kind.success) {
        return res.status(400).json({ error: "Invalid visitor filter." });
      }
      try {
        const result = await pgPool.query(
          `WITH summaries AS (
             SELECT visitor_id,
                    COUNT(*)::int AS session_count,
                    MIN(started_at) AS first_seen,
                    MAX(last_seen_at) AS last_seen,
                    (ARRAY_AGG(current_route ORDER BY last_seen_at DESC))[1] AS current_route,
                    (ARRAY_AGG(device_type ORDER BY last_seen_at DESC))[1] AS device_type,
                    (ARRAY_AGG(browser ORDER BY last_seen_at DESC))[1] AS browser,
                    (ARRAY_AGG(user_id ORDER BY last_seen_at DESC) FILTER (WHERE user_id IS NOT NULL))[1] AS user_id
             FROM public.cush_visitor_sessions
             WHERE last_seen_at >= $1::timestamptz
               AND last_seen_at < $2::timestamptz
             GROUP BY visitor_id
           )
           SELECT s.visitor_id, s.session_count, s.first_seen, s.last_seen,
                  s.current_route, s.device_type, s.browser, s.user_id,
                  u.first_name, u.last_name, u.email,
                  COUNT(e.id)::int AS event_count
           FROM summaries s
           LEFT JOIN public.users u ON u.id = s.user_id
           LEFT JOIN public.cush_visitor_events e ON e.visitor_id = s.visitor_id
              AND e.occurred_at >= $1::timestamptz
              AND e.occurred_at < $2::timestamptz
            WHERE ($3 = 'all'
              OR ($3 = 'registered' AND s.user_id IS NOT NULL)
              OR ($3 = 'anonymous' AND s.user_id IS NULL))
              AND ($4 = '' OR s.visitor_id::text ILIKE '%' || $4 || '%'
                OR COALESCE(u.email, '') ILIKE '%' || $4 || '%'
                OR COALESCE(u.first_name, '') ILIKE '%' || $4 || '%'
                OR COALESCE(u.last_name, '') ILIKE '%' || $4 || '%')
           GROUP BY s.visitor_id, s.session_count, s.first_seen, s.last_seen,
                    s.current_route, s.device_type, s.browser, s.user_id,
                    u.first_name, u.last_name, u.email
           ORDER BY s.last_seen DESC
            LIMIT 50 OFFSET $5`,
          [
            window.start.toISOString(),
            window.endExclusive.toISOString(),
            kind.data,
            search,
            (page.data - 1) * 50,
          ],
        );
        return res.json({
          rangeDays: window.rangeDays,
          startDate: window.startDate,
          endDate: window.endDate,
          customDateRange: window.custom,
          page: page.data,
          pageSize: 50,
          visitors: result.rows,
        });
      } catch (error) {
        if (isMissingTable(error)) {
          return res.status(503).json({
            error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
            code: "VISITOR_SCHEMA_MISSING",
          });
        }
        console.error("[visitor-intelligence] Visitor list failed:", error);
        return res.status(500).json({ error: "Could not load the visitor list." });
      }
    },
  );

  app.get(
    "/api/admin/visitor-intelligence/exports",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.visitorAnalyticsRead),
    async (req: AuthenticatedRequest, res) => {
      try {
        await recordAdminAuditEvent(req, {
          action: "visitor_analytics.export_history.read",
          resourceType: "visitor_analytics",
        });
        const result = await pgPool.query<VisitorExportAuditRow>(
          `SELECT id, admin_user_id, resource_id, outcome, created_at
           FROM public.admin_audit_logs
           WHERE action = 'visitor_analytics.export'
             AND resource_type = 'visitor_analytics'
           ORDER BY created_at DESC
           LIMIT 50`,
        );
        return res.json({
          exports: result.rows.map((row) => ({
            id: row.id,
            adminUserId: row.admin_user_id,
            outcome: row.outcome,
            createdAt: row.created_at instanceof Date
              ? row.created_at.toISOString()
              : new Date(row.created_at).toISOString(),
            ...parseVisitorExportAuditResource(row.resource_id),
          })),
        });
      } catch (error) {
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            error: "Admin audit storage is unavailable; report history cannot be shown.",
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
          });
        }
        console.error("[visitor-intelligence] Export history failed:", error);
        return res.status(500).json({ error: "Could not load visitor report history." });
      }
    },
  );

  app.get(
    "/api/admin/visitor-intelligence/export",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.visitorAnalyticsRead),
    async (req: AuthenticatedRequest, res) => {
      const window = getVisitorAnalyticsWindow(req.query.range, req.query.startDate, req.query.endDate);
      const kind = visitorKindSchema.safeParse(req.query.kind ?? "all");
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
      if (!window || !kind.success) {
        return res.status(400).json({ error: "Invalid visitor export filter." });
      }

      try {
        const result = await pgPool.query<VisitorAnalyticsExportRow>(
          `WITH summaries AS (
             SELECT visitor_id,
                    COUNT(*)::int AS session_count,
                    MIN(started_at) AS first_seen,
                    MAX(last_seen_at) AS last_seen,
                    (ARRAY_AGG(current_route ORDER BY last_seen_at DESC))[1] AS current_route,
                    (ARRAY_AGG(device_type ORDER BY last_seen_at DESC))[1] AS device_type,
                    (ARRAY_AGG(browser ORDER BY last_seen_at DESC))[1] AS browser,
                    (ARRAY_AGG(operating_system ORDER BY last_seen_at DESC))[1] AS operating_system,
                    (ARRAY_AGG(user_id ORDER BY last_seen_at DESC)
                      FILTER (WHERE user_id IS NOT NULL))[1] AS user_id
             FROM public.cush_visitor_sessions
              WHERE last_seen_at >= $1::timestamptz
                AND last_seen_at < $2::timestamptz
             GROUP BY visitor_id
           ),
           filtered AS MATERIALIZED (
             SELECT s.*, u.email, u.first_name, u.last_name
             FROM summaries s
             LEFT JOIN public.users u ON u.id = s.user_id
              WHERE ($3 = 'all'
                OR ($3 = 'registered' AND s.user_id IS NOT NULL)
                OR ($3 = 'anonymous' AND s.user_id IS NULL))
                AND ($4 = '' OR s.visitor_id::text ILIKE '%' || $4 || '%'
                  OR COALESCE(u.email, '') ILIKE '%' || $4 || '%'
                  OR COALESCE(u.first_name, '') ILIKE '%' || $4 || '%'
                  OR COALESCE(u.last_name, '') ILIKE '%' || $4 || '%')
             ORDER BY s.last_seen DESC
              LIMIT $5
           ),
           event_counts AS (
             SELECT visitor_id,
                    COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
                    COUNT(*) FILTER (WHERE event_type = 'signup_completed')::int AS signup_completions,
                    COUNT(*) FILTER (WHERE event_type = 'login_completed')::int AS logins
             FROM public.cush_visitor_events
              WHERE occurred_at >= $1::timestamptz
                AND occurred_at < $2::timestamptz
             GROUP BY visitor_id
           )
           SELECT f.visitor_id,
                  CASE WHEN f.user_id IS NULL THEN 'anonymous' ELSE 'signed-in' END AS visitor_type,
                  f.session_count, f.first_seen, f.last_seen, f.current_route,
                  f.device_type, f.browser, f.operating_system,
                  COALESCE(e.page_views, 0)::int AS page_views,
                  COALESCE(e.signup_completions, 0)::int AS signup_completions,
                  COALESCE(e.logins, 0)::int AS logins
           FROM filtered f
           LEFT JOIN event_counts e ON e.visitor_id = f.visitor_id
           ORDER BY f.last_seen DESC`,
          [
            window.start.toISOString(),
            window.endExclusive.toISOString(),
            kind.data,
            search,
            MAX_VISITOR_EXPORT_ROWS + 1,
          ],
        );
        const truncated = result.rows.length > MAX_VISITOR_EXPORT_ROWS;
        const rows = result.rows.slice(0, MAX_VISITOR_EXPORT_ROWS);
        const csv = createVisitorAnalyticsCsv(rows, randomBytes(32));

        await recordAdminAuditEvent(req, {
          action: "visitor_analytics.export",
          resourceType: "visitor_analytics",
          resourceId: `${window.custom
            ? `custom:${window.startDate}:${window.endDate}`
            : `${window.rangeDays}d`}:${kind.data}:rows=${rows.length}:truncated=${truncated}:searched=${Boolean(search)}`,
        });

        const date = new Date().toISOString().slice(0, 10);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="cush-visitor-report-${date}.csv"`);
        res.setHeader("Access-Control-Expose-Headers", "X-Export-Row-Count, X-Export-Truncated");
        res.setHeader("X-Export-Row-Count", String(rows.length));
        res.setHeader("X-Export-Truncated", String(truncated));
        return res.status(200).send(csv);
      } catch (error) {
        if (isMissingTable(error)) {
          return res.status(503).json({
            error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
            code: "VISITOR_SCHEMA_MISSING",
          });
        }
        if (isAdminAuditTableMissing(error)) {
          return res.status(503).json({
            error: "The admin audit log is unavailable; the visitor report was not exported.",
            code: "ADMIN_AUDIT_SCHEMA_MISSING",
          });
        }
        console.error("[visitor-intelligence] Export failed:", error);
        return res.status(500).json({ error: "Could not export visitor analytics." });
      }
    },
  );

  app.get(
    "/api/admin/visitor-intelligence/visitors/:visitorId",
    isAuthenticated,
    requireAdminPermission(ADMIN_PERMISSION.visitorAnalyticsRead),
    async (req, res) => {
      const visitorId = visitorIdSchema.safeParse(req.params.visitorId);
      if (!visitorId.success) return res.status(400).json({ error: "Invalid visitor identifier." });
      const window = getVisitorAnalyticsWindow(
        req.query.range ?? "90",
        req.query.startDate,
        req.query.endDate,
      );
      if (!window) return res.status(400).json({ error: "Invalid visitor date range." });
      try {
        const [sessions, events] = await Promise.all([
          pgPool.query(
            `SELECT s.session_id, s.started_at, s.last_seen_at, s.entry_route,
                    s.current_route, s.device_type, s.browser, s.operating_system,
                    s.referrer_host, u.first_name, u.last_name, u.email
             FROM public.cush_visitor_sessions s
             LEFT JOIN public.users u ON u.id = s.user_id
             WHERE s.visitor_id = $1::uuid
               AND s.last_seen_at >= $2::timestamptz
               AND s.last_seen_at < $3::timestamptz
             ORDER BY s.last_seen_at DESC`,
            [visitorId.data, window.start.toISOString(), window.endExclusive.toISOString()],
          ),
          pgPool.query(
            `SELECT event_type, route, occurred_at, u.first_name, u.last_name, u.email
             FROM public.cush_visitor_events e
             LEFT JOIN public.users u ON u.id = e.user_id
             WHERE visitor_id = $1::uuid
               AND occurred_at >= $2::timestamptz
               AND occurred_at < $3::timestamptz
             ORDER BY occurred_at DESC
             LIMIT 200`,
            [visitorId.data, window.start.toISOString(), window.endExclusive.toISOString()],
          ),
        ]);
        if (sessions.rowCount === 0) return res.status(404).json({ error: "Visitor not found." });
        return res.json({
          visitorId: visitorId.data,
          rangeDays: window.rangeDays,
          startDate: window.startDate,
          endDate: window.endDate,
          customDateRange: window.custom,
          sessions: sessions.rows,
          events: events.rows,
        });
      } catch (error) {
        if (isMissingTable(error)) {
          return res.status(503).json({
            error: "Visitor analytics storage is not ready. Apply the Cush visitor-intelligence migration first.",
            code: "VISITOR_SCHEMA_MISSING",
          });
        }
        console.error("[visitor-intelligence] Visitor detail failed:", error);
        return res.status(500).json({ error: "Could not load visitor details." });
      }
    },
  );
}
