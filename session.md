# Session Snapshot

**Update policy:** Only update this file when the user invokes `/clear`, signals they're about to clear, or explicitly asks to save session state. Otherwise leave it alone — its value is being a stable, point-in-time snapshot, not a running log.

---

_No snapshot taken yet. This file will be populated on first `/clear` or explicit save request, with: project status, Supabase project ref/IDs, Vercel project/deploy IDs, any live-environment quirks, ad-hoc migrations applied outside `supabase/migrations`, open work, and debug entry points (Supabase dashboard URL, Vercel deployment logs)._
