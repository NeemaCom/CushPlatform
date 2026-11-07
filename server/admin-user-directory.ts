import { z } from "zod";

export const adminUserDirectoryQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
}).strict();

export function userDirectorySearchPattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}
