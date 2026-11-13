# POS / KOT integration plan for Mihra Mist ERP 2.0

## Status

Compatibility assessment only. No POS schema has been applied to Supabase 2.0, no historical KOT data has been imported, and no production deployment has been made.

## Non-negotiable data and safety rules

1. The earlier KOT backup is the authoritative source for historical POS transactions. Preserve it unchanged and retain its original identifiers, timestamps, bill snapshots, payments, and audit history.
2. Do not run the legacy `001_cloud_upgrade_additive.sql` against ERP 2.0. It targets a different schema and role model.
3. Do not use the old `employees`, `my_id()`, `my_role()`, `my_dept()`, or old `resort_units.code/label` assumptions. ERP 2.0 uses `employee_profiles`, `auth.uid()`, `private.is_active_staff()`, and `resort_units.id/unit_code/unit_name`.
4. All writes that affect KOTs, bills, payments, room charges, reversals, or audit records must be atomic server-side RPCs. The browser must not directly mutate ledger tables.
5. A room charge is a folio posting, not a payment received. Cash/UPI/card receipts and refunds must remain separately identifiable.
6. Preserve append-only event, adjustment, payment, bill, and audit history. Corrections must be reversals or new events, never silent edits/deletes.
7. POS must not deduct Stores inventory until menu-item-to-stock-item mapping and stock issue rules are explicitly designed and tested.

## ERP 2.0 integration map

| Legacy POS object / concept | ERP 2.0 adaptation |
|---|---|
| `resort_units.code/label` | Resolve room by `resort_units.id`; display `unit_code` and `unit_name` |
| `employees` actor references | `auth.users` / `employee_profiles.id`; capture authenticated actor in RPC |
| `restaurant_settings` | New singleton POS settings record; no old global app settings blob |
| `restaurant_menu_categories` | New normalized POS menu categories |
| `restaurant_menu_items` | New normalized menu catalogue with price, tax, diet, availability and active flags |
| `restaurant_folios` | New guest/table folios; optional FK to `resort_units.id` and optionally `reservations.id` |
| `restaurant_orders` + `restaurant_order_items` | KOT header and immutable-at-issue item snapshot |
| `restaurant_order_events` | Append-only KOT status/revision history |
| `restaurant_folio_adjustments` | Append-only discounts, surcharges and authorised adjustments |
| `restaurant_payments` | Append-only receipts, room postings and refunds with idempotency |
| `restaurant_bills` | Immutable bill snapshots; superseding/reopening creates traceable history |
| `restaurant_audit` | Use ERP 2.0 `audit_events` or a POS-specific append-only audit stream with equivalent integrity |

## Proposed POS 2.0 module boundaries

- **Menu setup:** categories, items, prices, tax treatment, availability and menu versioning.
- **Folio management:** room-linked guest folios and named walk-in/table folios; enforce one open folio per room and per normalized walk-in label.
- **KOT workflow:** create, print/reprint, accept, prepare, ready, served, void; retain item snapshots and status events.
- **Billing:** calculate line totals, discounts, taxable bases, tax groups and round-off on the server; issue immutable bill snapshots.
- **Payments:** record receipt, refund, and room posting as distinct transaction kinds; prevent duplicate submissions with idempotency keys.
- **Room posting:** validate that the selected room is occupied/eligible under the resort's agreed policy; post to the room folio without marking it as cash received.
- **Audit and permissions:** role-gated operations, actor attribution, reason capture for void/reopen/discount/refund, and immutable event history.

## Required database design decisions before migration

- Confirm whether restaurant folios can be opened for a reserved room before check-in, and when room posting is permitted.
- Define whether a single room can have more than one open restaurant folio (recommended: no).
- Confirm menu tax defaults and whether item-specific tax overrides are allowed. Do not infer CA-approved tax settings from the legacy package.
- Define discount authority and approval thresholds by ERP 2.0 role.
- Define bill reopen/supersede permissions and reason requirements.
- Define whether payments can be split across methods and how refunds reference original receipts.
- Define kitchen station routing and whether a KOT can be split into multiple kitchen tickets.

## Migration and release sequence

1. Create a read-only inventory of the KOT backup and reconcile counts, identifiers, totals, bill snapshots and payment kinds.
2. Design ERP 2.0-native tables and RPC contracts; keep the schema additive and separate from current reservation/CRM tables.
3. Add unit tests for bill arithmetic, discount/tax grouping, rounding, idempotent replay, duplicate open folios, payment/refund reconciliation, room posting, and append-only ledgers.
4. Add role and RLS tests using actual ERP 2.0 helper functions and `employee_profiles`.
5. Apply the migration only to the ERP 2.0 project after reviewing the generated migration; never to the old live project.
6. Wire the KOT UI to the RPC contract and compare calculations with the original browser implementation.
7. Import historical KOT data from the authoritative backup in dry-run mode first; compare counts and financial totals before commit.
8. Run end-to-end preview tests with at least two staff logins and verify that kitchen, cashier, front-office and manager permissions are enforced.
9. Keep the preview isolated until sign-off. Production release and any irreversible historical import remain explicit approval gates.

## Known gaps from the supplied original package

- The original package's POS SQL depends on legacy employee helpers and an older room schema, so it is not directly portable.
- The original runbook says the KOT/Billing browser screen was not yet wired to its cloud state bridge; the server-side POS schema/RPCs had been tested locally, but the live Supabase integration had not been verified.
- The original package did not include the authoritative KOT backup needed for historical import. The backup must be located and validated separately.
- Stores stock deduction is not implemented because menu-to-stock mappings are not established.
