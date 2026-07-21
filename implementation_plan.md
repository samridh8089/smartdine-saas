# Implementation Plan – Prepaid Takeaway QR Ordering System

This plan outlines the architecture and changes required to implement a dedicated prepaid takeaway ordering flow using virtual takeaway tables and UPI deep links.

## User Review Required
> [!IMPORTANT]
> - Takeaway orders will resolve to a virtual table record in the database named `'Takeaway'` per restaurant to respect the existing `orders_table_id_fkey` constraint.
> - Takeaway ordering must be enabled in the Owner settings (`settings.takeaway_enabled === true`). If disabled, customers scanning the takeaway QR will see a message: `"Takeaway ordering is currently unavailable."`

## Open Questions
- None.

## Proposed Changes

### 1. Database Schema
#### [NEW] [20260628000002_takeaway_fields.sql](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/supabase/migrations/20260628000002_takeaway_fields.sql)
- Add columns to the `orders` table:
  - `order_type` (text, default `'dine_in'`, checked for `'dine_in'` or `'takeaway'`).
  - `customer_arrival_minutes` (integer).
  - `takeaway_notes` (text).

---

### 2. Client Database Service Layer
#### [MODIFY] [db.ts](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/lib/db.ts)
- Update the `Order` type interface to include `order_type`, `customer_arrival_minutes`, and `takeaway_notes`.
- Update the return properties mapping in `getOrders` and `getOrderById`.
- Update `createOrder` parameters to support `orderType`, `customerArrivalMinutes`, and `takeawayNotes`.
- Automatically find or create a virtual `Takeaway` table record when placing a takeaway order.

---

### 3. Customer Menu Flow
#### [NEW] [takeaway/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(customer)/menu/[restaurant_slug]/takeaway/page.tsx)
- Create a dedicated takeaway customer route pointing to the menu component with `isTakeaway={true}`.

#### [MODIFY] [CustomerMenu.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/components/customer/CustomerMenu.tsx)
- Check `restaurant.settings.takeaway_enabled`. If disabled, render an overlay message: `"Takeaway ordering is currently unavailable."`
- In the basket/checkout sheet, if `isTakeaway` is true:
  - Show the estimated arrival time selector dropdown (10m, 15m, 20m, 30m, 45m, 60m).
  - Show a text area for takeaway notes (instructions).
  - Force prepaid payment via a UPI Pay details card. The button will prompt a confirmation popup: `"Have you completed the UPI payment?"` before placing the order with `payment_status = 'customer_marked_paid'`.
  - Render the professional warning message.

---

### 4. Waiter & Kitchen Dashboards
#### [MODIFY] [orders/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(dashboard)/dashboard/orders/page.tsx)
- Render the purple `🟣 TAKEAWAY` badge next to order details.
- Render `"Pickup Customer (Arrives in X minutes)"` instead of the table number.
- Include takeaway metadata in the activity log timeline and printable billing invoice template.

#### [MODIFY] [kds/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(dashboard)/dashboard/kds/page.tsx)
- Render the purple `🟣 TAKEAWAY` badge on KDS cards.
- Render `"Customer arriving in X minutes"` on the cooking ticket.

#### [MODIFY] [order-tracking/[order_id]/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(customer)/order-tracking/[order_id]/page.tsx)
- Render the takeaway order type and estimated arrival minutes on the customer tracking timeline.

---

### 5. Settings & Reports
#### [MODIFY] [settings/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(dashboard)/dashboard/settings/page.tsx)
- Add a new **Takeaway Ordering** section with an ON/OFF toggle, saving `settings.takeaway_enabled === true/false` inside `restaurants.settings`.

#### [MODIFY] [reports/page.tsx](file:///C:/Users/DELL/.gemini/antigravity/scratch/smartdine-qr/src/app/(dashboard)/dashboard/reports/page.tsx)
- Compute and render takeaway metrics:
  - *Total Takeaway Orders*
  - *Takeaway Revenue*
  - *Average Takeaway Ticket*
  - *Dine-in vs Takeaway* distribution chart layout.

---

## Verification Plan

### Automated Tests
- Create an E2E script `test-takeaway-e2e.js` that places a takeaway order, tests validation triggers, and checks the database output.

### Manual Verification
- Ask the user to run migrations, enable takeaway in settings, scan the QR code to verify the takeaway checkout modal, and verify KDS/Live Orders tickets.
