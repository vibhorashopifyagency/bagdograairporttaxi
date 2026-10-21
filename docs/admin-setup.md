# Admin and bookings: setup guide

What is built so far: staff logins, saved bookings and a temporary bookings
list at `/admin/`. The full dashboard follows once its design mock is
approved. The plan is in `docs/admin-cms-todo.md`.

## What runs where

- Public pages are still pre-built HTML. They never touch the database.
- `/admin/*` and `/api/*` run on Vercel as server functions (`export const prerender = false`).
- Data lives in Neon Postgres. The schema is `src/server/db/schema.ts`; migrations are in `drizzle/`.
- Logins use Better Auth (`src/server/auth.ts`): username and password, roles `admin` and `staff`, optional two-factor.
- Each booking gets a reference such as `BAT-7K2Q9M`. It goes in the WhatsApp message and is saved by `POST /api/bookings/`.

## Going live on Vercel (one time)

1. **Vercel plan.** Everything here runs on the free Hobby plan. Vercel's terms, though, limit Hobby to personal, non-commercial use, and a booking website is commercial, so Vercel can ask for an upgrade or pause the project. Moving to Pro is the owner's call.
2. **Neon.** In the Vercel project, open Storage, create a Neon Postgres database and connect it to Production and Preview. Turn on a database branch per preview deployment. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` by itself.
3. **Environment variables** (Project Settings, Environment Variables):

   | Name | Value | Environments |
   | --- | --- | --- |
   | `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | All |
   | `BETTER_AUTH_URL` | `https://bagdograairporttaxi.com` | Production only |
   | `SETUP_TOKEN` | output of `openssl rand -hex 16` | Production, remove after step 5 |
   | `RESEND_API_KEY` | from resend.com, optional | All |
   | `MAIL_FROM` | `Bagdogra Airport Taxi <bookings@bagdograairporttaxi.com>` | All |
   | `BOOKING_EMAIL_TO` | optional, defaults to the email shown on the site | All |

4. **Deploy.** The build runs the database migrations by itself before the site goes live.
5. **Create the admin.** Open `https://bagdograairporttaxi.com/admin/setup/`, enter the `SETUP_TOKEN`, choose a username and password. Write down the 8 recovery codes it shows: they are the only way back in without the password. Then delete `SETUP_TOKEN` from Vercel. The page closes for good once an account exists.
6. **Two-factor.** Sign in, open My account and set up two-factor login with Google Authenticator or a similar app. Keep its backup codes with the recovery codes.
7. **Staff.** Open Team, add the staff member with a username and a password, and give them the password in person. Switch on "can record payments" only if they should.
8. **Booking emails.** In Resend, add the domain `bagdograairporttaxi.com` and the DNS records it lists at the domain registrar. Until then bookings are still saved and WhatsApp still opens; only the backup email is skipped.
9. **Test.** Make a booking on `/book/`, press Confirm on WhatsApp, and check it appears at `/admin/` with the same `BAT-` reference as the WhatsApp message.

Check on the first deploy that the old `.php` redirects in `vercel.json` and the security headers still apply now that the site uses the Vercel adapter, for example that `/about.php` redirects to `/about/`.

## If a password is lost

- **Staff:** the admin sets a new one on the Team page.
- **Admin:** use a recovery code at `/admin/recover/`. Each code works once; make new ones on My account.
- After 8 wrong passwords in 15 minutes a username is locked for 15 minutes. A password reset clears the lock.

## Local development

```sh
cp .env.example .env          # then fill in BETTER_AUTH_SECRET and SETUP_TOKEN
npm run db:local              # local Postgres (PGlite) on port 5433; keep this terminal open while using /admin/
# in .env: DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable
#          DATABASE_POOL_MAX=1
npm run db:migrate
npm run dev                   # then open http://localhost:4321/admin/setup/
```

After changing `src/server/db/schema.ts`, run `npm run db:generate` to write a new migration, commit it, and run `npm run db:migrate`.
