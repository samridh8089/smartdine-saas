# Execution Checklist – Takeaway QR Ordering System

- [x] Create Database Migration File (Add takeaway columns)
- [x] Update `src/lib/db.ts` (Order type, mappings, createOrder parameters, and virtual Takeaway table handler)
- [x] Create customer takeaway route `src/app/(customer)/menu/[restaurant_slug]/takeaway/page.tsx`
- [x] Update `src/components/customer/CustomerMenu.tsx` (Takeaway toggle check, dropdown selector, UPI prepaid checkout card, and professional note)
- [x] Update `src/app/(dashboard)/dashboard/settings/page.tsx` (Enable Takeaway Ordering toggle configuration)
- [x] Update `src/app/(dashboard)/dashboard/tables/page.tsx` (Dedicated Takeaway QR card download/print/links layout)
- [x] Update KDS `src/app/(dashboard)/dashboard/kds/page.tsx` (🟣 TAKEAWAY badge and customer arriving info)
- [x] Update Waiter Portal `src/app/(dashboard)/dashboard/orders/page.tsx` (🟣 TAKEAWAY badge and customer arriving info, activity logs, printed receipts)
- [x] Update customer order-tracking `src/app/(customer)/order-tracking/[order_id]/page.tsx` (Timeline takeaway and estimated arrival indicators)
- [x] Update reports `src/app/(dashboard)/dashboard/reports/page.tsx` (Takeaway orders count, revenue, average ticket, distribution chart)
- [x] Verify local Next.js production build and TypeScript compilation
- [x] Create E2E validation script & run tests on production (Verification pending schema cache reload)
