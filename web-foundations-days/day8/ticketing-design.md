# TicketHub event ticketing system design

## 1. Requirements

### Functional requirements

- Visitors can browse and search events, view event details, and see a venue's
  seat map with current availability and prices.
- Registered users can select seats, place a time-limited hold, and check out.
- Users can pay for held seats and view their purchased tickets.
- The system sends a confirmation after a purchase and lets users retrieve
  tickets later.
- Event organizers can publish events, configure seat inventory and prices,
  and see sales. Only authorized organizers can change event details.

### Non-functional requirements

- **Speed:** Event pages should have a p95 response time below 300 ms, and seat
  maps below 500 ms under normal traffic. During a sale, the system should
  respond promptly with either a hold confirmation or a clear sold-out/queue
  response rather than timing out.
- **Correctness:** A seat can be held by at most one active order and sold to
  at most one buyer. The database, not a cache or client, is authoritative for
  availability, price, payment state, and ticket issuance.
- **Fairness:** Publish the sale time and queue policy in advance. Assign
  randomized queue positions to eligible users arriving during the opening
  minute, then admit later arrivals in FIFO order. Issue a signed, short-lived
  admission token; limit each account to one active queue entry and one active
  hold per event. Apply bot checks and per-account/IP rate limits without
  allowing one client to reserve inventory by repeatedly refreshing.
- **Availability and durability:** Target 99.9% monthly availability. Keep the
  transactional database highly available with backups and point-in-time
  recovery. A failure should not create an extra ticket or silently lose a
  successful payment.
- **Security and privacy:** Authenticate checkout and ticket access, authorize
  organizer actions, validate all inputs, use TLS, and avoid storing payment
  card details. Use the payment provider's tokenized payment flow.
- **Scalability:** Scale browsing and sale admission independently. The system
  must absorb a sharp burst without sending every waiting buyer directly to
  the inventory database.

## 2. Traffic estimates

There are 2 million registered users. The estimates below use the supplied
daily counts and decimal requests/second calculations (86,400 seconds per
day). For normal traffic, assume activity is spread across the day and use a
5x multiplier to approximate a busy-period peak. For the sale, assume each of
the 200,000 prospective buyers loads the seat map once and submits one hold
request; retries can raise hold requests to roughly 3x that baseline.

### Normal day

- Visitors: **50,000 per day**, or 2.5% of registered users.
- Page views: 50,000 visitors x 10 pages = **500,000 page views/day**.
- Average page requests: 500,000 / 86,400 = **5.8 requests/second**.
- Estimated 5x busy-period page traffic: **about 29 requests/second**.
- Sales: **5,000 tickets/day**, averaging 5,000 / 86,400 = **0.058 tickets
  per second**.

### Popular concert sale

- Interested buyers: **200,000 in 10 minutes**, or 200,000 / 600 =
  **about 333 buyers/second**.
- At one seat-map request and one hold request per buyer: **about 333 of each
  request/second**; with retries, the hold endpoint may see **about 1,000
  requests/second**.
- The sale's seat-map request rate is about **11.5x** the estimated normal
  busy-period page rate (333 / 29). A 5x multiplier is only an assumption for
  normal peaks; the sale arrival rate is calculated directly from the supplied
  ten-minute window.
- Inventory: **20,000 seats**, so at most 20,000 buyers can succeed. Selling
  all seats evenly over ten minutes is **about 33 successful tickets/second**.
- The successful sale rate is about **576x** the normal average sale rate
  (33.3 / 0.058). The 200,000 arrivals in ten minutes are four times the
  normal day's visitors, compressed into a much shorter period.

These are planning estimates, not capacity guarantees. Load tests should tune
the queue's admission rate against the database and payment-provider limits.
The seat-map CDN/cache can absorb repeat reads, but it may be briefly stale;
only a successful hold response confirms a seat.

## 3. API

All endpoints use HTTPS. Checkout endpoints require authentication. Requests
that create a hold or initiate payment accept an `Idempotency-Key`, so a
network retry cannot create a second hold or charge. Prices are calculated
server-side.

| Method and endpoint | Purpose |
| --- | --- |
| `GET /v1/events?query=&date=&cursor=` | Browse/search published events with cursor pagination. |
| `GET /v1/events/{eventId}` | Return event details, venue information, and sale status. |
| `GET /v1/events/{eventId}/seats` | Return the seat map and a best-effort availability snapshot. |
| `POST /v1/events/{eventId}/holds` | Create an order and atomically hold selected seat IDs; return order ID, expiry time, and authoritative prices. |
| `POST /v1/orders/{orderId}/payment-intents` | Create or retrieve an idempotent payment authorization for the held order. |
| `POST /v1/orders/{orderId}/confirm` | Confirm an authorized payment, finalize the order, and issue tickets. Safe to retry. |
| `GET /v1/me/tickets` | List the authenticated user's purchased tickets and event details. |

The hold endpoint returns `409 Conflict` if any requested seat is no longer
available, `429 Too Many Requests` if the user is not admitted or is
rate-limited, and the hold expiry in its successful response. Payment
confirmation is also idempotent; payment-provider webhooks use a verified
signature and deduplicate provider event IDs.

## 4. Data model

Use a relational database for transactional inventory and payment state. IDs
are primary keys; timestamps are UTC. Prices are stored as integer minor units
(for example, cents) with an ISO currency code.

| Table | Important columns and constraints |
| --- | --- |
| `users` | `id` primary key, `email` unique and not null, `password_hash`, `created_at` |
| `events` | `id` primary key, `organizer_id` foreign key to `users.id`, `title`, `venue`, `starts_at`, `sale_starts_at`, `status` |
| `seats` | `id` primary key, `event_id` foreign key to `events.id`, `section`, `row_label`, `seat_number`, `price_minor`, `currency`, `state` (`available`, `held`, `sold`), nullable `held_by_order_id` foreign key to `orders.id`, nullable `hold_expires_at`; unique (`event_id`, `section`, `row_label`, `seat_number`) |
| `orders` | `id` primary key, `user_id` foreign key to `users.id`, `event_id` foreign key to `events.id`, `status` (`holding`, `payment_pending`, `paid`, `expired`, `cancelled`), `created_at`, `hold_expires_at`, nullable unique (`user_id`, `idempotency_key`) |
| `order_items` | `id` primary key, `order_id` foreign key to `orders.id`, `seat_id` foreign key to `seats.id`, `price_minor`, `currency`; unique (`order_id`, `seat_id`) |
| `payments` | `id` primary key, `order_id` foreign key to `orders.id`, `provider_reference` unique, `status`, `amount_minor`, `currency`, `created_at`; index on (`order_id`, `created_at`) |
| `tickets` | `id` primary key, `order_item_id` foreign key to `order_items.id` and unique, `seat_id` foreign key to `seats.id` and unique, `ticket_code` unique, `issued_at` |

Relationships:

- One user can organize many events and place many orders; each event belongs
  to one organizer.
- One event has many seats and many orders.
- One order belongs to one user and one event and contains one or more order
  items. Each item refers to one seat.
- An order can have payment attempts recorded in `payments`.
- A paid order item produces one ticket. The unique `tickets.seat_id`
  constraint prevents issuing two tickets for the same seat.

The seat row holds the authoritative state, while `order_items` records the
seat and agreed price for an order. Foreign keys protect relationships;
uniqueness constraints protect event seat labels, request idempotency, and
ticket issuance.

## 5. Preventing two buyers from buying the same seat

Never use a cached seat map as permission to purchase: two buyers can both see
a seat as available. For a hold request, the application starts a database
transaction and locks the requested `seats` rows with `SELECT ... FOR UPDATE`
in a stable ID order. It verifies every seat belongs to the event and is
available (or has an expired hold), then changes all requested rows to
`held`, records the order and expiry, and inserts the matching `order_items`.
If any seat fails validation, roll back the whole transaction so the buyer
does not receive only part of the requested set. Concurrent transactions for
the same seat serialize on its row; after the first commits, the second sees
`held` and fails. A conditional update from `available` to `held` and checking
that exactly one row changed provides an equivalent compare-and-set guard.

Expired holds are released by a transaction that locks the seat row, confirms
its hold has expired, and changes it back to `available`. The purchaser cannot
extend a hold indefinitely; the service enforces the published expiry.

Payment-provider calls happen outside database locks and transactions. After
authorization, the confirmation transaction locks the seats again, checks
that each is still held by this order and unexpired, changes them to `sold`,
sets the order to `payment_pending`, and writes a capture command to the
transactional outbox. The seats remain unavailable while capture is pending.
A worker captures the authorized funds with an idempotency key; on confirmed
success, a transaction marks the order `paid` and inserts its tickets. On a
definitive capture failure, it voids the authorization and releases the seats
in a transaction. If the provider's outcome is uncertain, keep the seats
unavailable until reconciliation establishes whether capture succeeded. The
`tickets.seat_id` unique constraint is the final database-level backstop
against duplicate issuance. If the hold expired before confirmation, do not
commit the capture command; void the authorization. Payment-webhook
deduplication and idempotent worker retries make this flow safe to repeat.

## 6. Architecture and big-sale behavior

```text
 Buyers / Browsers
       |                         Event pages and static assets
       +-----> CDN <-----------------------------------+
       |                                               |
       +-----> WAF / API Gateway / Load Balancer       |
                         |                             |
                         v                             |
                Stateless application services        |
                  |          |          |              |
                  |          |          +----> Payment provider
                  |          |
                  |          +----> Cache (event details, seat-map snapshot)
                  |                      ^
                  |                      | browsing/read traffic
                  |              Database read replicas
                  |
                  +----> Sale admission queue / signed-token service
                  |              |
                  |              +---- admitted hold/checkout traffic
                  v
            Relational DB primary <---- transactional outbox
             (seat inventory, orders,       |
              payments, tickets)            v
                                      Message queue / workers
                                        |             |
                                 ticket email     payment reconciliation
```

- **CDN and cache:** Serve event descriptions, images, and seat-map snapshots
  close to users. Seat-map data is explicitly advisory, never authoritative.
- **WAF, API gateway, and load balancer:** Enforce TLS, authentication,
  request-size limits, bot/rate controls, and distribute requests across
  stateless application instances.
- **Sale admission queue:** Applies the published randomized-opening/FIFO
  policy, gives one short-lived signed token per eligible account, and admits
  buyers at a measured rate. During the sale, queued users see their position
  and retry guidance instead of overwhelming the write database.
- **Application services:** Validate admission tokens and request contents,
  perform the transactional hold and payment workflows, and scale horizontally.
- **Relational database primary:** Owns the seat state and all sale writes.
  High availability and backups support recovery; row-level transactions and
  constraints prevent overselling.
- **Read replicas:** Serve browse and event-detail queries, not hold,
  checkout, or ticket-issuance decisions. Replication lag therefore cannot
  approve a stale seat.
- **Payment provider:** Stores payment credentials and authorizes/captures
  funds. The application stores provider references and state, not card data.
- **Transactional outbox, message queue, and workers:** Publish committed
  capture commands and purchase events reliably for payment completion,
  ticket email, and reconciliation. These tasks run after the purchase
  transaction and do not block inventory locks.

The sale queue smooths the burst before it reaches the primary, while the CDN
and replicas take read load away from transactional inventory. Admission rate
is adjusted using primary latency and queue depth. If the database or payment
provider is unhealthy, pause admissions and keep users queued rather than
accepting uncertain holds or issuing unconfirmed tickets.

## 7. Trade-offs

- **Strict database transactions vs. write throughput:** Locking seat rows and
  checking state on the primary makes the no-double-booking guarantee
  straightforward, but limits write throughput under high contention. A
  virtual queue and controlled admission reduce that contention; cached
  availability alone would be faster but could oversell.
- **Fair opening queue vs. earliest network arrival:** Randomizing eligible
  users who arrive during the opening minute reduces the advantage of
  millisecond-level network timing and gives simultaneous fans a fairer
  chance. It is less predictable than strict FIFO, so the policy and queue
  position must be communicated before the sale.
- **Short holds vs. checkout time:** A short expiry returns abandoned seats to
  inventory quickly, but may penalize a buyer with a slow payment flow. A
  longer hold improves checkout comfort while keeping scarce seats unavailable
  for longer. Choose and publish a bounded expiry, and do not extend it
  indefinitely.
- **Read replicas/cached seat maps vs. freshness:** They lower read latency and
  primary load, but can show stale availability. The hold transaction is the
  source of truth and reports conflicts clearly.
