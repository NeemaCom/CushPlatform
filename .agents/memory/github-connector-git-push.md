---
name: GitHub connector and Git pushes
description: Replit's GitHub connector can work even when Git CLI authentication is stale.
---

A connected GitHub integration does not necessarily repair the workspace's HTTPS Git credentials. Do not obtain or expose connector tokens to make `git push` work. GitHub's Git Database REST API can preserve existing commit history by uploading missing blobs, trees, and commits in dependency order, then advancing the branch without force.

**Why:** In this workspace, the connected integration could read and write repository objects while Git's HTTPS authentication remained invalid and SSH had no usable key. Large object data must not be taken from a truncated tool-output string.

**How to apply:** Prefer a working normal Git push. If REST is necessary, confirm the remote base, verify GitHub returns the exact local SHA for every uploaded object, then update the ref with `force: false` only after all commits match. Confirm the remote tip afterward.