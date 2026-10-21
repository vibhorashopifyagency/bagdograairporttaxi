# Admin, live editing and bookings dashboard: plan and todo list

Status: plan agreed and every open question settled on 21 October 2026. Built on 21 October 2026: the design mock, Phase 0 code, Phase 1 and Phase 2, then the dashboard shell and home screen to the mock (sidebar, phone tab bar, today board at /admin/, bookings list at /admin/bookings/, new booking by hand at /admin/bookings/new/). Not yet deployed. Going-live steps are in docs/admin-setup.md.

## Decisions taken by the owner

- The admin edits everything: page text, images, fares, packages, guides, business details and policies.
- The admin and assigned staff can view and manage bookings and customer data.
- Every booking is saved to a database. The WhatsApp message to the office still goes out every time.
- Database: Neon Postgres, added through the Vercel Marketplace. "Vercel Postgres" is now Neon, so these are the same thing.
- Hosting: Vercel.
- Accounts at the start: one admin and one staff member.
- Login: username and password.
- Staff can see all bookings, not only the ones assigned to them.
- Backup email for each new booking goes to the address shown on the site, currently bagdograairporttaxi@gmail.com. If the admin changes that address in business details, the emails follow it.
- Customer details are kept for 24 months after the trip, then removed.
- There is no payment gateway. Customers pay by the office's UPI QR code or in cash.
- The admin can mark payments directly. Staff can mark payments only with the admin's permission.
- That permission is a switch the admin turns on for each staff member, not an approval of each payment.
- Payment totals stay after the 24 months, without the customer's name and number, so the accounts stay complete.
- The dashboard must feel modern, upbeat and motivating, carry the business's brand, and be genuinely useful day to day. It must not look like a plain old admin panel.
- Admin and staff can send a customer their itinerary, with text and images, to the customer's WhatsApp from a button in the dashboard. The button opens a popup to fill in trip details, the day-by-day plan, a message and images.

## What this means for the build

The site is static today, with all content in TypeScript files and no server. Bookings and staff logins need a server and a database, so the plan is one custom admin on Neon instead of a git-based CMS. One login, one dashboard, for content and bookings alike.

- **Public pages stay fast.** They are still pre-built HTML, served from Vercel's cache. When the admin publishes a change, only the affected pages are rebuilt in the background, in seconds, with no full redeploy (Vercel on-demand revalidation).
- **`/admin/` and `/api/` run on the server.** They are never cached and never indexed.
- **Content moves into Neon.** The current data types are kept and every save is validated, so a bad edit cannot reach the live site.
- **Images go to Vercel Blob storage.** Uploads are resized to the widths the site already uses.
- **Live editing works like Wix.** The admin opens any page in edit mode, clicks text to change it and clicks an image to replace it. Edit mode is a separate uncached preview, so public pages carry no admin code.

## Things to know before starting

- **Vercel Pro is a terms question, not a technical one.** Everything works on the free Hobby plan. Vercel's terms limit Hobby to personal, non-commercial use, so a business site there can be asked to upgrade or be paused. Pro is charged per team member per month. The owner decides when.
- **Neon's free tier should be enough at first.** Bookings and content are small. Upgrade only if storage or traffic grows.
- **Customer data brings legal duties.** India's Digital Personal Data Protection Act 2023 applies to names and mobile numbers. The plan covers a consent line on the form, a retention period, an access log and delete-on-request.
- **WhatsApp must open in the same click.** Browsers block pop-ups opened after a network wait. So WhatsApp opens instantly and the database save runs alongside it, not before it.
- **A plain WhatsApp link cannot carry images.** The free "click to chat" link only fills in text. Images can reach the chat in two ways: as a link to a private itinerary page that shows them, or sent directly through Meta's paid WhatsApp Business Platform. The itinerary section below uses the free way first.
- **Sending email needs the domain set up.** Emails can arrive at the Gmail address, but they must be sent from an address on bagdograairporttaxi.com through a sending service such as Resend. That means adding a few DNS records at the domain registrar.

## Dashboard look and feel

The dashboard should feel like the business: mountains, roads, a veteran-run team that takes care of people. It should be a place staff enjoy opening, and every screen should help close a booking or run a trip.

**Brand**
- [x] Use the site's own palette: ink, lime and white, with the Bricolage font for headings and Inter for text.
- [x] Put the Jai Jawan badge logo and the line "Your journey, our responsibility" in the sidebar.
- [ ] Use the site's mountain and road photos in headers and empty screens, never stock icons on grey. *(Built for the home screen greeting; empty screens still plain cards.)*
- [ ] Light mode by default, with a dark mode for night shifts.

**Upbeat and motivating**
- [x] A greeting by name and time of day, such as "Good morning, Pinku", with today's weather in Bagdogra and Darjeeling. *(Built, with Bagdogra, Darjeeling and Gangtok from Open-Meteo, cached 30 minutes.)*
- [x] A monthly goal set by the admin, for bookings and for money collected, shown as a progress ring that fills as the month goes on. *(Built: the admin sets trips and a fares target on the home screen. Until payments can be recorded it counts confirmed fares, not money collected.)*
- [ ] A small celebration when a booking is confirmed or fully paid, and a "wins this week" strip. *(The wins this week strip is built; the celebration is not.)*
- [x] The newest five-star Google review on the home screen, as a reminder of why the work matters. *(Built: a different five-star review each day from the ones already on the site. The site's review file has no exact dates, so it is not strictly the newest.)*
- [x] Friendly wording everywhere, for example "No pickups left today. Time for chai." when the list is empty.

**Useful first**
- [x] The home screen is a "today board": today's and tomorrow's pickups as cards with time, place, driver and payment state.
- [x] New bookings not yet answered show how long they have waited, and turn amber, then red.
- [ ] Payments due and balances to collect, with one tap to send the QR code. *(Balances and a WhatsApp reminder are built; the QR code waits for Phase 3b.)*
- [ ] Quick actions always in reach: new booking, send itinerary, record payment, send QR code. *(New booking works; the other three show as "Coming next" until their phases are built.)*
- [ ] Search across bookings and customers from anywhere, with a keyboard shortcut on a laptop. *(Bookings search sits in the top bar on every page, with Ctrl K or ⌘K; customers come with the customer page.)*

**Built for the phone**
- [x] On a phone, a bottom tab bar, large tap targets and screens that work one-handed.
- [ ] Popups open as full-screen sheets on a phone.
- [ ] The dashboard installs to the home screen like an app.

**Approval before building**
- [x] Mock the dashboard home screen and the itinerary popup, at phone and laptop size, and get the owner's yes before any dashboard code is written. *(Mock published on 21 October 2026: https://claude.ai/artifact/Cu63my3bhrhAk4apHDoFLS.)* *(On 21 October 2026 the owner asked for the admin to match the mock, and the home screen, shell and bookings list were built to it the same day.)*

## Phase 0: foundation

- [ ] Connect the GitHub repository to Vercel. Upgrade to Pro when the owner decides (see above).
- [ ] Add Neon from the Vercel Marketplace, with separate database branches for production and preview deployments.
- [x] Add the Vercel adapter to Astro: public pages pre-rendered, admin and API routes server-rendered.
- [x] Add Drizzle ORM with versioned migrations, and Zod schemas built from the existing data types.
- [ ] Add Vercel Blob storage for uploaded images.
- [x] Store secrets as Vercel environment variables only, never in the repository.
- [ ] Set up a staging site on a preview branch that uses its own database branch.

## Phase 1: logins and roles

- [x] Add authentication with Better Auth: username and password, passwords hashed, sessions stored in Neon.
- [ ] Create the first two accounts: one admin, one staff. *(Built: /admin/setup/ for the admin, the Team page for staff. The owner creates them after deploy.)*
- [x] Two roles. **Admin** can do everything, including managing staff and business details. **Staff** can view and manage all bookings and customers, but cannot edit content, business details or policies.
- [x] A per-staff permission switch, "can record payments", off by default and changed only by the admin.
- [x] Admin can add, deactivate and reset staff accounts, and set a new password for staff.
- [x] Admin password recovery without email login: one-time recovery codes created at setup and kept offline.
- [x] Two-factor login with an authenticator app recommended for the admin, optional for staff.
- [x] Rate-limit the login page and lock an account after repeated failed attempts.
- [x] Log every sign-in and every view or change of customer data, with who and when. *(Sign-ins, failed sign-ins, team changes and every opening of the bookings list are logged; new screens must add their own entries.)*

## Phase 2: bookings saved to the database (first visible win)

This phase can go live before content editing is built.

- [x] Give each booking a short reference such as BAT-7K2Q9M, created in the browser.
- [x] Put the reference in the WhatsApp message so staff can match a chat to a record.
- [x] On "Confirm on WhatsApp", open WhatsApp immediately and send the booking to the API in the same click.
- [x] If the save fails, keep the booking in the browser and retry on the next visit, so no booking is lost.
- [ ] Save the booking the same way when a customer scans the QR code to pay first, so those bookings are recorded too. *(The payment button already saves the booking; the QR code itself comes in Phase 3b.)*
- [x] Re-check the fare on the server so a tampered price is flagged.
- [x] Spam protection: hidden honeypot field, rate limit per phone and IP. *(Cloudflare Turnstile left out until spam actually appears.)*
- [x] Add a consent line on the form that links to the privacy policy.
- [x] Save a customer record keyed by mobile number, so repeat customers are recognised.
- [x] Email each new booking to the address in business details, currently bagdograairporttaxi@gmail.com, as a backup to WhatsApp. *(Needs a Resend account and DNS records; see docs/admin-setup.md.)*

## Phase 3: bookings and customers dashboard

- [ ] Bookings list showing all bookings to both admin and staff, with filters by status, date, route, package and payment state, plus search by name, phone or reference. *(Built at /admin/bookings/ with search and a status filter; date, route, package and payment filters still to do.)*
- [x] Statuses: new, contacted, confirmed, driver assigned, completed, cancelled, no-show. *(Changed from the menu on each booking in the list, or by pressing Reply on the home screen.)*
- [ ] Booking detail page: trip, fare, payment state, notes and a timeline of every change.
- [ ] Optional "handled by" field on a booking, useful once there is more than one staff member.
- [ ] Add a driver name, vehicle number and driver phone to a confirmed booking.
- [x] One-tap buttons to call the customer or open a WhatsApp chat from the booking. *(On the home screen cards and in the bookings list; the booking detail page is still to come.)*
- [ ] Customer page: contact details, all past bookings and notes.
- [x] Staff can create a booking manually for phone and walk-in enquiries. *(Built at /admin/bookings/new/.)*
- [ ] Export bookings and payments to CSV for accounts.
- [x] Dashboard home: today's pickups, new bookings, payments due, this week's numbers, top routes and packages.

## Phase 3b: payments by UPI QR code and cash

There is no payment gateway, so payments are recorded by hand.

- [ ] Store the office's UPI QR code image and UPI ID in business details, editable by the admin.
- [ ] Show the QR code on the booking page in place of the current payment-link button, with the advance amount to pay.
- [ ] A "send QR code" button on each booking that opens WhatsApp to the customer with the amount and the UPI ID.
- [ ] Record each payment on the booking: amount, method (UPI or cash), date, who received it, UPI transaction reference, optional screenshot.
- [ ] Payment state per booking: unpaid, advance paid, fully paid, refunded. It is worked out from the recorded payments, not typed in.
- [ ] Admin records and edits payments directly.
- [ ] Staff can record a payment only when the admin has switched on "can record payments" for them. Without it, the payment controls are hidden.
- [ ] Every payment change is logged with who made it and when, and cannot be deleted, only reversed by the admin.
- [ ] Refunds recorded by the admin only, following the cancellation policy.

## Phase 3c: send the itinerary to the customer's WhatsApp

A "Send itinerary" button on every booking, and in the quick actions, opens a popup. Admin and staff can both use it.

**Fields in the popup**
- [ ] Customer name and WhatsApp number, filled in from the booking and editable, with the number checked before sending.
- [ ] Trip details: trip title, start and end dates, pickup place and time, drop point, number of travellers.
- [ ] Car and driver: vehicle, vehicle number, driver name and driver phone, filled in from the booking.
- [ ] Day-by-day plan, filled in from the chosen tour package. Each day has a title, details, the hotel and an optional photo. Days can be added, removed and reordered.
- [ ] Inclusions and exclusions, filled in from the package and editable.
- [ ] Payment summary: total, advance paid and balance due, worked out from the recorded payments, with an option to include the UPI QR code.
- [ ] A personal message, with saved templates such as "Welcome", "Day before pickup" and "Thank you for travelling with us".
- [ ] Images: pick from the site's photo library or upload new ones, then reorder them.
- [ ] A live preview of the WhatsApp message and of the itinerary page.

**How it reaches the customer (stage 1, free, works from day one)**
- [ ] On send, create a private itinerary page for that booking: branded, with all the text and images, and easy to save as a PDF. Its link cannot be guessed and it is hidden from search engines.
- [ ] Open a WhatsApp chat to the customer's number with the message and the link already filled in. The sender taps Send once. WhatsApp shows a preview card with the first photo.
- [ ] On a phone, a "Share with photos" button also sends the actual photos and text through the phone's share sheet into the same chat.
- [ ] If the itinerary is edited after sending, the same link shows the new version, and a "Send update" button tells the customer.

**Records**
- [ ] Log every itinerary sent on the booking's timeline, with who sent it, when, and a copy of what was sent.
- [ ] Remove itinerary pages along with the customer's details at 24 months, or earlier if the admin chooses.

## Phase 4: move content into the database

- [ ] Write a one-time import from the TypeScript files to Neon: business details, policies, fares and routes, vehicles, packages, destinations, guides, FAQs, gallery, photo credits and reviews.
- [ ] Change the pages to read from the database at build and revalidation time, with no visible change to the site.
- [ ] Compare the built HTML before and after the move to prove nothing changed.
- [ ] Keep in code: JSON-LD structure, redirects, sitemap rules, security headers and the design.
- [ ] Keep the Google reviews script, and add a "refresh reviews" button for it in the admin.

## Phase 5: content editing in the dashboard

- [ ] A form for each content type, with plain labels, help text and validation.
- [ ] Fares as an editable grid of routes by vehicle.
- [ ] Packages with drag-to-reorder itinerary days, inclusions, exclusions and FAQs.
- [ ] Guides in a rich-text editor.
- [ ] Business details and policies, admin only, with a warning that they show on every page and in Google's data.
- [ ] Image library: upload, crop, automatic resizing, required alt text and credit line, and a "where is this used" list.
- [ ] Draft and publish, with a preview before publishing.
- [ ] Version history for every item, with one-click restore.
- [ ] Update the "fares updated" and "content updated" dates automatically.
- [ ] Before the pre-launch switch can be turned off, block it while any placeholder text remains, as the current build check does.

## Phase 6: live on-page editing

- [ ] "Edit this page" opens any public page in an uncached edit mode for the admin.
- [ ] Click a heading or paragraph to edit it in place. Click an image to replace it from the library or by upload.
- [ ] Changes save as a draft, with a Publish button that rebuilds only that page.
- [ ] Mark each editable spot in the page templates, so edits map to the right database field.
- [ ] Repeated items such as fares, itinerary days and FAQs open the Phase 5 form in a side panel instead.
- [ ] Layout, colours and section order stay locked, so the design cannot be broken.

## Phase 7: privacy, safety and handover

- [x] Update the privacy policy: what is stored, why, for how long and who can see it.
- [ ] Remove names and mobile numbers from bookings 24 months after the trip date, automatically every night. Trip, fare and payment totals stay for the accounts.
- [ ] Customer data export and deletion on request, from the customer page.
- [ ] Daily database backups, which Neon provides, plus a tested restore.
- [ ] Error alerts for failed booking saves.
- [ ] Check the admin works well on a phone, since staff will use it on the road.
- [ ] A short guide for the admin and for staff.

## Phase 8 (optional, later): send directly through the WhatsApp Business Platform

This makes "Send itinerary" deliver the text and images straight from the dashboard, with no WhatsApp window to tap through.

- [ ] Verify the business with Meta and connect a number to the WhatsApp Business Platform. Using the same number as the office's WhatsApp app needs Meta's coexistence setup, which has to be checked for this number.
- [ ] Get message templates approved by Meta for itineraries and reminders. They are needed when the customer has not messaged in the last 24 hours.
- [ ] Budget for Meta's per-message charges on those templates. Replies inside 24 hours of a customer's message are free.
- [ ] Show delivered and read ticks for each itinerary on the booking.
- [ ] Keep the stage 1 link method as the fallback if a direct send fails.

