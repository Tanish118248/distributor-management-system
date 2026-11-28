# DOSL Project Journal

Team alpha (group 3C4D): Divya Sharma, Gautam Jindal, Tanish Garg.
Course: UCS503 Software Engineering. Project: Distributor Order, Stock and Ledger Management System (DOSL).

This journal follows the project from the first commit to the final report. Dates come from the repository's commit history. Where an entry describes a decision or a problem, it says so.

## Timeline

| Date | What happened |
|---|---|
| 14 Aug 2026 | Repository created. Database models and table creation script added. |
| 15 Aug 2026 | Backend files organised into a `backend` folder. Product, stock and order endpoints added; an order reduces stock and writes to the ledger. First Next.js frontend: products page, stock page and order form. |
| 17 Aug 2026 | Authentication, stock, orders and ledger completed on both backend and frontend. Python version pinned for deployment on Render. |
| 18 Aug 2026 | Fixed a database driver problem on Python 3.13. Added the products page, fixed prices on WhatsApp orders, added a "received" date to stock. |
| 24 Aug 2026 | Added automatic logout after inactivity, with a warning, and handling for expired logins. |
| 25 Aug 2026 | Dashboard pages refresh automatically. |
| 2 and 6 Sep 2026 | Files uploaded and frontend changes made. |
| 3 Nov 2026 | Credit control added: customer limits, order holds, dues page, reminders. |
| 21 Nov 2026 | Credit control merged into the main branch (pull request #1). |
| 28 Nov 2026 | Proposal, progress report and final report uploaded. |

## Why we added credit control

The first version handled stock, orders and a ledger. Feedback on that prototype said it was weak on solving a real problem. We then spoke to a wholesaler, who told us the biggest loss in the business is customers who take goods on credit and do not pay. That became the problem the project aims at.

## Design decisions

- **Hold, do not refuse.** A risky order goes on hold and the owner decides. A strict refusal would stop the owner from serving a customer they trust.
- **Prices come from the product record.** A price sent by a client is ignored, so a wrong or tampered price cannot change a sale.
- **Payments clear the oldest dues first.** This matches how a shopkeeper thinks about what a customer still owes, and it keeps the ageing of dues meaningful.
- **A rule-based risk flag.** The rules are fixed and can be explained to the owner. We did not claim any prediction.
- **Lock the rows involved.** The customer and the stock batch are locked while an order is placed, so two simultaneous orders cannot both slip under a limit or take the same stock.

## Problems we hit and what we did

| Problem | What we did |
|---|---|
| A new order was counted twice in its own credit-limit check | Fixed, with a test |
| An old order with an empty date crashed the dues calculation | Guarded the code; the migration fills missing due dates |
| Possible deadlock when two orders arrived together | The customer row is now locked first |
| Six orders against one limit at the same moment | Checked on PostgreSQL: exactly one was accepted |
| The live site showed a backend error on 25 Nov 2026 | The team reports it resolved |

## Testing

Fourteen automated tests cover first-expiry-first-out stock, ledger arithmetic and the credit-control rules, and all 14 pass. We also checked the database migration on PostgreSQL with existing data and ran the dashboard locally with demo data.

## What is not done

- Anyone can sign up with the owner role. Sign-up should create only a salesperson.
- An order is served from one batch, so it cannot be split across batches.
- Phone numbers are matched exactly, so some WhatsApp customers may not be found.
- The WhatsApp webhook does not verify the sender's signature.
- WhatsApp runs on the Twilio sandbox.

## What we learned

- Tests written by the people who wrote the code favour the intended path. Reviewing for unintended inputs found defects that the tests did not.
- Money and stock rules need to be decided once, in one place in the code, and tested there.
- A feature is not finished when it is merged. The live site must be checked after each change; after our merge it showed an error that had to be fixed.

## Who did what (from the commit history)

The repository records 25 commits, excluding the merge. Divya Sharma's account made 11 and Tanish Garg's made 14.

- **Divya Sharma (11 commits):** the database models and table creation script; reorganising the backend into its own folder; the product, stock and order endpoints, where an order reduces stock and writes to the ledger; the first Next.js frontend with its products page, stock page and order form; and the credit-control feature (customer limits, order holds, dues page, reminders), plus the document uploads.
- **Tanish Garg (14 commits):** creating the repository; completing authentication, stock, orders and ledger across backend and frontend; the deployment setup (Python version pinned for Render, a database driver fix for Python 3.13); the products page, the WhatsApp order price fix and the stock received date; automatic logout after inactivity; automatic refresh of dashboard pages; frontend changes; and merging credit control into the main branch.

The commit history records code only. Research, testing, planning and documentation work does not appear in it.

## Full commit log

| Date | Author | Commit message |
|---|---|---|
| 2026-08-14 | Tanish Garg | Initial commit |
| 2026-08-14 | Divyasharma1910 | Add database models and table creation script |
| 2026-08-15 | Divyasharma1910 | Organize backend files into backend folder |
| 2026-08-15 | Divyasharma1910 | Organize backend files into backend folder |
| 2026-08-15 | Divyasharma1910 | Add product create and list endpoints |
| 2026-08-15 | Divyasharma1910 | Add stock tracking endpoints |
| 2026-08-15 | Divyasharma1910 | Add order creation with stock reduction and ledger tracking |
| 2026-08-15 | Divyasharma1910 | Add Next.js frontend with products page fetching from API |
| 2026-08-15 | Divyasharma1910 | Add stock page and order creation form |
| 2026-08-17 | Tanish Garg | Remove unwanted file |
| 2026-08-17 | Tanish Garg | Complete backend + frontend: auth, stock, orders, ledger |
| 2026-08-17 | Tanish Garg | Remove unwanted file |
| 2026-08-17 | Tanish Garg | Pin Python version for Render deployment |
| 2026-08-18 | Tanish Garg | Fix psycopg2 Python 3.13 compatibility |
| 2026-08-18 | Tanish Garg | Add products page, fix WhatsApp order pricing, add stock received date |
| 2026-08-18 | Tanish Garg | products.py updated |
| 2026-08-18 | Tanish Garg | Updated Orders |
| 2026-08-18 | Tanish Garg | Success!!! |
| 2026-08-24 | Tanish Garg | Add idle timeout, session warning, and 401 handling |
| 2026-08-24 | Tanish Garg | Add idle timeout handling |
| 2026-08-25 | Tanish Garg | Add auto-refresh polling to dashboard pages |
| 2026-09-02 | Divyasharma1910 | Add files via upload |
| 2026-09-06 | Tanish Garg | Frontend Changes |
| 2026-11-03 | Divyasharma1910 | Add credit control: limits, order holds, dues page, reminders |
| 2026-11-28 | Divyasharma1910 | Add files via upload |
