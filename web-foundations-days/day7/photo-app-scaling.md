# SnapShare scaling plan

## Assumptions

- SnapShare has 10 million registered users, and 10% are active on a typical
  day, giving it **1 million daily active users (DAU)**.
- Each daily active user uploads one photo and views 50 feed pages per day.
- Traffic and uploads are averaged across a 24-hour day (86,400 seconds); peak
  feed traffic is five times the average.
- The average original photo is 2 MB and its thumbnail is an additional 50 KB.
- A year has 365 days. Storage uses decimal units (1 TB = 1,000,000 MB), and
  estimates exclude replication, backups, metadata, compression, and deletions.

## Traffic and storage estimates

- **Uploads:** 1,000,000 photos per day / 86,400 seconds = about **11.6 uploads
  per second** on average.
- **Feed views:** 1,000,000 users × 50 pages = 50,000,000 feed pages per day;
  / 86,400 = about **579 feed views per second** on average, or about **2,894
  per second at peak** (5× average).
- **Original photo storage per year:** 1,000,000 photos/day × 365 days ×
  2 MB = **730,000,000 MB (730 TB)**.
- **Thumbnail storage per year:** 1,000,000 thumbnails/day × 365 days ×
  0.05 MB = **18,250,000 MB (18.25 TB)**.
- **Total new photo-file storage per year:** approximately **748.25 TB**, before
  replication, backups, or other overhead.

SnapShare is **read-heavy**: the 50 million daily feed views greatly outnumber
the 1 million daily uploads. The design should scale feed delivery separately
from writes, serve frequently requested content from caches and the CDN, and
use a database read replica to take read load off the primary.

## Photo storage

Photo files should not be stored as database blobs: large binary data would
inflate the database, increase backup and restore time, and compete with
metadata queries for database resources. Store originals and thumbnails in
scalable object storage, and keep their object keys, ownership, timestamps, and
other searchable metadata in the database; serve cached image files through a
CDN.

## Architecture

```text
                              +--------------------+
                              |        Users       |
                              +----+-----------+---+
                                   |           |
                       feed/images |           | API requests
                                   v           v
                            +------+--+   +----+-------------+
                            |   CDN   |   | Load balancer    |
                            +----+----+   +--------+---------+
                                 |                   |
                       cache miss |                   v
                                 |           +--------+---------+
                                 |           |   App servers    |
                                 |           +--+------+-----+--+
                                 |              |      |     |
                                 |              |      |     +--------+
                                 |              |      |              |
                                 |              v      v              v
                                 |        +-----+--+ +--+----------+  +-----------+
                                 |        | Cache  | | DB primary |  | Job queue |
                                 |        +--------+ +-----+------+  +-----+-----+
                                 |                          |               |
                                 |                          v               v
                                 |                  +-------+------+  +-----+------+
                                 |                  | DB read     |  | Thumbnail  |
                                 |                  | replica     |  | worker     |
                                 |                  +-------------+  +--+-------+-+
                                 |                                      |       |
                                 |                             read original   write
                                 |                                      |       |
                                 v                                      v       v
                          +------+-----------------------------------------------+
                          | Object storage: originals and thumbnails            |
                          +------------------------------------------------------+
```

## Components

- **CDN:** Caches and serves photos close to users, reducing image latency and
  origin bandwidth.
- **Load balancer:** Distributes incoming API requests across healthy app
  servers so traffic can be handled by multiple instances.
- **App servers:** Authenticate users, handle uploads and feed requests, and
  coordinate metadata, cache, object storage, and queue operations.
- **Cache:** Keeps frequently requested feed data and metadata available without
  repeatedly querying the database.
- **Database primary:** Stores authoritative photo metadata and handles
  metadata writes.
- **Database read replica:** Serves feed and other read queries to reduce load
  on the primary.
- **Object storage:** Stores original photo and thumbnail files durably and
  independently of the database.
- **Job queue:** Buffers thumbnail work so upload requests do not need to wait
  for image processing.
- **Thumbnail worker:** Consumes queued jobs, creates a 50 KB thumbnail from
  the original, and saves it to object storage.

## Photo upload flow

1. A user sends an authenticated upload request with the photo to an app server
   through the load balancer.
2. The app server validates the request and writes the original photo to object
   storage under a unique key.
3. The app server writes the photo's metadata and original object key to the
   database primary.
4. The app server enqueues a thumbnail job containing the original and
   destination object keys, then returns the upload result to the user.
5. A thumbnail worker consumes the job, reads the original from object storage,
   and creates the thumbnail.
6. The worker writes the thumbnail to object storage and updates the photo
   metadata with its thumbnail key; the CDN can then cache and deliver the
   original and thumbnail on demand.

## Trade-offs

- **Asynchronous thumbnails vs. immediate availability:** Queueing thumbnail
  work keeps uploads fast and smooths bursts, but the thumbnail may not be
  available immediately; the app needs a pending state or a fallback to the
  original until processing completes.
- **Read replica vs. freshest feed data:** A read replica improves read
  capacity, but replication lag can briefly make a newly uploaded photo absent
  from a feed; read-after-write requests can go to the primary when freshness
  matters.
- **CDN caching vs. immediate updates:** CDN caching reduces latency and origin
  load, but a changed or removed photo may remain cached until expiry; short
  cache lifetimes or explicit invalidation improve freshness at additional
  request and operational cost.
