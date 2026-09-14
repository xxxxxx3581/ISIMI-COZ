# Marketplace A3.5 — Global Foundation

## Goal
Turn the verified Marketplace 2.0 foundation into a scalable marketplace without destabilizing the existing İşini Hallet flows.

## Non-negotiable release rules
- Production `main` is protected by process: no direct feature work on `main`.
- Development happens on `test/marketplace-a3.5` (or a later feature branch created from it).
- Every release is tested on Render before production.
- Marketplace changes must not modify Hallet case/document flows unless explicitly required and tested.
- Payments, messaging, favorites, moderation, and AI matching are separate milestones; do not mix them into one risky release.

## A3.5 scope
1. Listing identity and ownership foundations
   - Stable listing IDs and owner references.
   - Explicit listing lifecycle states.
   - Safe edit/unpublish/archive behavior.
2. Seller/profile presentation
   - Public seller card.
   - Seller type and verification-ready UI fields.
   - No claim of verification until a real verification mechanism exists.
3. Listing UX quality
   - Shareable listing URL/state.
   - Consistent detail-page layout across real estate and automobile.
   - Mobile-first actions and clear status feedback.
4. Data-readiness
   - Keep photos in Storage and listing metadata in `public.listings`.
   - Avoid duplicating listing data in browser-only state.
   - Keep search/filter logic modular so server-side search can replace it later.
5. Internationalization readiness
   - Avoid hard-coding assumptions into new marketplace components.
   - Keep currency, location, category and seller-type fields separable.
   - Preserve Turkish UI while preparing translation keys for future locales.

## Future milestones
- A4: favorites, saved searches, messaging, notifications.
- A5: trust, verification, reporting, moderation and anti-fraud controls.
- A6: AI natural-language search and ranking.
- A7: payments, premium listings and business accounts.
- A8: internationalization, country/locale support and global SEO/performance.

## Definition of done for A3.5
- Existing A3.4.1 production behavior remains intact.
- Real estate and automobile listing creation, photos, detail, search and filters still work.
- No Hallet regression.
- Mobile layout remains usable.
- Test Render deployment succeeds.
- Production is only updated after explicit approval.
