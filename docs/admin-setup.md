# Admin and bookings: setup guide

What is built so far: staff logins, saved bookings, the dashboard at
`/admin/` (today board, bookings, a page per booking, customers, payments by
UPI QR code and cash, itineraries sent to WhatsApp) and the customer's
private trip page at `/trip/...`. Website editing comes next. The plan is in
`docs/admin-cms-todo.md`.

## What runs where

- Public pages are still pre-built HTML. They never touch the database.
- `/admin/*` and `/api/*` run on Vercel as server functions (`export const prerender = false`).
- Data lives in Neon Postgres. The schema is `src/server/db/schema.ts`; migrations are in `drizzle/`.
- Logins use Better Auth (`src/server/auth.ts`): username and password, roles `admin` and `staff`, optional two-factor.
- Each booking gets a reference such as `BAT-7K2Q9M`. It goes in the WhatsApp message and is saved by `POST /api/bookings/`.
- `/trip/<code>/` is the customer's own page for a booking (itinerary, driver, what is paid, the UPI QR code). It runs on the server too, needs no login, is never cached or indexed, and its link is signed with `BETTER_AUTH_SECRET`: changing that secret breaks every trip link already sent. The office QR code picture is served beside it from `/trip/qr/<hash>.png` (or `.jpg`), straight from the database; that address may be cached, because a new picture gets a new address.

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
8. **Drivers.** Open Drivers and add each driver with their phone, car number and pay (a share of the fare or a fixed amount a trip). Drivers already typed on bookings are on the list with their pay not set: set it for each.
9. **UPI QR code.** Open Payments and upload the office QR code picture: the QR image from the bank, PhonePe Business, Paytm for Business or Google Pay for Business app (Share or Download QR), or a clear screenshot of it. The page reads the QR code, says which UPI ID it pays and fills that in; check it, add the name customers should see, and save. Then scan the saved QR code with your own phone and check the payee before sending it to a customer. Customers see the picture exactly as uploaded, so they type the amount themselves; the WhatsApp message and the trip page tell them how much.
10. **Booking emails.** In Resend, add the domain `bagdograairporttaxi.com` and the DNS records it lists at the domain registrar. Until then bookings are still saved and WhatsApp still opens; only the backup email is skipped.
11. **Test.** Make a booking on `/book/`, press Confirm on WhatsApp, and check it appears at `/admin/` with the same `BAT-` reference as the WhatsApp message.

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
npm run db:seed               # optional: made-up bookings, customers and payments around today's date
```

`npm run db:seed` only writes to a database on this computer. Run it again for a fresh set dated around the new day; `npm run db:seed -- --remove` takes the dummy data out again (it also sets the monthly goal, which stays).

After changing `src/server/db/schema.ts`, run `npm run db:generate` to write a new migration, commit it, and run `npm run db:migrate`.
