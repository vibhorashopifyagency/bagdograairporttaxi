# Admin and bookings: setup guide

What is built so far: staff logins, saved bookings, the dashboard at
`/admin/` (today board, bookings with filters and a CSV download, a page per
booking, customers, payments by UPI QR code and cash, drivers, itineraries
sent to WhatsApp, search across bookings and customers, a Help page, dark
mode, and an app that installs to a phone's home screen), the customer's
private trip page at `/trip/...`, the office QR code on `/book/`, and the
nightly removal of customer details after 24 months. Website editing comes
next. The plan is in `docs/admin-cms-todo.md`.

## What runs where

- Public pages are still pre-built HTML. They never touch the database.
- `/admin/*` and `/api/*` run on Vercel as server functions (`export const prerender = false`).
- Data lives in Neon Postgres. The schema is `src/server/db/schema.ts`; migrations are in `drizzle/`.
- Logins use Better Auth (`src/server/auth.ts`): username and password, roles `admin` and `staff`, optional two-factor.
- Each booking gets a reference such as `BAT-7K2Q9M`. It goes in the WhatsApp message and is saved by `POST /api/bookings/`.
- `/trip/<code>/` is the customer's own page for a booking (itinerary, driver, what is paid, the UPI QR code). It runs on the server too, needs no login, is never cached or indexed, and its link is signed with `BETTER_AUTH_SECRET`: changing that secret breaks every trip link already sent. The office QR code picture is served beside it from `/trip/qr/<hash>.png` (or `.jpg`), straight from the database; that address may be cached, because a new picture gets a new address.

## Going live on Vercel (one time)

1. **Vercel plan.** Everything here runs on the free Hobby plan. Vercel's terms, though, limit Hobby to personal, non-commercial use, and a booking website is commercial, so Vercel can ask for an upgrade or pause the project. Moving to Pro is the owner's call.
2. **Neon.** In the Vercel project, open Storage, create a Neon Postgres database in the region nearest India (Singapore) and connect it to Production and Preview. Turn on a database branch per preview deployment. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` by itself. Then, in Project Settings, Functions, set the Function Region to the same city (Singapore, `sin1`). Vercel's default is Washington, and every admin page asks the database several things, so a database on the other side of the world makes each page slow.
   **Blob.** Also in Storage, create a Blob store: region Singapore (`sin1`), access **Private** (it holds payment screenshots, which show customers' names and UPI IDs), the default `BLOB` prefix, and no read-write token. Connecting it adds `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`; the site signs in to it with Vercel's own short-lived tokens. Payment screenshots and itinerary photo uploads use it; they are under Storage, the store, Manage Blobs, in `payments/` and `itinerary/` folders. Deleting one there is safe: the site notices the first time it is asked for (and every night), forgets it, and never shows a broken picture (a payment then offers "Add the screenshot" again). Photos for the public website (website editing, later) will need a second store set to Public, since a store's access cannot change.
3. **Environment variables** (Project Settings, Environment Variables):

   | Name | Value | Environments |
   | --- | --- | --- |
   | `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | All |
   | `BETTER_AUTH_URL` | `https://bagdograairporttaxi.com` (the `….vercel.app` address until step 13) | Production only |
   | `SETUP_TOKEN` | output of `openssl rand -hex 16` | Production, remove after step 5 |
   | `RESEND_API_KEY` | not used for now (step 10) | All |
   | `MAIL_FROM` | `Bagdogra Airport Taxi <bookings@bagdograairporttaxi.com>` | All |
   | `BOOKING_EMAIL_TO` | optional, defaults to the email shown on the site | All |
   | `CRON_SECRET` | output of `openssl rand -hex 32` | Production |

4. **Deploy.** The build runs the database migrations by itself before the site goes live.
5. **Create the admin.** Open `https://bagdograairporttaxi.com/admin/setup/`, enter the `SETUP_TOKEN`, choose a username and password. Write down the 8 recovery codes it shows: they are the only way back in without the password. Then delete `SETUP_TOKEN` from Vercel. The page closes for good once an account exists.
6. **Two-factor.** Sign in, open My account and set up two-factor login with Google Authenticator or a similar app. Keep its backup codes with the recovery codes.
7. **Staff.** Open Team, add the staff member with a username and a password, and give them the password in person. Switch on "can record payments" only if they should.
8. **Drivers.** Open Drivers and add each driver with their phone, car number and pay (a share of the fare or a fixed amount a trip). Drivers already typed on bookings are on the list with their pay not set: set it for each.
9. **UPI QR code.** Open Payments and upload the office QR code picture: the QR image from the bank, PhonePe Business, Paytm for Business or Google Pay for Business app (Share or Download QR), or a clear screenshot of it. The page reads the QR code, says which UPI ID it pays and fills that in; check it, add the name customers should see, and save. Then scan the saved QR code with your own phone and check the payee before sending it to a customer. Customers see the picture exactly as uploaded, so they type the amount themselves; the WhatsApp message and the trip page tell them how much.
10. **Booking emails: not used.** The owner chose on 22 Oct 2026 to keep everything in the dashboard, so Resend is not set up. Bookings are still saved and WhatsApp still opens; only the backup email for each booking and the email alerts are skipped (see Alerts). To turn them on later: in Resend, add the domain `bagdograairporttaxi.com` and the DNS records it lists at the domain registrar, then set `RESEND_API_KEY` and `MAIL_FROM`.
11. **Test.** Make a booking on `/book/`, press Confirm on WhatsApp, and check it appears at `/admin/` with the same `BAT-` reference as the WhatsApp message. Then press Pay advance by UPI on `/book/` and check the office QR code shows with the amount.
12. **Nightly clean-up.** `vercel.json` runs `/api/cron/retention/` every night at 02:00 India time; Vercel sends `CRON_SECRET` with it. It removes customer names, numbers, addresses and notes 24 months after the trip (fares and payments stay) and old access-log rows. The Team page says when it last ran. Without `CRON_SECRET` it refuses to run, and the Team page says so. To try it at once, open Project Settings, Cron Jobs, and press Run. It runs only on the production deployment.
13. **Move the domain, last.** Steps 1 to 12 work on the `….vercel.app` address while the old site stays on the domain. Once tested, add `bagdograairporttaxi.com` and `www.bagdograairporttaxi.com` in Project Settings, Domains. Vercel shows one A record and one CNAME: change only those two where the domain's DNS is managed (the company the domain is renewed with). Do not move the nameservers to Vercel, which would drop any email set up on the domain. Then set `BETTER_AUTH_URL` to `https://bagdograairporttaxi.com` and redeploy.

Check on the first deploy that the old `.php` redirects in `vercel.json` and the security headers still apply now that the site uses the Vercel adapter, for example that `/about.php` redirects to `/about/`.

## Alerts

Without Resend (step 10) nothing is emailed; everything shows in the dashboard or the Vercel logs (Project, Logs, search `[alert]`).

- **A booking while the database is down.** The dashboard cannot show it at that moment, because it needs the database too. The customer's WhatsApp message still reaches the office as usual, and their browser sends the booking again on their next visit; it then shows on its timeline as "reached us … late". With Resend set up, the office would also be emailed the booking at once.
- **The nightly clean-up.** The Team page shows when it last ran, and turns red when it has not run for a day and a half or when trips are past the date and still waiting.

## Backups

- **Neon's own.** Neon keeps the database's history and can restore it to a moment in the past: in the Neon console open the project, Branches, then Restore. How far back depends on the Neon plan (hours on the free plan, days on paid ones), so check it in Neon's settings.
- **Your own copy.** Once a week, or before any big change, run `npm run db:backup` with `DATABASE_URL` set to the production `DATABASE_URL_UNPOOLED` from Vercel. It writes `backups/backup-<date>.json.gz` (ignored by git). It holds customer names and numbers: keep it in a safe place, never in a shared folder, and delete copies older than 24 months.
- **Pictures.** Payment screenshots and uploaded itinerary photos are in the Blob store, not in the database, so the backup file lists them but does not contain them. Vercel Blob keeps its own copies (it runs on Amazon S3).
- **Restoring your copy.** Create a new empty database (a new Neon branch), set `DATABASE_URL` to it, run `npm run db:migrate`, then `npm run db:restore -- backups/backup-<date>.json.gz`. It refuses a database that already has data. Point Vercel at the new database and redeploy; everyone signs in again. Tested on 22 Oct 2026: a backup restored into an empty database came back identical, table for table.

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
npm run db:seed               # optional: made-up bookings, customers and payments around today's date
```

Uploaded pictures (payment screenshots, itinerary photos) go to the `.local-files` folder on this computer, ignored by git, since there is no Blob store locally.

`npm run db:seed` only writes to a database on this computer. Run it again for a fresh set dated around the new day; `npm run db:seed -- --remove` takes the dummy data out again (it also sets the monthly goal, which stays).

After changing `src/server/db/schema.ts`, run `npm run db:generate` to write a new migration, commit it, and run `npm run db:migrate`.
