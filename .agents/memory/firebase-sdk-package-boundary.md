---
name: Firebase SDK package boundary
description: Keep web Firebase imports within the officially supported package surface.
---

Use the official `firebase` package for web Firebase services. The Firebase JS SDK component READMEs say `@firebase/app` and `@firebase/auth` are not intended for direct app usage. When a dependency scan flags an unused SDK product, do not bypass the supported package boundary with direct component imports or assume a broad dependency override will work; check the current upstream package range and its official fix status first.

**Why:** Direct component imports can detach the app from Firebase's supported dependency contract. The current Firestore/gRPC finding is a transitive package issue even though this app uses only Auth and App.

**How to apply:** For future Firebase dependency advisories, verify the latest metapackage dependency tree and upstream remediation before changing imports or pinning transitive versions.
