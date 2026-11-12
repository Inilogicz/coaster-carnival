# Coastal Carnival — event site, Paystack booking & admin

A Next.js 15 rebuild of the Coastal Carnival 4.0 site. Guests register, pay with Paystack, get sorted into a zodiac tribe, and receive a confirmation modal and email. Organisers manage everything from `/admin`.

## Local setup

```bash
npm install
cp .env.example .env            # fill in SESSION_SECRET at minimum
npm run db:dev                  # terminal 1: local Postgres on :5433 (no Docker needed)
npx prisma migrate deploy       # terminal 2
npm run db:seed                 # admin account + Coastal Carnival 4.0 as the live event
npm run dev                     # http://localhost:3000 and http://localhost:3000/admin
```

## How booking works

1. The guest fills in the form. `POST /api/registrations` validates it, **holds a place for 30 minutes**, and starts a Paystack transaction.
2. The Paystack popup opens. If the popup script can't load, the guest is redirected to Paystack and comes back to `/payment/callback`.
3. Payment is confirmed in two places, and both are safe to repeat:
   - `GET /api/payments/verify`: the browser asks, and the server re-verifies with Paystack.
   - `POST /api/paystack/webhook`: Paystack calls this; the HMAC-SHA512 signature is checked. It covers guests who close the tab before returning.
4. On success, the booking is marked **PAID** and the tribe is assigned inside a transaction locked per event, so capacity and tribe counts can't race. Then the modal shows and the email is sent.

Free tickets (price 0) skip Paystack and are confirmed straight away.

**Tribe rule (from the original site):** the birthday gives a zodiac element, which picks the tribe: Fire → Hot, Air → Spicy, Water → Drip, Earth → Wild. If that tribe is full, the guest joins the least-filled tribe that still has space.

## Admin (`/admin`)

| Page | What it does |
|---|---|
| Overview | Paid guests, revenue, people paying right now, conversion, capacity, bookings per day, tribe fill, ticket sales, latest payments; pause/open bookings |
| Attendees | Search and filter (status, tribe, ticket), guest details, resend email, re-check with Paystack, cancel unpaid, CSV export |
| Payments | Every Paystack transaction, with status totals |
| Event details | Name, host, date, times, venue, take-off point, capacity, contact, refund policy |
| Tickets & tribes | Any number of ticket types (price, what's included, quantity, on sale); tribe names, colours, images, places |
| Page content | Every headline, paragraph, photo, gallery item, hero film and soundtrack. Text can use tokens such as `{date}` and `{price}` |
| All events | Create a new event by copying an existing one, make it live, keep past events and their data |
| Account | Change password; check which integrations are configured |

## Deploying (Vercel + Neon)

1. Create a Postgres database (Neon or Supabase) and set `DATABASE_URL`.
2. Set every variable from `.env.example` in Vercel. Use a long random `SESSION_SECRET` and the real `APP_URL`.
3. Build command: `prisma migrate deploy && next build`. Then run `npm run db:seed` once against production.
4. In the Paystack dashboard, set the webhook URL to `https://<your-domain>/api/paystack/webhook`.
5. Test with Paystack **test** keys (test card `4084 0840 8408 4081`, any CVV and future expiry), then switch to live keys.

### Hero video size

`public/assets/coastal-v5` holds the original HLS film in four versions (phone and desktop, each in SDR and HDR), about 370 MB in total. That's fine on Vercel, but it makes the git repo heavy. For production, consider moving the folder to Cloudinary, Cloudflare R2 or S3 and pasting the new `master.m3u8` URLs into **Admin → Page content → Hero & film**. The player also accepts plain `.mp4` files.

### Guest email verification

Guests must verify their email with a six-digit code before paid or free registration. Codes expire after 10 minutes, allow five attempts, and can be resent after one minute. A verified email is valid for booking in the current page for one hour; changing the email or refreshing requires verification again. Both API and form enforce verification. Sending requires working `RESEND_API_KEY`, `EMAIL_FROM` with a verified sender domain, and `SESSION_SECRET`.

Deploy the email verification migration with `npm run db:deploy` before serving the updated app. Verification records store keyed hashes of codes, tokens and request IPs. Sending is limited to ten requests per IP per hour; the host must supply a trusted `x-real-ip` header (Vercel does). Other hosts must configure this at their reverse proxy; missing IPs share one limit.

Before launch, request a code using an inbox you control, try an incorrect code, verify the correct code, then complete a test booking. Confirm a direct registration request without verification is rejected, changing the email requires another verification, and the final ticket email arrives.

### Private registration for payments outside the website

After deploying both new migrations, open **Admin → External payments** and create a private link for the event. Share it directly with guests who have already paid. The link has a random access key, is excluded from public navigation, and requests no indexing. It can be replaced or disabled from the same page. Anyone holding the link can forward it; possession permits submission, never approval.

Guests verify their email, fill the existing registration form and include payer/payment reference details. Submissions are `AWAITING_APPROVAL`, do not reserve capacity, and receive no team or ticket. Check payment against your bank/payment records, then approve or reject in Admin. Approval runs under the event booking lock, checks event/ticket/team capacity, records the reviewer and time, assigns the team and attempts the ticket email. Approved guests appear in Attendees, where email can be resent. External payments do not create fictitious Paystack transactions. A duplicate email for the same event is rejected; the organiser must resolve existing registrations directly.

Run `node --test tests/external-registration.test.mjs` for focused approval and private-key checks. Live database concurrency, mail delivery and the full browser flow still require deployment testing.

### External payment receipts

External registration now requires structured payer/payment details and a JPG, PNG or PDF receipt (maximum 2 MB). Apply the payment receipt migration with `npm run db:deploy` before deploying this version. Receipt bytes are stored in a separate database table, so existing attendee queries do not load files. Guests see image previews, file size and remove/replace controls; files are not retained across refreshes and must be reselected. Admin → External payments provides authenticated receipt downloads; no public storage URL is generated. Existing requests without receipts remain reviewable. Payment evidence never automatically approves a booking.
