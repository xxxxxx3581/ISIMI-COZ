# A5 — Trust & Safety

This feature-branch step adds the first production-safe trust layer without changing the database schema.

- Trust information is derived only from existing marketplace profile fields.
- The UI explicitly avoids claiming a seller is verified unless a future verification state exists.
- Listing reports support structured reasons and optional notes.
- Duplicate reports from the same signed-in user for the same listing are blocked client-side before insert.
- Existing RLS remains the authorization boundary for report writes.
- Existing listing, photo, owner-action, Marketplace, and Hallet flows are not rewritten.

Next A5 work can add a server-side moderation/verification model after explicit schema approval; this step intentionally does not alter production data or schema.
