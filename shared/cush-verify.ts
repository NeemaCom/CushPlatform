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
export const cushVerifyApplicationStatuses = [
  "submitted",
  "under_review",
  "additional_information_required",
  "approved",
  "rejected",
] as const;
export const cushVerifyApplicantInstitutionTypes = [
  "university",
  "housing_organisation",
  "bank",
  "landlord",
] as const;

export const cushVerifyApplicationSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradingName: z.string().trim().max(200).optional().default(""),
  institutionType: z.enum(cushVerifyApplicantInstitutionTypes),
  countryOfRegistration: z.string().trim().min(2).max(100),
  website: z.string().trim().url().max(300),
  businessEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactFullName: z.string().trim().min(2).max(160),
  contactJobTitle: z.string().trim().min(2).max(120),
  businessTelephone: z.string().trim().min(5).max(40),
  intendedUse: z.string().trim().min(10).max(2000),
  estimatedMonthlyVerifications: z.number().int().min(0).max(10_000_000).nullable().optional(),
  contactConsent: z.literal(true),
}).strict();

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
export const cushVerifyApplicationStatusSchema = z.enum(cushVerifyApplicationStatuses);

export type CushVerifyInstitutionInterestInput = z.infer<typeof cushVerifyInstitutionInterestSchema>;
export type CushVerifyReviewStatus = z.infer<typeof cushVerifyReviewStatusSchema>;
export type CushVerifyApplicationInput = z.infer<typeof cushVerifyApplicationSchema>;
export type CushVerifyApplicationStatus = z.infer<typeof cushVerifyApplicationStatusSchema>;
