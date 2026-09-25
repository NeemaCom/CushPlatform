---
name: Managed workspace launcher
description: Non-obvious workspace configuration behavior when making a project portable
---

The managed workspace launcher cannot be deleted by ordinary file editing. Replacing it through the workspace's validation path can remove a running preview workflow if the replacement omits that workflow. Reconfiguring the preview afterward may regenerate extra default ports and module entries.

**Why:** Direct deletion was rejected, and a minimal replacement without the workflow removed the preview; recreating it restored more settings than the portable app needed.

**How to apply:** Keep a minimal validated launcher that invokes standard npm scripts and includes the one preview workflow and required port. Treat it as workspace metadata, not an application runtime dependency.