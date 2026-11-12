# Original Quote Builder → ERP 2.0 Compatibility Map

Status: engineering note only. No database changes or deployment.

## Source baseline
The original Quote Builder is the `quotes` module embedded in `MihraMist_Cloud_Upgrade_Final.zip/index.html` (334,932 characters after extracting the module string). It is a full React application, not a small quote form.

The original screen includes:
- Night-by-night room/category selection, including different categories on different nights.
- Weekday, weekend, peak-season and festival rate handling.
- Multiple rooms and guest allocation.
- Extra adults, children age bands and child charges.
- Meal plans and meal quantities.
- Packages and add-ons.
- Discounts and separate 5% / 18% tax slabs.
- Special notes, guest details and saved quotation history.
- Branded print output and quote text for sharing.
- Rate-card, peak-rule, inventory, package and GST-basis settings.

## ERP 2.0 database contract (read-only inspection)
Existing tables and relevant columns:
- `resort_units`: 17 active physical units; `id, unit_code, unit_name, category, active, display_order, building, room_number, display_name`.
- `resort_rate_categories`: `id, category_name, active, extra_person_amount`.
- `resort_rate_category_units`: maps the 17 units to the 10 active categories.
- `rate_rules`: `rate_category_id, rule_type, amount, start_date, end_date, priority, active`.
- `reservations` and `room_blocks`: master availability data.
- `crm_leads` and `crm_activities`: current CRM.
- `quotes`: `quote_number, lead_id, guest_name, phone, email, check_in, check_out, adults, children, status, valid_until, items JSONB, subtotal, discount, tax_amount, total, tax_note, notes`.

## Compatibility decisions
1. Do not run the legacy consolidated SQL. Its `resort_units`, `bookings`, CRM and quote-store schema does not match ERP 2.0.
2. Keep the existing 17 `resort_units` rows and IDs. The live unit/category mapping was checked; do not import or recreate rooms from the legacy package.
3. Use `rate_rules` and the existing category mapping as the cloud source for room tariffs. Do not let legacy localStorage rate cards silently override cloud rates.
4. Use `reservations` + `room_blocks` as the only availability master. Quote checks must be read-only and must never create a hold.
5. Persist a quote to the existing `quotes` table. Preserve the original detailed calculation in `items` JSONB (or a versioned nested payload) while also filling the structured guest/date/amount columns used by ERP 2.0. Do not create a second quote store.
6. Link a quote to the selected CRM lead by `lead_id`. If a quote is created without a selected lead, do not silently create a duplicate CRM lead based on mobile.
7. Keep quote numbering from the database identity `quote_number`; do not use the legacy local quote ID as the official number.
8. Keep the user-approved tax rule as the authority: accommodation is assessed per room/unit per night at 5% when the discounted nightly accommodation value (including extra-person charges) is up to and including ₹7,500, and 18% when above ₹7,500; meals and all other services/add-ons are 18%. Allocate discounts proportionately before GST. The legacy module's internal GST assumptions must be reviewed and adapted rather than copied unchanged.
9. Any legacy settings that have no current cloud equivalent (notably packages, inventory and GST basis) must be explicitly mapped or proposed as a separate additive schema change before enabling cloud persistence. No local-only fallback may be labelled as cloud-saved.

## Port sequence
- Phase A: port the original quote calculation and UI as a dedicated module, retaining its user-facing workflow and print/share output.
- Phase B: replace legacy storage calls with an adapter to ERP 2.0 reads/writes; use current rate tables and CRM IDs.
- Phase C: connect availability reads to the native reservation calendar and show conflicts without reserving rooms.
- Phase D: regression-test rate calculations, extra-person/child/meal/package handling, discount allocation, GST boundaries, saved/reopened quotes, CRM linkage, copy/share, print/PDF and mobile layout.

## Required acceptance cases
- 17 physical units remain unchanged and each is mapped to its existing rate category.
- A quote can have different room categories across different nights and multiple rooms.
- Quotes do not block dates; only confirmed reservations/holds in the calendar do.
- Accommodation GST boundary tests include ₹7,500 and ₹7,501 per room per night after proportional discount and extra-person allocation.
- Meals and other add-ons always use 18% GST.
- Saved quote reloads with all line-level and guest-allocation details intact.
- Copy/share and print output preserve the original branded quotation layout.
- CRM linkage uses the selected lead ID and does not create duplicate leads.
- Cloud failures are visible; never silently save to browser storage and claim success.

