# ERP 2.0 Restaurant POS & KOT — Native Design Draft

Status: design only; **not applied to Supabase**  
Target branch: `erp2-reservation-calendar`  
Source reviewed: `MihraMist_Cloud_Upgrade_Final.zip`, especially `tests/sql_parts/40_pos_schema.sql`, `tests/sql_parts/41_pos_rpc.sql`, and `tests/t3_pos_flow.js`.

## 1. Compatibility boundary

The legacy POS SQL is a reference implementation, not a migration script for ERP 2.0. It assumes `public.employees`, legacy room columns, legacy authorization helpers and legacy import tables. ERP 2.0 instead uses:

- `auth.uid()` as the authenticated actor.
- `employee_profiles` for staff identity and role.
- `resort_units(id, unit_code, unit_name, category, building, room_number, display_name, active, ...)` for the 17 physical units.
- `private.is_active_staff()` and the existing ERP 2.0 role/permission model.
- Current reservation/room-block tables, not legacy `bookings` or `unit_nights`.

No legacy POS SQL should be executed against the ERP 2.0 project.

## 2. Proposed ERP 2.0 data model

Names below are proposed and must be checked against the current schema before migration authoring.

| Table | Purpose | Important constraints |
|---|---|---|
| `pos_settings` | Restaurant tax, rounding and operational settings | Admin-only writes; snapshot tax settings on folio close |
| `pos_menu_categories` | Menu grouping and display order | Active flag; unique category key |
| `pos_menu_items` | Menu items, prices, tax rate, dietary label and availability | Non-negative price; cashier may toggle availability but not price |
| `pos_folios` | One guest/room/table account | Room FK to `resort_units`; walk-in label when no room; at most one open folio per room |
| `pos_orders` | One KOT/order header | Server-issued unique KOT number; state and version |
| `pos_order_items` | Immutable-at-service line snapshot | Name, rate, quantity, tax rate and instructions captured at order time |
| `pos_order_events` | Append-only KOT status/revision history | Actor, timestamp, from/to state and reason |
| `pos_folio_adjustments` | Audited discounts/adjustments | Append-only; reason and author required |
| `pos_payments` | Payment, room posting and refund ledger | Idempotent client request ID; payment kind distinguishes money received from room charge |
| `pos_bills` | Issued bill snapshot | Immutable issued snapshot; corrections supersede, never overwrite |
| `pos_audit_events` | POS-specific audit trail | Actor-bound; append-only |

Use UUIDs for ERP-owned entity identifiers where practical, and a separate client-generated request/idempotency UUID for safe retry. Human-facing KOT, receipt and bill numbers must be allocated by PostgreSQL sequences inside the transaction, never by the browser.

## 3. ERP 2.0 actor and authorization mapping

All server-side mutations must derive the actor from `auth.uid()`; never accept a browser-supplied staff ID or role as authoritative.

Suggested permission groups to map to the existing ERP 2.0 roles/permissions:

- **Waiter:** open folio, create KOT, view own/operational orders, edit only a new KOT before kitchen acceptance.
- **Kitchen:** view incoming KOTs and advance permitted kitchen states; cannot take payment, change prices, discount or cancel a folio.
- **Cashier/front office:** view folios, create bills, record approved payment methods, post eligible room charges, apply discount only within configured authority.
- **Manager/owner:** menu and price changes, higher discount approval, refunds, folio cancellation/reopen, controlled corrections and reports.

These are functional capabilities, not assumptions about the names of current ERP 2.0 roles. The migration must map them to actual staff permissions and enforce them in RPCs and RLS.

## 4. Transaction and accounting rules

1. Every write goes through a narrowly scoped PostgreSQL RPC. Authenticated clients receive read access only to rows permitted by POS access; no direct table insert/update/delete.
2. KOT creation, sequence allocation, line insertion, event record and audit record occur atomically.
3. KOT status transitions are validated server-side; stale versions are rejected and the latest state reloaded.
4. Menu price and tax are snapshotted on each order line. A later menu price edit must not change an existing KOT or bill.
5. Bill calculation uses integer paise throughout. Do not use floating-point arithmetic for money.
6. Discounts are allocated proportionally across bill lines with a deterministic remainder rule. The bill stores the calculation and tax configuration snapshot.
7. Restaurant meals and other services use the resort's approved 18% GST treatment. The final POS implementation must confirm whether menu prices are configured tax-exclusive or tax-inclusive before enabling bill settlement; do not silently assume this setting.
8. A **room charge is not cash received**. Record it as a separate ledger kind and do not count it as a collection. It should be eligible only for a room-linked folio and must be reconciled to the guest's room account.
9. Payments are append-only. Refunds are separate negative-direction transactions with manager authority and mandatory reason; never edit or delete an earlier payment.
10. Issued bills are immutable. Reopen/correction creates a superseding bill with a new bill number and preserved prior bill.
11. Cancellation is prohibited after payment/room posting unless the appropriate refund/reversal workflow is completed.
12. Every mutation carries an idempotency key so retrying after a network interruption cannot create duplicate KOTs, payments or bills.

## 5. KOT lifecycle

Proposed normal flow:

`new → accepted → preparing → ready → served`

A void is a controlled exception with permission and reason. Backward transitions, editing after kitchen acceptance, moving a KOT between folios, and back-dating require elevated authority and an immutable event record. Kitchen staff cannot change prices, accept payments or void accounts.

## 6. Room and walk-in handling

- Room folios reference one of the 17 active `resort_units` rows by UUID; do not store a free-text room code as the authoritative relation.
- The room display label is snapshotted for printed KOT/bill history.
- Enforce one open folio per room with a partial unique index and a transaction-safe check.
- Walk-in/table folios have no room FK and require a non-empty table/customer label.
- Do not auto-post restaurant charges to accommodation reservations without an explicit guest-accounting workflow and a traceable folio reference.

## 7. Required UI screens

1. **POS terminal:** room/table selection, menu categories, item search, quantity, modifiers/instructions, order summary and send KOT.
2. **Kitchen display:** live incoming tickets, elapsed time, status transitions and print/reprint audit.
3. **Open folios:** room/table, guest, KOT count, subtotal, tax, payments, room postings and outstanding amount.
4. **Billing:** line review, approved discount, payment method, split/partial payments, room charge, receipt and bill print.
5. **Menu administration:** categories, prices, tax rate, dietary tags and availability with role controls.
6. **POS reports:** sales by day/meal/category, tax summary, payment-method collection, room postings, refunds/voids and cashier close.

The current ERP 2.0 POS/KOT module is only a placeholder. Do not label it operational until these screens use the RPC-backed database contract.

## 8. Test gates before migration

Adapt and run the source package's test intent against an isolated ERP 2.0 test database:

- 17 active units appear; inactive units cannot receive new room folios.
- Concurrent open-folio requests for one room: exactly one succeeds.
- Waiter and kitchen roles cannot access cashier/admin mutations.
- KOT number allocation and idempotent retries do not duplicate orders.
- KOT state transitions, stale-version rejection and immutable event history.
- Menu price changes do not mutate existing order line snapshots.
- Tax-exclusive and tax-inclusive calculations, GST grouping and rounding parity.
- Discount allocation, discount authority and mandatory reasons.
- Partial payments, split payments, overpayment rejection and idempotent payment retry.
- Room charge is not included in cash collections; room charge only on room folio.
- Refund caps, cancellation restrictions, reopen/supersede and bill immutability.
- RLS tests for each staff role and unauthenticated access.
- Browser end-to-end: POS → KOT → kitchen → bill → payment → receipt; room folio reconciliation.

## 9. Historical KOT migration boundary

The historical KOT backup remains the authoritative source for historical POS transactions. Before any import:

1. Inventory and hash the source backup; preserve an untouched copy.
2. Profile counts, date ranges, duplicate identifiers, voids, payments, refunds and totals.
3. Define explicit source-to-target mappings and a stable `source_record_id`.
4. Dry-run into staging tables only; produce row counts and financial reconciliation by day/payment method.
5. Compare every source total to imported totals and record exceptions.
6. Obtain explicit approval before inserting historical records into production tables.

No historical import is part of this design commit.

## 10. Decisions to confirm before production behavior

- Whether room folios may be opened before guest check-in.
- Whether room charges require guest signature/PIN or front-office approval.
- Whether restaurant menu prices are tax-inclusive or tax-exclusive.
- Exact staff permission mapping and cashier discount limit.
- Whether a bill can be settled with a room charge still outstanding to the guest account.
- Kitchen routing/printing requirements and number of kitchen stations.
- Cashier day-close and cash drawer reconciliation procedure.

Until these decisions and tests are complete, POS remains a design/build preview and must not process real guest bills.
