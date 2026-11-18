import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  cushPostArrivalRecords,
  users,
  type CushVerifyReportCategory,
} from "@shared/schema";
import { db } from "./db";
import { getV2Assessment } from "./cush-score-v2";

export async function findEligiblePassportByEmail(email: string) {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
  })
    .from(users)
    .where(and(
      sql`lower(${users.email}) = ${email}`,
      eq(users.isActive, true),
      eq(users.isEmailVerified, true),
    ))
    .limit(1);
  return user ?? null;
}

export async function getEligiblePassportUserById(userId: number) {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    isActive: users.isActive,
    isEmailVerified: users.isEmailVerified,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

/**
 * Passport data is read only through this server-side boundary, after the
 * caller has verified active, purpose-specific consent in the Verify database.
 * Only the approved categories are queried.
 */
export async function getConsentBoundPassportReportData(
  userId: number,
  approvedCategories: CushVerifyReportCategory[],
) {
  const assessment = await getV2Assessment(userId);
  const recordTypes = [
    ...(approvedCategories.includes("income_employment") ? ["employment", "income"] : []),
    ...(approvedCategories.includes("rent_housing") ? ["accommodation"] : []),
    ...(approvedCategories.includes("savings") ? ["banking_savings"] : []),
    ...(approvedCategories.includes("financial_commitments") ? ["expense"] : []),
  ];
  const activities = [
    ...(approvedCategories.includes("income_employment") ? ["salary", "freelance_income"] : []),
    ...(approvedCategories.includes("rent_housing") ? ["rent_payment"] : []),
    ...(approvedCategories.includes("savings") ? ["savings_contribution"] : []),
  ];

  if (recordTypes.length === 0 && activities.length === 0) {
    return { assessment, financialRecords: [] };
  }

  const recordCondition = recordTypes.length
    ? inArray(cushPostArrivalRecords.recordType, recordTypes)
    : sql`false`;
  const activityCondition = activities.length
    ? and(
        eq(cushPostArrivalRecords.recordType, "financial_activity"),
        inArray(sql`${cushPostArrivalRecords.details}->>'activityType'`, activities),
      )
    : sql`false`;
  const financialRecords = await db.select({
    recordType: cushPostArrivalRecords.recordType,
    activityDate: cushPostArrivalRecords.activityDate,
    countryCode: cushPostArrivalRecords.countryCode,
    currencyCode: cushPostArrivalRecords.currencyCode,
    evidenceStatus: cushPostArrivalRecords.evidenceStatus,
    details: cushPostArrivalRecords.details,
  })
    .from(cushPostArrivalRecords)
    .where(and(
      eq(cushPostArrivalRecords.userId, userId),
      or(recordCondition, activityCondition)!,
    ));

  return { assessment, financialRecords };
}
