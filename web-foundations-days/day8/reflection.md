# Reflection

The most difficult concept in the course was understanding how to keep data
correct when many requests happen at the same time. It is easy to describe a
seat as “available” on a page, but two people can see that same information
before either one checks out. I worked through the problem by tracing the
sequence of database operations, then identifying where a transaction, row
lock, and uniqueness constraint each provide a guarantee. That helped me
separate a fast but possibly stale display from the authoritative purchase
decision.

I have not received formal feedback on this capstone yet, so I cannot claim
that a particular reviewer asked for a change. On reviewing my own design, I
would improve the sale-admission section by testing its fairness policy and
setting a measured admission rate against realistic database and payment
provider limits. The estimates show the scale of the burst, but a load test
would make those limits more than assumptions.

Next, I want to learn more about database isolation levels and distributed
queues. In particular, I would like to understand how to test failure cases
such as a payment authorization arriving after a hold expires, and how to
reconcile the payment provider's state with the order database without
issuing a duplicate ticket or charging someone without a seat.
