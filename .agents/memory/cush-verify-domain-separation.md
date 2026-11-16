---
name: Cush Verify domain separation
description: Product requirement to keep the public Cush Verify platform separate from Cush Passport by domain.
---

Cush Verify should have its own public subdomain and should not be presented as part of the Cush Passport site.

**Why:** The user explicitly clarified that Cush Verify pricing and the Verify platform should live on their own subdomain.

**How to apply:** When routing or hosting Cush Verify pages, use the dedicated Verify hostname and avoid Passport-specific shell elements or analytics consent UI on those pages.
