# Marketplace A3.5 — Global Foundation

## Goal
Turn the verified Marketplace 2.0 foundation into a scalable marketplace without destabilizing the existing İşini Hallet flows.

## Release rules
- Production `main` is not used for feature development.
- Development happens on `test/marketplace-a3.5` and later feature branches.
- Every release is tested on Render before production.
- Marketplace changes must not modify Hallet case/document flows unless explicitly required and tested.
- Payments, messaging, favorites, moderation and AI matching remain separate milestones.

## A3.5 scope
1. Listing identity and ownership foundations.
2. Seller/profile presentation with verification-ready fields.
3. Safe edit, unpublish and archive behavior.
4. Shareable listing state and consistent detail UX.
5. Data-readiness for server-side search later.
6. Internationalization-ready marketplace fields for currency, location, category and seller type.

## Future milestones
- A4: favorites, saved searches, messaging, notifications.
- A5: trust, verification, reporting, moderation and anti-fraud.
- A6: AI natural-language search and ranking.
- A7: payments, premium listings and business accounts.
- A8: internationalization, country/locale support, global SEO and performance.

## Definition of done
- Existing A3.4.1 production behavior remains intact.
- Real estate and automobile creation, photos, detail, search and filters still work.
- No Hallet regression.
- Mobile behavior remains usable.
- Test Render deployment succeeds.
- Production is updated only after explicit approval.
