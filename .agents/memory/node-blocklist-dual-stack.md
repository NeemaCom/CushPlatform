---
name: Node BlockList and IPv4-mapped IPv6
description: A surprising Node net.BlockList interaction when checking dual-stack address ranges.
---

When using Node's `net.BlockList` to reject internal destinations, test ordinary public IPv4 addresses after adding IPv4-mapped IPv6 subnets. A mapped-IPv6 range entry can unexpectedly make unrelated IPv4 `check()` calls report blocked in the current runtime.

**Why:** This behavior caused every public IPv4 webhook destination to fail safety validation until the mapped range was removed and handled explicitly.

**How to apply:** Keep IPv4 and IPv6 checks covered independently. Handle mapped IPv6 literals explicitly rather than adding the broad mapped range to a shared `BlockList`.
