import { z } from "zod";

export const cushVerifyInstitutionTypes = ["bank", "lender", "housing", "employer", "university", "other"] as const;
export const cushVerifyEngagementModels = [
  "institutional_portal",
  "api_integration",
  "partnership_discussion",
] as const;
export const cushVerifyReviewStatuses = [
  "pending_review",
  "in_review",
  "approved_for_follow_up",
  "not_approved",
] as const;

export const cushVerifyInstitutionInterestSchema = z.object({
  institutionName: z.string().trim().min(2).max(160),
  institutionType: z.enum(cushVerifyInstitutionTypes),
  contactName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  country: z.string().trim().min(2).max(100),
  intendedUse: z.string().trim().max(1200).default(""),
  verificationRequirements: z.string().trim().max(1200).default(""),
  preferredEngagementModel: z.enum(cushVerifyEngagementModels).optional(),
  contactConsent: z.literal(true),
  website: z.string().max(200).optional().default(""),
}).strict();

export const cushVerifyReviewStatusSchema = z.enum(cushVerifyReviewStatuses);

export type CushVerifyInstitutionInterestInput = z.infer<typeof cushVerifyInstitutionInterestSchema>;
export type CushVerifyReviewStatus = z.infer<typeof cushVerifyReviewStatusSchema>;
