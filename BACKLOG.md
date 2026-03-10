# AEO Audit Platform — Backlog

## P1-4: Automated Recommendation Actions
Agent that can automatically implement recommendations (update meta descriptions, add schema markup, etc.)

## P1-7: Branded Audit URLs
Replace CUID-based audit URLs with human-readable slugs using customer name + date.
Example: `/audits/appsflyer-03-10-2026` instead of `/audits/cmmkag7ud000242g2agdluvq9`
- Add `slug` field to Audit model (unique, indexed)
- Generate slug on audit creation: `${brandName}-${MM-DD-YYYY}`
- Dedup: if slug already exists, append incrementing suffix: `appsflyer-03-10-2026-2`, `appsflyer-03-10-2026-3`, etc.
- Update `[id]` route to resolve by slug or CUID
- Redirect old CUID URLs to new slug URLs (optional)
