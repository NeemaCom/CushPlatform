// Empty means same-origin /api requests; a configured value is an origin, not an /api path.
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");