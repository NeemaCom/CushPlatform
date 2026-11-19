import { z } from "zod";
import type { CushVerifyApiEnvironment, CushVerifyPricingApiLimits } from "./schema";
import { cushVerifyPricingApiLimitsSchema } from "./cush-verify-pricing";

export const CUSH_VERIFY_API_SCOPES = [
  "passport:discover",
  "reports:request",
  "reports:read",
  "usage:read",
  "sandbox:simulate",
] as const;

export const CUSH_VERIFY_API_ENDPOINTS = [
  "/api/v1/verify/passport-discovery",
  "/api/v1/verify/report-requests",
  "/api/v1/verify/report-requests/:id",
  "/api/v1/verify/report-requests/:id/deliver",
  "/api/v1/reports",
  "/api/v1/reports/:id",
  "/api/v1/usage",
  "/api/v1/usage/breakdown",
  "/api/v1/sandbox/status",
  "/api/v1/sandbox/discovery",
  "/api/v1/sandbox/report-workflow",
  "/api/v1/sandbox/usage",
] as const;

export const cushVerifyApiEnvironmentSchema = z.enum(["sandbox", "production"]);
export const cushVerifyApiScopeSchema = z.enum(CUSH_VERIFY_API_SCOPES);
export const cushVerifyApiEndpointSchema = z.enum(CUSH_VERIFY_API_ENDPOINTS);

export const createCushVerifyApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  environment: cushVerifyApiEnvironmentSchema,
  scopes: z.array(cushVerifyApiScopeSchema).min(1).max(CUSH_VERIFY_API_SCOPES.length),
}).strict().superRefine((value, context) => {
  if (new Set(value.scopes).size !== value.scopes.length) {
    context.addIssue({
      code: "custom",
      path: ["scopes"],
      message: "Choose each API permission only once.",
    });
  }
});

export const cushVerifyApiUsageQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  environment: cushVerifyApiEnvironmentSchema.optional(),
  apiKeyId: z.coerce.number().int().positive().optional(),
  endpoint: cushVerifyApiEndpointSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
    context.addIssue({
      code: "custom",
      path: ["from"],
      message: "The start of the date range must come before its end.",
    });
  }
  if (
    value.from && value.to &&
    new Date(value.to).getTime() - new Date(value.from).getTime() > 90 * 24 * 60 * 60 * 1000
  ) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "Usage history can be filtered for up to 90 days at a time.",
    });
  }
});

const publicHistoryRangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
}).strict().superRefine((value, context) => {
  const now = Date.now();
  const from = value.from
    ? new Date(value.from).getTime()
    : value.to
      ? new Date(value.to).getTime() - 90 * 24 * 60 * 60 * 1000
      : now - 90 * 24 * 60 * 60 * 1000;
  const to = value.to ? new Date(value.to).getTime() : now;
  if (from > to) {
    context.addIssue({
      code: "custom",
      path: ["from"],
      message: "The start of the date range must come before its end.",
    });
  }
  if (to - from > 90 * 24 * 60 * 60 * 1000) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "Usage and report history can be filtered for up to 90 days at a time.",
    });
  }
});

export const cushVerifyApiReportHistoryQuerySchema = publicHistoryRangeSchema;

export const cushVerifyApiPublicUsageQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  apiKeyId: z.coerce.number().int().positive().optional(),
  endpoint: cushVerifyApiEndpointSchema.optional(),
}).strict().superRefine((value, context) => {
  const now = Date.now();
  const from = value.from
    ? new Date(value.from).getTime()
    : value.to
      ? new Date(value.to).getTime() - 90 * 24 * 60 * 60 * 1000
      : now - 90 * 24 * 60 * 60 * 1000;
  const to = value.to ? new Date(value.to).getTime() : now;
  if (from > to) {
    context.addIssue({
      code: "custom",
      path: ["from"],
      message: "The start of the date range must come before its end.",
    });
  }
  if (to - from > 90 * 24 * 60 * 60 * 1000) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "Usage and report history can be filtered for up to 90 days at a time.",
    });
  }
});

export const createCushVerifyApiAccessRequestSchema = z.object({
  intendedUse: z.string().trim().min(10).max(1200),
  estimatedMonthlyRequests: z.number().int().min(0).max(10_000_000).nullable().optional(),
}).strict();

export const decideCushVerifyApiAccessRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().trim().max(1200).optional().default(""),
}).strict().superRefine((value, context) => {
  if (value.decision === "rejected" && value.decisionNote.length < 5) {
    context.addIssue({
      code: "custom",
      path: ["decisionNote"],
      message: "Add a brief reason when rejecting an access request.",
    });
  }
});

export type CushVerifyApiScope = typeof CUSH_VERIFY_API_SCOPES[number];
export type CushVerifyApiKeyInput = z.infer<typeof createCushVerifyApiKeySchema>;
export type CushVerifyApiKeyEnvironment = CushVerifyApiEnvironment;
export type CushVerifyApiAccessRequestInput = z.infer<typeof createCushVerifyApiAccessRequestSchema>;
export type CushVerifyApiReportHistoryQuery = z.infer<typeof cushVerifyApiReportHistoryQuerySchema>;
export type CushVerifyApiPublicUsageQuery = z.infer<typeof cushVerifyApiPublicUsageQuerySchema>;
export type CushVerifyApiRequestContext = {
  apiKeyId: number;
  institutionId: number;
  createdByInstitutionalUserId: number;
  usageId: number;
  environment: CushVerifyApiEnvironment;
  scopes: CushVerifyApiScope[];
  apiLimits: CushVerifyPricingApiLimits | null;
  overageConfigured: boolean;
  periodStartAt: Date;
};

export function toSafeApiLimits(value: unknown): CushVerifyPricingApiLimits | null {
  const parsed = cushVerifyPricingApiLimitsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const CUSH_VERIFY_API_VERSION = "v1";
