# QMI × YUMI

Live site: https://qmixyumi.github.io/

The editable source is in `website/`. GitHub Actions checks TypeScript, runs regression tests, builds a fresh artifact and deploys main to GitHub Pages. Pages must use **GitHub Actions** as its source.

## Local development

In PowerShell, open the `website` folder. Install Node.js 24, then run:

```powershell
npm ci
npm run dev
```

For validation: `npm run typecheck`, `npm test`, `npm run build`. The build prints the fresh `pages-output/...` directory. Old root build files were removed: the site is deployed only from the GitHub Actions artifact. Do not upload node_modules, .env files, personal backups or itinerary originals.

## Sync and recovery

Sign in using an authorized Google account, automatic sync starts by default unless that device was explicitly paused. Resume it in 資料管理 when needed. Changes are uploaded after a short pause; visible pages check remote changes every 15 seconds. Offline or closed pages cannot synchronize. Different items/fields merge; competing edits to the same field require a choice. Local JSON recovery snapshots are retained before merges and conflict resolution. Export original attachments separately where needed.

The existing `save_adventure` version check remains authoritative. This release requires no database migration. `website/supabase/setup.sql` documents the initial schema: do not re-run its placeholder membership inserts on an existing project. Run `audit-access.sql` for a read-only policy review. Keep the existing three-member allowlist unless the owner changes it. OAuth test users and database membership are separate permissions.

Public Supabase URL/publishable key identify the project; they are intentionally public. Private access depends on database RLS, function privileges and private Storage policies. Anonymous state access was denied in verification; authenticated member/nonmember permissions still require a dashboard audit and signed-in tests.

## Offline and installation

The manifest and compass icons support home-screen installation. Previously loaded pages and local editing work offline. Login, cloud downloads, weather/rates and navigation need a connection. First-use document parsing and OCR models may need downloads. Important original attachments should be downloaded before travelling.

New browsers start empty. Existing local/cloud demo and Test journeys are preserved. Demo data is available only through an explicit action.

## Recoverable deletion, photos and travel dates

Trip, itinerary, expense, ticket, journal and checklist delete buttons mark records as hidden and retain them in the synchronized recycle bin (資料管理). No permanent purge runs. Hidden expenses are excluded from settlement. Concurrent deletion versus editing produces a conflict choice.

Photos are migrated only after successful IndexedDB writes. The shared JSON carries content-addressed photo references and metadata; originals use the existing private attachment bucket. Historical inline-photo backups remain readable. JSON exports no longer include photo bytes; download originals from 資料管理. Migration failures retain the previous persisted data and show an error. Cloud polls read version metadata before downloading a changed payload.

Set each trip's timezone in its toolbar. Until set, the device timezone is explicitly displayed as the fallback. 今日出發 selects the destination's current date (or nearest itinerary day outside the trip). The calendar opens at the current travel month or trip start month. Mobile form controls use at least 16px text.

The owner-supplied read-only audit confirmed RLS on state/members/storage, a private attachment bucket, member-only state/attachment policies and authenticated-only function execution. The three-member allowlist remains unchanged.
