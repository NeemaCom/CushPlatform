import { z } from "zod";
import type { CushVerifyApiEnvironment, CushVerifyPricingApiLimits } from "./schema";
import { cushVerifyPricingApiLimitsSchema } from "./cush-verify-pricing";

export const CUSH_VERIFY_API_SCOPES = [
  "passport:discover",
  "reports:request",
  "reports:read",
  "sandbox:simulate",
] as const;

export const CUSH_VERIFY_API_ENDPOINTS = [
  "/api/v1/verify/passport-discovery",
  "/api/v1/verify/report-requests",
  "/api/v1/verify/report-requests/:id/deliver",
  "/api/v1/sandbox/status",
  "/api/v1/sandbox/discovery",
  "/api/v1/sandbox/report-workflow",
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

export type CushVerifyApiScope = typeof CUSH_VERIFY_API_SCOPES[number];
export type CushVerifyApiKeyInput = z.infer<typeof createCushVerifyApiKeySchema>;
export type CushVerifyApiKeyEnvironment = CushVerifyApiEnvironment;
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
