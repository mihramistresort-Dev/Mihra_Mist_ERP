# Original Quote Builder — Feature Inventory and Port Checklist

This inventory was extracted from the `quotes` application embedded in the supplied `MihraMist_Cloud_Upgrade_Final.zip/index.html`. It records source behaviour, not assumptions about the new app.

## Guest and stay inputs
- Guest name, mobile, email and lead source.
- Check-in date and stay duration.
- Guest count.
- Multiple room-category lines, each with room quantity and extra-person count.
- Two stay modes: one room configuration for the whole stay, or split stay segments with different room configurations by segment.
- Children under 5, children aged 6–12, and additional guests beyond room capacity.

## Tariff engine
- Per-category weekday, weekend, extra-person, base-occupancy and maximum-extra settings.
- Night-by-night date calculation.
- Holiday dates can be explicitly marked as weekend-rate dates.
- Peak-season rules can override ordinary category rates.
- Peak-rate waiver switch.
- Split-stay segments can each have their own room categories, quantities and night counts.
- Computed nightly breakdown and rate notes.
- Rate-card administration: edit categories, rates, room counts, add/remove categories, reset defaults.

## Meals, packages and add-ons
- Lunch rate and quantity.
- Dinner rate and quantity.
- Package definitions with units such as room-night and person-night.
- Package selection, automatic quantity calculation and manual quantity override.
- Child and additional-guest charges, including charges that cannot be placed within room capacity.
- Package administration and inclusions.

## GST and discounts in the source
- Original code computes room 5%/18% slabs and separate meal/add-on slabs using its own `gstBasis` and specified-premises logic.
- Original discount controls support percentage or exact amount.
- Original source applies discount to room nightly rates only; it does not discount meals, extras, children or packages.
- **Porting rule:** do not copy these tax/discount rules blindly. The current ERP requirement overrides them: proportionately allocate the quote discount before GST; accommodation threshold is tested per physical room per night including extra-person charges; 5% at or below ₹7,500 and 18% above; meals and all other services/add-ons at 18%.

## Availability and bookings in the source
- Availability tab and 21-day calendar.
- Inventory counts by room category.
- Booking list and booking form.
- Quote-to-booking confirmation flow.
- Cloud patch adds a read-only calendar mirror and booking conflict checks.
- **Porting rule:** the ERP 2.0 reservation calendar is authoritative. The Quote Builder may show date conflicts, but must not reserve, block, or create a booking just by saving a quote. Any conversion to a reservation must use the existing reservation RPCs and explicit staff action.

## Saved quotes, sharing and administration
- Saved quote list, open/reload, save, copy quote.
- Share-text generation and WhatsApp workflow.
- Mark quote as sent and CRM linkage.
- Print-friendly quote output.
- Export backup.
- Storage badge distinguishes cloud storage from device-only storage.
- Cloud writes use optimistic version checks and refuse stale overwrites.
- Rate card, GST basis, package definitions, peak rules and inventory are separately persisted settings in the legacy app.

## ERP 2.0 adaptation map
| Original capability | ERP 2.0 source of truth / implementation |
|---|---|
| Guest details and lead source | Existing `crm_leads` and quote fields |
| Official quote number | Database-generated `quotes.quote_number` |
| Saved quotation | Existing `quotes` row; full calculation payload in `items` JSONB |
| Room catalogue | Existing 17 active `resort_units` and 10 active categories |
| Category-to-room mapping | Existing `resort_rate_category_units` |
| Weekday/weekend/peak/festival tariff | Existing `rate_rules` |
| Availability | `reservations` + active `room_blocks` |
| Booking conversion | Existing `create_reservation` RPC, only on explicit confirmation |
| CRM linkage | Selected existing `crm_leads.id`; no silent mobile-based duplicate creation |
| Quote status | Existing `quotes.status`; CRM activity can record sent/accepted outcome |
| Packages | Needs a current cloud configuration contract before shared cloud use |
| Inventory counts | Derive from active room/category mapping; do not maintain a second room count |
| Versioned edits | Add safe version/concurrency handling to current quote persistence before multi-user editing |

## Implementation order
1. Replace the reduced single-category quote form with a multi-room, split-stay quote editor.
2. Add child-age bands, capacity and extra-person logic using the existing category mapping.
3. Add meal and package lines, while keeping all non-accommodation services at 18% GST.
4. Use cloud tariff rules and show missing-rate errors; never invent rates.
5. Add read-only availability checks against the master calendar.
6. Add saved-quote edit/copy/reload and safe concurrent-update protection.
7. Restore original branded print/share output and sent-status CRM activity.
8. Validate all tariff, occupancy, discount, GST-boundary, availability and persistence cases before asking the resort team to test.
