# Reflection

The most difficult concept in the course was understanding how to keep data
correct when many requests happen at the same time. It is easy to describe a
seat as “available” on a page, but two people can see that same information
before either one checks out. I worked through the problem by tracing the
sequence of database operations, then identifying where a transaction, row
lock, and uniqueness constraint each provide a guarantee. That helped me
separate a fast but possibly stale display from the authoritative purchase
decision.

The feedback highlighted the need to define the order state machine for a
payment callback that arrives after a hold expires. I would improve that part
by making intermediate states explicit and specifying what happens at each
deadline. The revised design keeps seats held only during a bounded review
window; if a late callback confirms a capture after the order has expired, it
queues an idempotent refund and never issues a ticket or reclaims a seat that
may belong to another buyer. This makes the recovery behavior as concrete as
the normal checkout path.

Next, I want to learn more about database isolation levels and distributed
queues, then practice modeling these workflows as state machines and testing
their race conditions. I especially want to learn how to reconcile a payment
provider's state with the order database when callbacks are delayed, repeated,
or delivered out of order.
