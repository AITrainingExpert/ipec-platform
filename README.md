# iPEC Employability Edge — Soft Skill Training Platform

A **free, full-stack web application** for running 5-day soft-skill training and assessment.
No fees for students. No camera or video. Works on any phone or laptop browser.

Three roles: **Participant**, **Trainer**, **Admin** — each with its own dashboard and permissions.

## What's included (all working)

- Registration + login with **email OTP** (free via Supabase; simulated in demo mode)
- **Strict role-based access** — participant / trainer / admin each see only what they should (see table below)
- **Day-wise timed quizzes** — questions and options shuffle every attempt, auto-scored instantly
- **Gamified Drills Arena** — 10 drills across 5 days (morning + afternoon), each question reveals the correct answer plus a "Master Trainer Insight", and tiered **Gold/Platinum badges** unlock only when you beat the pass score
- **XP + Levels** — earn XP from quizzes and drills, level up on your profile
- **Audio Studio** — hear "model vs flawed" answers via the browser's built-in voice (Web Speech API — **no mic, no camera**)
- **Skill-gap analyzer** — turns quiz results into strengths + focus areas
- **ATS resume score checker** + **Resume builder** — paste text for a score, or build an ATS-clean resume
- **Profile & Badges** — XP, level, milestone badges, and the drill trophy cabinet
- **Per-student report** — printable PDF of scores, strengths, gaps
- **Trainer dashboard** — batch results, readiness bands, risk flags, CSV export
- **Recruiter Analytics** (trainer/admin) — cohort readiness, branch-wise breakdown, candidate leaderboard with status tags, **Export Cohort Report (PDF)**
- **Admin console** — manage users, batches, and the question bank
- **Google Sheets sync** — every score can auto-append to a Google Sheet in real time

## Who sees what (role access)

| Feature | Participant | Trainer | Admin |
|---|:---:|:---:|:---:|
| Home, Quizzes, Drills Arena | ✓ | preview | — |
| Audio Studio, Resume Tools | ✓ | — | — |
| My Report + PDF download | ✓ | — | — |
| Profile, Badges, XP | ✓ | — | — |
| Batch Dashboard | — | ✓ (own batch) | ✓ (all) |
| Recruiter Analytics + PDF | — | ✓ (own batch) | ✓ (all) |
| Manage users / batches / questions | — | — | ✓ |

Access is enforced two ways: the menu only shows a role's own links, and every route is guarded — typing another role's URL redirects you home. In production, Supabase row-level security (in `supabase-schema.sql`) enforces it at the database too, so a participant literally cannot read another student's data.

## Two modes

| Mode | Setup | Data | Users |
|------|-------|------|-------|
| **Demo** (default) | none — just run it | browser storage (one device) | for trying it out |
| **Production** | paste 2 Supabase keys | real cloud database | **unlimited, multi-device** |

You can build and ship in demo mode today, then flip to production by adding keys — no code changes.

---

## Run locally (2 minutes)

```bash
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:5173).
In demo mode: pick a role, enter any name/email, and the OTP code is shown on screen.
Log in as **admin** or **trainer** to see those dashboards (demo seeds one of each).

---

## Deploy FREE to the internet (Vercel — recommended)

1. Push this folder to a **GitHub** repo (free).
2. Go to **vercel.com**, sign in with GitHub, click **Add New > Project**, pick the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`.
4. Click **Deploy**. Done — you get a public URL.

It works immediately in demo mode. To enable unlimited real users, add the env vars below in
Vercel > Project > Settings > Environment Variables, then redeploy.

> Netlify works the same way (build `npm run build`, publish `dist`).

---

## Turn on real, unlimited multi-user mode (Supabase — free tier)

1. Create a free project at **supabase.com**.
2. Open **SQL Editor**, paste the contents of `supabase-schema.sql`, run it.
3. Go to **Project Settings > API**, copy the **Project URL** and **anon public key**.
4. Set these as environment variables (locally in `.env`, and in Vercel/Netlify):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Redeploy. The app now uses the cloud database. Email OTP is handled by Supabase automatically.

Supabase free tier comfortably supports large batches; the quiz scoring runs in the browser,
so 100+ students submitting at once creates almost no backend load.

### Make yourself admin
After you register once in production, open Supabase > Table editor > `profiles`,
find your row and set `role` to `admin`.

---

## Turn on Google Sheets auto-sync (optional, free)

1. Create a Google Sheet.
2. Extensions > Apps Script, paste `google-apps-script.gs`, deploy as a **Web app**
   (execute as *Me*, access *Anyone*). Copy the web-app URL.
3. Add it as `VITE_SHEETS_WEBHOOK=...` in your env vars and redeploy.

Every quiz score now appends a row to the sheet automatically.

---

## Load the full 500-question bank

The app ships with a working starter set across all 5 days. To load all 500:

- **Demo mode:** extend the `SEED_QUESTIONS` array in `src/lib/questions.ts`.
- **Production:** insert rows into the `questions` table (see the example at the bottom of
  `supabase-schema.sql`). You can bulk-import via Supabase's CSV importer.

---

## Enhance later (the code is structured for it)

- `src/lib/db.ts` — the single data layer. Every feature reads/writes through it, so adding
  a table or swapping the backend touches one file.
- `src/lib/logic.ts` — scoring, skill-gap, badges, ATS rules. Tune thresholds here.
- `src/pages/` — one file per screen. Add a page, add a route in `src/App.tsx`, add a nav link
  in `src/components/Layout.tsx`.
- Add AI feedback later by calling a free LLM API (e.g. Groq/Gemini) from a new function in
  `db.ts` — the queueing advice in the implementation plan keeps it inside free limits.

---

iPEC Solutions Pvt. Ltd. · Free for students · www.ipecsoftskill-platform.com
