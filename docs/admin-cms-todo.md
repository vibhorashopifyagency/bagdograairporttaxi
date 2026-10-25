# Admin, live editing and bookings dashboard: plan and todo list

Status: plan agreed and every open question settled on 21 October 2026. Phase 4 built on 22 October 2026 (website content can now come from the database; see Phase 4 for how it differs from the first plan); Phases 5 and 6 built the same day (Business details, Fares and packages, Photos, Edit pages), not yet committed. Also on 22 October 2026: live on bagdograairporttaxi.vercel.app (the domain still serves the old site), payment screenshots and itinerary photo uploads in a private Vercel Blob store, bookings filters by trip and payment and a bookings CSV, search across bookings and customers, the office UPI QR code on /book/, photo empty screens, dark mode, the installable app, the nightly 24-month clean-up, customer data download and removal, failed-save alerts, backup and restore scripts, the phone check and the Help page. Built on 21 October 2026: the design mock, Phase 0 code, Phase 1 and Phase 2, then the dashboard shell and home screen to the mock (sidebar, phone tab bar, today board at /admin/, bookings list at /admin/bookings/, new booking by hand at /admin/bookings/new/). Later the same day: a page for each booking (/admin/bookings/BAT-.../), payments by UPI QR code and cash (Phase 3b, /admin/payments/), the Send itinerary popup with the customer's private trip page (Phase 3c stage 1, /trip/...), the itineraries list and the customers pages. Going-live steps are in docs/admin-setup.md.

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

- **Public pages stay fast.** They are still pre-built HTML, served from Vercel's cache, and never wait on the database. When the admin publishes, the dashboard starts a new deploy through a Vercel deploy hook, and the whole site is rebuilt with the published content. *(Changed on 22 October 2026 from the first plan, which rebuilt only the affected pages in seconds with on-demand revalidation. That would have turned every public page into a server page, lost the build checks (verify-build, the Google audit, the sitemap) and made each page depend on the database at first view. The whole site builds in about 5 seconds, so a publish is live in about a minute instead of seconds.)*
- **`/admin/` and `/api/` run on the server.** They are never cached and never indexed.
- **Content edits live in Neon.** The code in `src/data/` stays the starting copy; the database holds what the admin has changed, added or removed, and the build lays it over the code. The current data types are kept and every save is validated, so a bad edit cannot reach the live site.
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
- [x] Use the site's mountain and road photos in headers and empty screens, never stock icons on grey. *(Every empty list, the search page and the today board show one of the site's own photos beside the message, src/components/admin/EmptyState.astro. The "silk-route" photo carries another company's watermark, "Adorable Silkroute", so the admin does not use it; it is still used on the public site.)*
- [x] Light mode by default, with a dark mode for night shifts. *(Built 22 Oct 2026: the moon button in the sidebar (More on a phone) or My account, which also offers "Match this device". Remembered per device in a cookie; src/styles/admin-dark.css.)*

**Upbeat and motivating**
- [x] A greeting by name and time of day, such as "Good morning, Pinku", with today's weather in Bagdogra and Darjeeling. *(Built, with Bagdogra, Darjeeling and Gangtok from Open-Meteo, cached 30 minutes.)*
- [x] A monthly goal set by the admin, for bookings and for money collected, shown as a progress ring that fills as the month goes on. *(Built: the admin sets trips and a fares target on the home screen. Until payments can be recorded it counts confirmed fares, not money collected.)*
- [x] A small celebration when a booking is confirmed or fully paid, and a "wins this week" strip. *(A "Fully paid. Nice work" banner on the booking after the last payment, and "Confirmed. Nice one." when a booking is confirmed from its page.)*
- [x] The newest five-star Google review on the home screen, as a reminder of why the work matters. *(Built: a different five-star review each day from the ones already on the site. The site's review file has no exact dates, so it is not strictly the newest.)*
- [x] Friendly wording everywhere, for example "No pickups left today. Time for chai." when the list is empty.

**Useful first**
- [x] The home screen is a "today board": today's and tomorrow's pickups as cards with time, place, driver and payment state.
- [x] New bookings not yet answered show how long they have waited, and turn amber, then red.
- [x] Payments due and balances to collect, with one tap to send the QR code. *(On the today board and the Payments page; each balance opens the booking with the QR popup.)*
- [x] Quick actions always in reach: new booking, send itinerary, record payment, send QR code. *(The last three ask which booking first, then open its popup.)*
- [x] Search across bookings and customers from anywhere, with a keyboard shortcut on a laptop. *(The top search box lists matching bookings and customers as you type, with arrow keys and Enter; Ctrl K or ⌘K jumps to it; Enter opens /admin/search/ with both lists. On the bookings list it narrows that list instead. Searches are logged.)*

**Built for the phone**
- [x] On a phone, a bottom tab bar, large tap targets and screens that work one-handed.
- [x] Popups open as full-screen sheets on a phone.
- [x] The dashboard installs to the home screen like an app. *(public/admin.webmanifest, scoped to /admin/, with "Install the app" on My account and iPhone instructions. Its service worker only shows a "No connection" page offline and never stores pages, so no customer data stays on the phone.)*

**Approval before building**
- [x] Mock the dashboard home screen and the itinerary popup, at phone and laptop size, and get the owner's yes before any dashboard code is written. *(Mock published on 21 October 2026: https://claude.ai/artifact/Cu63my3bhrhAk4apHDoFLS.)* *(On 21 October 2026 the owner asked for the admin to match the mock, and the home screen, shell and bookings list were built to it the same day.)*

## Phase 0: foundation

- [x] Connect the GitHub repository to Vercel. Upgrade to Pro when the owner decides (see above). *(Owner, 22 Oct 2026: bagdograairporttaxi.vercel.app on Hobby, functions in Singapore.)*
- [x] Add Neon from the Vercel Marketplace, with separate database branches for production and preview deployments. *(Connected by the owner on 22 Oct 2026; preview branches not yet confirmed.)*
- [x] Add the Vercel adapter to Astro: public pages pre-rendered, admin and API routes server-rendered.
- [x] Add Drizzle ORM with versioned migrations, and Zod schemas built from the existing data types.
- [x] Add Vercel Blob storage for uploaded images. *(Owner, 22 Oct 2026: a private store in Singapore, connected with Vercel's own short-lived tokens, no read-write token. Pictures are served only through /admin/files/ and signed /trip/photo/ addresses; src/server/files.ts. Photos for the public website use the same store: the build reads them and makes the website's own files, so no public store was needed.)*
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
- [x] Save the booking the same way when a customer scans the QR code to pay first, so those bookings are recorded too. *(Pay advance by UPI on /book/ saves the booking, then shows the QR code.)*
- [x] Re-check the fare on the server so a tampered price is flagged.
- [x] Spam protection: hidden honeypot field, rate limit per phone and IP. *(Cloudflare Turnstile left out until spam actually appears.)*
- [x] Add a consent line on the form that links to the privacy policy.
- [x] Save a customer record keyed by mobile number, so repeat customers are recognised.
- [x] Email each new booking to the address in business details, currently bagdograairporttaxi@gmail.com, as a backup to WhatsApp. *(Built, but switched off: the owner chose on 22 Oct 2026 to keep everything in the dashboard and not set up Resend. It starts working if RESEND_API_KEY and MAIL_FROM are ever set.)*

## Phase 3: bookings and customers dashboard

- [x] Bookings list showing all bookings to both admin and staff, with filters by status, date, route, package and payment state, plus search by name, phone or reference. *(Trip filter: all taxi, all packages, or one route or package; Payment filter: no payment, part of the advance, advance paid, fully paid, refunded. src/server/booking-filters.ts.)*
- [x] Statuses: new, contacted, confirmed, driver assigned, completed, cancelled, no-show. *(Changed from the menu on each booking in the list, or by pressing Reply on the home screen.)*
- [x] Booking detail page: trip, fare, payment state, notes and a timeline of every change. *(At /admin/bookings/BAT-.../; every edit, payment, reversal, QR code and itinerary sent is on the timeline.)*
- [x] Optional "handled by" field on a booking, useful once there is more than one staff member. *(In Edit trip and driver on the booking.)*
- [x] Add a driver name, vehicle number and driver phone to a confirmed booking. *(Naming a driver on a confirmed booking moves it to "Driver assigned".)*
- [x] One-tap buttons to call the customer or open a WhatsApp chat from the booking. *(On the home screen cards, the bookings list and each booking's page.)*
- [x] Customer page: contact details, all past bookings and notes. *(At /admin/customers/, with search; notes are shared by the team.)*
- [x] Staff can create a booking manually for phone and walk-in enquiries. *(Built at /admin/bookings/new/.)*
- [x] Export bookings and payments to CSV for accounts. *(Both admin only and logged. The bookings file follows every filter on screen and carries paid, due and the payment state.)*
- [x] Dashboard home: today's pickups, new bookings, payments due, this week's numbers, top routes and packages.

## Phase 3b: payments by UPI QR code and cash

There is no payment gateway, so payments are recorded by hand.

- [x] Store the office's UPI QR code image and UPI ID in business details, editable by the admin. *(Owner's decision, 21 Oct 2026: the admin uploads the QR code picture on the Payments page, and it is shown and sent exactly as uploaded. The page reads the picture in the browser (UPI and Bharat QR codes), shows which UPI ID it pays and fills that in; a QR code that is not a UPI payment code, or a UPI ID that differs from the one in the picture, is refused. The picture is kept in the database (one small file needs no file storage). It carries no amount, so customers type it; the message and trip page say how much. The earlier version, which made a QR code from the UPI ID with the amount inside, is gone. Only the admin adds, changes or removes it (owner, 21 Oct 2026), checked on the server from the database; staff see it and send it but get a refusal if they try to change it. Removing it needs a confirmation and is kept in the audit log.)*
- [x] Show the QR code on the booking page in place of the current payment-link button, with the advance amount to pay. *(22 Oct 2026: "Pay advance by UPI" opens the office QR code with the advance, the UPI ID with a Copy button, "Pay with a UPI app" on phones, and "I have paid: send it on WhatsApp". Tour packages are priced "from", so for them the button is hidden and the advance is asked for on WhatsApp. The site's wording about cards, net banking and a payment gateway was corrected to UPI, which also changed the FAQ, the structured data and llms.txt.)*
- [x] A "send QR code" button on each booking that opens WhatsApp to the customer with the amount and the UPI ID. *(The message also links to the trip page, which shows the office QR code and the amount to enter. "Share QR image" on a phone sends the QR code picture with the amount under it; on a laptop the same picture downloads, ready to drop into WhatsApp Web.)*
- [x] Record each payment on the booking: amount, method (UPI or cash), date, who received it, UPI transaction reference, optional screenshot. *(A payment larger than the balance is refused. Screenshots since 22 Oct 2026: chosen in Record payment (or "Add the screenshot" afterwards), shrunk to a JPEG in the browser, kept in Blob; the 24-month clean-up and "Remove their details" delete the file too, and the nightly job deletes screenshots never attached after a day.)*
- [x] Payment state per booking: unpaid, advance paid, fully paid, refunded. It is worked out from the recorded payments, not typed in. *(The advance is 20% of the agreed fare, so changing the fare moves it too.)*
- [x] Admin records and edits payments directly. *(Edits are reversals, as below.)*
- [x] Staff can record a payment only when the admin has switched on "can record payments" for them. Without it, the payment controls are hidden. *(Checked on the server on every payment, so switching it off works at once.)*
- [x] Every payment change is logged with who made it and when, and cannot be deleted, only reversed by the admin. *(A reversal needs a reason; the original stays, crossed out.)*
- [x] Refunds recorded by the admin only, following the cancellation policy.

## Phase 3c: send the itinerary to the customer's WhatsApp

A "Send itinerary" button on every booking, and in the quick actions, opens a popup. Admin and staff can both use it.

**Fields in the popup**
- [x] Customer name and WhatsApp number, filled in from the booking and editable, with the number checked before sending.
- [x] Trip details: trip title, start and end dates, pickup place and time, drop point, number of travellers.
- [x] Car and driver: vehicle, vehicle number, driver name and driver phone, filled in from the booking.
- [x] Day-by-day plan, filled in from the chosen tour package. Each day has a title, details, the hotel and an optional photo. Days can be added, removed and reordered. *(A taxi booking gets one day from its route. Photos are guessed from the places each day names. Reordering is by Move up and Move down, not dragging.)*
- [x] Inclusions and exclusions, filled in from the package and editable.
- [x] Payment summary: total, advance paid and balance due, worked out from the recorded payments, with an option to include the UPI QR code.
- [x] A personal message, with saved templates such as "Welcome", "Day before pickup" and "Thank you for travelling with us". *("Save as template" turns the names and times back into blanks, so a saved template works for the next customer. Saved templates are shared by the team.)*
- [x] Images: pick from the site's photo library or upload new ones, then reorder them. *(Picking and uploading work (uploads since 22 Oct 2026, shown to the customer through signed addresses, deleted with the booking's data, or by the nightly job once no itinerary uses it). Reordering since 23 Oct 2026: arrows on each photo, which work on a phone, or drag with a mouse; the first photo is marked as the cover of the trip page and the link preview.)*
- [x] A live preview of the WhatsApp message and of the itinerary page.

**How it reaches the customer (stage 1, free, works from day one)**
- [x] On send, create a private itinerary page for that booking: branded, with all the text and images, and easy to save as a PDF. Its link cannot be guessed and it is hidden from search engines. *(/trip/ plus the reference and a 10-letter code signed with the site's secret. Never cached; noindex.)*
- [x] Open a WhatsApp chat to the customer's number with the message and the link already filled in. The sender taps Send once. WhatsApp shows a preview card with the first photo.
- [x] On a phone, a "Share with photos" button also sends the actual photos and text through the phone's share sheet into the same chat. *(The share sheet cannot pick the chat by itself, so the sender chooses the customer in WhatsApp.)*
- [x] If the itinerary is edited after sending, the same link shows the new version, and a "Send update" button tells the customer.
- [x] Open an itinerary again later, and delete one. *(Closing the popup keeps a draft; "Open itinerary" on the booking and "Open" on the Itineraries page reopen it. Delete asks first and is noted on the booking's timeline; the customer's link then shows only the booking and payment.)* *(Edits stay a draft until Send update, so the customer never sees a half-finished change.)*

**Records**
- [x] Log every itinerary sent on the booking's timeline, with who sent it, when, and a copy of what was sent. *(The last version sent is kept in full; earlier versions are counted, not kept.)*
- [x] Remove itinerary pages along with the customer's details at 24 months, or earlier if the admin chooses. *(Part of the nightly clean-up and of removing a customer on request.)*

## Phase 3d: drivers and what we pay them

Asked for by the owner on 21 October 2026. The office pays its drivers for each trip: a share of the agreed fare or a fixed amount, set per driver.

How customers pay (owner, 21 October 2026, evening): the office takes the advance; after the trip the driver collects the rest from the guest and hands it to the office. This replaced the earlier "drivers never collect money".

- [x] A Drivers page to add, change and remove drivers: name, phone, car number, usual car, pay and notes. *(/admin/drivers/. A driver with trips or payouts is switched off rather than deleted, so the accounts stay complete, and can be put back.)*
- [x] Pick the driver from the list on a booking (Edit trip and driver), with "Add a new driver" in the same list. *(Drivers typed on bookings before the list existed were turned into list entries by the migration, with their pay not set.)*
- [x] Pick or take off the driver in the itinerary popup; it changes the booking too.
- [x] What each trip earns its driver, worked out from their pay when they are put on the booking and shown on it. Only the admin sets a driver's pay or changes a trip's amount.
- [x] A running account per driver: each completed trip adds what it earned, each payout (UPI, cash or bank transfer) takes it off, and the balance owed is always shown. Payouts are recorded by the admin, or by staff with "can record payments"; only the admin reverses one, and both entries stay.
- [x] Record the balance as collected by the driver: "Who received it" on Record payment (the office, or the booking's driver), filled in with the driver, the balance and cash from the pickup day on, with a "Raju collected ₹2,800" button on the booking. *(Migration 0004 adds payments.driver_id. A reversal carries the driver too.)*
- [x] Each driver's page shows the cash from guests they hold for the office, the pay owed to them, and the two netted ("We pay ₹3,440" or "They give ₹1,200"). "Received from Raju" records a handover; "Pay Raju" a payout. Kept apart because the driver hands over everything and is paid separately; netting is still possible by recording both.
- [x] The Payments page shows "With drivers" (cash collected and not handed over, per driver), the drivers' share of "Still to collect", and who collected each payment; the CSV has a "Collected by driver" column. The drivers list shows what each holds and is owed.
- [x] The today board and Payments page mark a balance "Raju collects after the trip", with no reminder to the guest, and once the pickup has passed ask "did Raju collect it?" with a Record button.
- [x] The customer's trip page, the itinerary popup and its WhatsApp message say "pay your driver after the trip" once the advance is in, and the office QR code is left off (it still shows when staff send a QR link with an amount).
- [x] The public website already says the taxi balance is paid to the driver after the trip (FAQ, Terms, booking page, llms.txt), so it stays as it is.
- [ ] Tour packages: the package pages promise "the balance is due before the trip starts", so packages keep the balance with the office for now. If the owner says packages also pay the driver, change `driverCollectsBalance` in src/server/fares.ts and the package page wording.

## Phase 4: move content into the database

Built on 22 October 2026. Instead of copying everything into the database once, the database holds only what the admin changes: the code in `src/data/` stays the starting copy, and each item edited, added or removed in the dashboard replaces it. Nothing has to be imported, nothing can drift during an import, and anything the admin never touches still follows the code. Once the admin edits an item, changes to it in the code no longer reach the live site; the build log names any such item.

- [x] ~~Write a one-time import from the TypeScript files to Neon~~ Not needed: business details, policies, the site's search title, fares and routes, cars, packages, destinations, guide titles, the general FAQs and the gallery are each read through `src/data/published.ts`, which lays the published edits over the code. Tables `content_items` (the admin's version of each item, with its draft) and `content_versions` (every publish, kept for good), migration 0006. Photo credits come with the image library (Phase 5); reviews stay in their file (below).
- [x] Change the pages to read from the database at build time, with no visible change to the site. *(`scripts/content-pull.mjs` runs before every build, after the migrations, and writes `.content/published.json`; a database that is set but cannot be read fails the build, so a deploy never goes out without the admin's edits. Publishing (`src/server/content.ts`) checks every edit against `src/server/content-schemas.ts`, refuses anything that would break a page or a link (a route pointing at a removed destination, a gallery link to a removed page, a fare in a route's opening answer that is not one of its fares), records each change, moves the "fares updated", "content updated" and guide dates on, and calls the deploy hook. The "content updated" dates only move forward: code and dashboard, whichever is later.)*
- [x] Compare the built HTML before and after the move to prove nothing changed. *(22 Oct 2026: every file of the build identical, apart from a random id the mountain drawing makes on each build. With test edits published (a fare, a new package, a package price, the package order, a guide title, the FAQs, a policy) the change reached the route page, fare board, booking form, package list, sitemap and llms.txt, and verify-build passed. 111 checks on drafts, publishing, history and restore passed against a test database.)*
- [x] Keep in code: JSON-LD structure, redirects, sitemap rules, security headers and the design.
- [x] Keep the Google reviews script, and add a "refresh reviews" button for it in the admin. *(The script runs before every build, so the button only starts a deploy. It shows, and fetches anything new, once `GOOGLE_PLACES_API_KEY` is set.)*
- [ ] Owner: create the deploy hook in Vercel and set `VERCEL_DEPLOY_HOOK_URL` (docs/admin-setup.md, step 3). Needed now that the Phase 5 screens are built: without it, Publish saves but the change goes live only with the next push.

## Phase 5: content editing in the dashboard

Built on 22 October 2026 after the owner said "Build it", to the mock's "Website editing" page (https://claude.ai/artifact/Cu63my3bhrhAk4apHDoFLS). Every website screen carries the publish bar (src/components/admin/PublishBar.astro): drafts waiting, Discard all, Review and publish (each change as "was → now", Undo per change, the checks Publish runs, refused with the reasons), then "Publishing" until the new deploy answers with the new content version, "Not live yet" with Try again, or "Everything is on the website" with Refresh Google reviews (shown once `GOOGLE_PLACES_API_KEY` is set). The menu shows a draft count per section. All of it is admin only, and was tested on a separate test server and database: about 120 checks with real clicks, phone width and dark mode, a production build with verify-build and the Google audit, and a build of the last commit compared with a build of this code with no edits (every page identical apart from the shared stylesheet gaining the new screens' classes).

- [x] A form for each content type, with plain labels, help text and validation. *(Business details, policies, search and launch, routes, packages, cars, destinations, guide titles and summaries, general questions, photos, gallery. Errors name the row: "Day 7: …".)*
- [x] Fares as an editable grid of routes by vehicle. *(/admin/fares/: saves each route as you type; "was ₹2,800" beside a changed fare; "The page's text still says ₹2,800 in a sedan" with "Change it to ₹3,100"; group chips; "Change many at once" by a percentage or an amount, rounded, with the text fixed where that is clear. The route editor (/admin/fares/route/…, and "Add a route") has every field.)*
- [x] Packages with reorderable itinerary days, inclusions, exclusions and FAQs. *(/admin/fares/package/…: days follow the nights, rows move with up and down buttons rather than dragging, which also works on a phone and with a keyboard; a preview card and the Google snippet follow the boxes; the order of packages is set on the Tour packages tab.)*
- [x] Guides in a rich-text editor. *(23 Oct 2026: every word of a guide is data in src/data/guides.ts and one page, src/pages/guides/[slug].astro, lays them all out. The guide form edits the title, short name, short answer, facts, the main text as parts (heading, paragraph, small note, bullet list, table; each moved, removed or added below another), questions, booking box, WhatsApp message and Google listing. The marks and fill-ins of page words work everywhere, so a fare quoted in a guide follows the fare chart. The five page files were turned into the data by a script and the built guides compared with the old ones: the same words, links and pictures, apart from the offbeat guide's breadcrumb, which now uses the footer's "Offbeat places near Bagdogra".)*
- [x] Business details and policies, admin only, with a warning that they show on every page and in Google's data. *(/admin/business/: phone and WhatsApp written any way are tidied to +91 … ; registrations and profile links as rows; when a policy changes, "Where it will show" lists what follows by itself and any text the dashboard holds that still says the old value, with "Change it to …".)*
- [x] Image library: upload, automatic resizing, required alt text and credit line, and a "where is this used" list. *(/admin/photos/. Uploads go to the private Blob store as website/<id>.jpg; at each build scripts/content-photos.mjs makes the three widths and Google's three crops under versioned names in public/img/v/ (not in git). Instead of dragging three crop frames, the admin clicks the point that must stay in, with live 16:9, 4:3 and square previews; the page photos use it too. A page chooses its photo in its form (packages, routes, destinations). Built-in photos can be replaced but never deleted; uploads can be deleted once no page uses them. A photo whose upload is missing at build is left out and pages fall back to their usual photo, so nothing shows broken.)*
- [x] Draft and publish, with a preview before publishing. *(Review and publish, plus the page editor's view of drafts.)*
- [x] Version history for every item, with one-click restore. *("Put this back" brings a version back as a draft.)*
- [x] Update the "fares updated" and "content updated" dates automatically.
- [x] Before the pre-launch switch can be turned off, block it while any placeholder text remains, as the current build check does. *(Business details, Search and launch: the switch stays locked until the numbers are real, every fare in page text matches the chart and the reviews are real, and asks for two ticks.)*
- [x] Refresh Google reviews button (from Phase 4). *(On the calm publish bar once the Places key is set; it starts a deploy, which fetches them.)*

## Phase 6: live on-page editing

Built on 22 October 2026 as "Edit pages" (/admin/pages/), tested with real clicks (27 checks).

- [x] "Edit this page" opens any public page in an edit mode for the admin. *(/admin/pages/edit/?path=…: the published page in a frame, laptop or phone width. Drafts of plain words are laid over it; lists say "Changed: shows after you publish".)*
- [x] Click a heading or paragraph to edit it in place. *(Enter saves a draft of that field, Esc stops, refused text says why. Photos are chosen in the side panel's photo picker rather than by clicking the picture.)*
- [x] Changes save as a draft, with Publish. *(Publish rebuilds the whole site, about a minute, rather than one page: the site is static and every page shares the fares and details.)*
- [x] Mark each editable spot in the page templates, so edits map to the right database field. *(data-edit="type:key:field" on destination, route, package and guide pages and the general questions; PageHero and FaqList take an `edit` prop.)*
- [x] Repeated items such as fares, itinerary days and FAQs open the Phase 5 form in a side panel instead. *(The dashboard's own forms, shown without the menus when inside the panel; admin pages now send X-Frame-Options SAMEORIGIN instead of DENY for this, and public pages send SAMEORIGIN too, so no other site can frame them.)*
- [x] Layout, colours and section order stay locked, so the design cannot be broken.

### Page words (22 October 2026)

The owner asked why only some parts of the pages could be edited: the first version only reached words that already lived in src/data (destinations, routes, packages, guides' title and answer, the general questions). Every other heading and paragraph was written into the page templates. Built the same day, not yet committed:

- [x] Every heading, paragraph, button label and list on the home, about, contact, questions, fare chart, packages, destinations, gallery, guides, 404 and photo-credits pages, the three policy pages, the shared parts (booking box, promises strip, journey story, reviews band, fare checker and fare board, footer) and the fixed lines of every route, package and destination page, plus each page's Google title and description. *(src/data/page-text.ts, content type `text`, 23 items (one per page, shared part or template), 407 boxes. Templates read them with `<Words page field />`, `words()`, `wordsText()`, `wordsList()`; SectionHead, PageHero, BookCta, ReviewsSlider and FaqList take a `words` prop.)*
- [x] Fill-ins keep numbers live: `{fromFare}`, `{freeCancel}`, `{nightCharge}`, `{faresUpdatedDate}` and so on, plus each template's own (`{from}`, `{to}`, `{name}`...). Small marks for `[links](/taxi/)`, `**bold**` and `*accent*` (src/lib/rich-text.ts). Saving refuses unknown fill-ins, unsafe links and empty boxes; Publish refuses a typed ₹ amount that is not a fare or price on the site.
- [x] Stored field by field: only boxes that differ from the starting copy are kept, so code changes to every other box still show; the build warns only when a changed box's code copy moved (src/data/published.ts `overlayFields`).
- [x] Edit pages lists them as Pages, Policies, On many pages and Page templates; each has a form (/admin/pages/text/<page>/) with the page's fill-ins and their values, and the page editor edits them in place, showing the fill-ins while editing and previewing drafts with the real values.
- [x] Proof of no change: a before/after build of all 80 pages matched in text, titles, descriptions, structured data and every tag and class.
- [x] ~~Not yet editable~~ All editable since 23 Oct 2026: the travel guides (above), the booking form ("Booking form", including the messages its script writes, with {amount}-style fill-ins it works out), the menu, top bar and phone bar ("Menu and top bar"), the menu's and footer's link lists (each line its words and the page it opens), the journey heading and its changing words, and the WhatsApp messages already typed for visitors ("WhatsApp messages", plus one in each route, package and destination template and each guide). Publish refuses a link to a page that would not exist, since one broken link stops the build; src/data/site-pages.ts lists the fixed pages and verify-build keeps it in step. Still in code: the designer's credit in the footer and screen-reader-only labels.

## Phase 7: privacy, safety and handover

- [x] Update the privacy policy: what is stored, why, for how long and who can see it.
- [x] Remove names and mobile numbers from bookings 24 months after the trip date, automatically every night. Trip, fare and payment totals stay for the accounts. *(src/server/retention.ts, run by the Vercel cron in vercel.json at 02:00 India time with CRON_SECRET. Also removes drop addresses, flights, notes, payment notes, itineraries, the number an itinerary went to, the values on edit entries, and access-log rows older than 24 months. Tested on 22 Oct 2026 with bookings 23, 25 and 30 months old. The Team page shows the last run.)*
- [x] Customer data export and deletion on request, from the customer page. *(Admin only: "Download what we hold" (a plain text file to send them) and "Remove their details", which asks for a reason and a tick, and warns about trips still to come. Logged without the name.)*
- [ ] Daily database backups, which Neon provides, plus a tested restore. *(Built: npm run db:backup and npm run db:restore, tested on 22 Oct 2026 (every table identical after the round trip); Neon's own restore is described in docs/admin-setup.md. Still to do once Neon is set up: check Neon's restore window on the chosen plan.)*
- [x] Error alerts for failed booking saves. *(The office is emailed the booking at once when the database does not answer; a booking that arrives later through the browser's retry shows "reached us … late" on its timeline and in its email. A failed nightly clean-up is emailed too. Needs Resend, which the owner chose not to use (22 Oct 2026): the WhatsApp message still arrives, the late booking still shows, and the Team page turns red when the clean-up has not run for a day and a half.)*
- [x] Check the admin works well on a phone, since staff will use it on the road. *(Every page checked at phone width on 22 Oct 2026; the New booking form was wider than the screen and is fixed.)*
- [x] A short guide for the admin and for staff. *(/admin/help/, in the menu for everyone: eleven everyday jobs step by step, and six more for the admin, including changing the website.)*

## Phase 8 (optional, later): send directly through the WhatsApp Business Platform

This makes "Send itinerary" deliver the text and images straight from the dashboard, with no WhatsApp window to tap through.

- [ ] Verify the business with Meta and connect a number to the WhatsApp Business Platform. Using the same number as the office's WhatsApp app needs Meta's coexistence setup, which has to be checked for this number.
- [ ] Get message templates approved by Meta for itineraries and reminders. They are needed when the customer has not messaged in the last 24 hours.
- [ ] Budget for Meta's per-message charges on those templates. Replies inside 24 hours of a customer's message are free.
- [x] Show delivered and read ticks for each itinerary on the booking. *(Built 23 Oct 2026, off until the owner sets it up (docs/admin-setup.md, step 14): src/server/whatsapp.ts, the webhook at /api/whatsapp/ (signed by Meta, verified with the app secret), migration 0007 (whatsapp_messages, one row per message with its status; whatsapp_inbound, only when each number last wrote, forgotten after two days). "Send from the office number" in the popup sends the approved template (cover photo, first name, title, link) or, within 24 hours of the customer's own message, the message as written and each photo. The build makes JPEG copies of the website photos once WHATSAPP_TOKEN is set. Not built: reminder messages.)*
- [x] Keep the stage 1 link method as the fallback if a direct send fails. *(The popup keeps "Open in WhatsApp instead", and a refused send says why in plain words and changes nothing the customer sees.)*


## Phase 9: calendar and customer ratings (client request, 25 October 2026)

The client saw the dashboard on 24 October 2026 and asked for two things: a calendar of when each driver and car is engaged, which also stops the website taking bookings for a car type that is fully booked; and a way to rate and group customers, to pick who gets a new itinerary later. Built 25 October 2026, migration 0008.

- [x] Calendar at /admin/calendar/ *(src/server/calendar.ts)*: a week (each day's trips with their times), a day (hour by hour) or a month (a month grid, each day listing its trips and drivers, for everyone or one driver; asked for by the user the same day); rows are drivers grouped by usual car, with "No driver yet" rows under each car type and outside cars at the bottom; tiles for cars free right now; "Is a car free?" for phone enquiries. A trip keeps its car busy for the drive there and back plus an hour (the route's drive time), a tour for every day of it, a route not on the list for 12 hours; the office can set its own end on a booking ("Car and driver free again", bookings.busy_until). Confirmed and driver-assigned bookings hold a car; new and contacted requests show dashed and hold nothing.
- [x] Time off for a driver (leave, car at the garage), table driver_time_off, marked from the calendar or the driver's page.
- [x] Outside cars: drivers.partner. The client's rule: when the office's own cars are all booked, the admin outsources the car. A trip given to a partner holds none of the office's cars. Only active drivers marked "Our car" with a usual car set count; a car type with none listed is always open on the website.
- [x] The booking form's check *(src/lib/car-availability.ts, /api/availability/, cached 30 s at the edge, its own rate limit)*: a car type whose own cars are all busy for the trip is greyed out with a WhatsApp link ("Ask us"); a chosen car that becomes booked moves to the nearest free car that seats the party, with a note. Anything going wrong leaves every car open. The admin can switch the check off on the calendar.
- [x] Warnings on a booking: the driver is busy with another trip or time off then, or no own car of its type is left; the driver list in Edit marks drivers "busy then".
- [x] Customer stars (1 to 5), tags the office makes (five to start: Family, Honeymoon, Group, Corporate, VIP) and "No offers", on the customer's page; shown on bookings and the customer list; Stars and Tag filters. *(src/server/customer-tags.ts. Removed with the name and number by the nightly clean-up and on request; listed in "Download what we hold".)*
- [x] Send an offer: the customer list with a message box ({name} becomes the first name) and a WhatsApp button on each customer, leaving out "No offers". The admin can copy or download every number in the filter for a WhatsApp Broadcast list (logged). The privacy policy now says we may send a new tour now and then, and how to stop it.
- [ ] Ask the owner: an "I'm happy to get new tour ideas" tick box on the booking form, if they want consent on record before sending offers, and bulk sending from the office number (Phase 8, marketing template, Meta's charges) if one-by-one sending gets too slow.
