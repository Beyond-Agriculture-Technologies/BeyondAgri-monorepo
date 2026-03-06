# Role-Based Farmer vs Wholesaler Experience + Ordering System

## Context

Farmers and wholesalers currently see the same app tabs and most of the same content. The wholesaler experience needs dedicated screens (Suppliers, Orders) and a full ordering flow from the marketplace. Farmers need to manage incoming orders.

**Tab structure goal:**
- **Farmer**: Home, Farms, Inventory, Marketplace, Photos, Profile (unchanged)
- **Wholesaler**: Home, **Suppliers**, Inventory, Marketplace, **Orders**, Profile

**Order flow**: Wholesaler places order from listing → Farmer confirms/declines → Wholesaler marks complete. No delivery tracking.

---

## Phase 1: Backend Order System

### 1A. Order Model
**New file**: `backend/app/models/order.py`

```
Order:
  buyer_account_id (FK accounts.id)   — wholesaler
  seller_account_id (FK accounts.id)  — farmer (denormalized from listing)
  listing_id (FK product_listings.id)
  quantity, unit, price_per_unit, total_price, currency (ZAR)
  status: PENDING → CONFIRMED/DECLINED → COMPLETED/CANCELLED
  confirmed_at, declined_at, completed_at, cancelled_at
  buyer_notes, seller_notes, decline_reason
```

Prices snapshot at order time. One order = one listing (no cart for v1).

**Modify**: `backend/app/models/__init__.py` — add Order, OrderStatusEnum

### 1B. Migration
**New file**: `backend/alembic/versions/010_add_orders_table.py`

### 1C. Schemas
**New file**: `backend/app/schemas/order.py`
- `OrderCreate`: listing_id, quantity, buyer_notes?
- `OrderResponse`: full order with nested listing_title, buyer_name, seller_name, seller_farm_name
- `OrderListResponse`: paginated
- `OrderStatsResponse`: totals, counts by status
- `SupplierSummary`: account_id, name, farm_name, contact, total_orders, total_spent

### 1D. Service
**New file**: `backend/app/services/order_service.py`
- `create_order` — validate listing ACTIVE, qty in bounds, snapshot price
- `confirm_order` — set CONFIRMED, deduct listing available_quantity
- `decline_order` — set DECLINED with reason
- `complete_order` — set COMPLETED (wholesaler marks received)
- `cancel_order` — set CANCELLED, restore qty if was CONFIRMED
- `get_buyer_orders` / `get_seller_orders` — paginated with status filter
- `get_buyer_stats` / `get_seller_stats`
- `get_buyer_suppliers` — distinct farmers with order counts

**Key rules**:
- Listing quantity NOT deducted on order placement (only on confirm)
- Use `SELECT FOR UPDATE` on confirm to prevent overselling
- Existing `InventoryTransaction.related_order_id` field links to orders

### 1E. Endpoints
**New file**: `backend/app/api/v1/endpoints/orders.py`

Wholesaler (uses `get_current_wholesaler_account`):
```
POST   /orders                        — place order
GET    /orders/my-orders               — list (status filter, pagination)
GET    /orders/my-orders/{id}          — detail
POST   /orders/my-orders/{id}/complete — mark received
POST   /orders/my-orders/{id}/cancel   — cancel
GET    /orders/my-stats                — spending stats
GET    /orders/my-suppliers            — supplier list
```

Farmer (uses `get_current_farmer_account`):
```
GET    /orders/incoming                — list (status filter, pagination)
GET    /orders/incoming/{id}           — detail
POST   /orders/incoming/{id}/confirm   — confirm
POST   /orders/incoming/{id}/decline   — decline
GET    /orders/seller-stats            — earning stats
```

**Modify**: `backend/app/api/v1/api.py` — register orders router

---

## Phase 2: Mobile Data Layer

### 2A. Types
**New file**: `mobile/src/types/order.ts`
- OrderStatusEnum, CreateOrderRequest, OrderResponse, OrderListResponse, OrderStatsResponse, SupplierSummary

### 2B. API Client
**New file**: `mobile/src/services/ordersApi.ts`
- Follow `marketplaceApi.ts` pattern exactly (class, getHeaders, request<T>)

### 2C. Store
**New file**: `mobile/src/store/order-store.ts`
- Follow `marketplace-store.ts` pattern (Zustand)
- State: myOrders, incomingOrders, currentOrder, stats, suppliers
- Actions: placeOrder, fetchMyOrders, confirmOrder, declineOrder, completeOrder, cancelOrder, fetchSuppliers

### 2D. Helpers
**New file**: `mobile/src/utils/order-helpers.ts`
- getOrderStatusLabel, getOrderStatusColor, formatOrderDate

### 2E. Permissions
**New file**: `mobile/src/hooks/useOrderPermissions.ts`
- canPlaceOrders (wholesaler), canViewMyOrders (wholesaler), canViewIncomingOrders (farmer), canConfirmOrders (farmer)

---

## Phase 3: Tab Navigation

**Modify**: `mobile/app/(tabs)/_layout.tsx`
- Import `useAuthStore`, get user_type
- Hide `farms` and `photos` tabs for wholesalers (`href: null`)
- Show `suppliers` and `orders` tabs for wholesalers
- Use Expo Router's `href: null` for conditional tab visibility

**New files**:
- `mobile/app/(tabs)/suppliers.tsx` — Wholesaler suppliers dashboard
- `mobile/app/(tabs)/orders.tsx` — Wholesaler orders dashboard

---

## Phase 4: Wholesaler Screens

### Orders route group
**New file**: `mobile/app/(orders)/_layout.tsx` — Stack navigator

**New file**: `mobile/app/(orders)/place-order.tsx`
- Receives `listingId` param from listing detail
- Shows listing summary, quantity input (validated min/max), total price, notes, submit

**New file**: `mobile/app/(orders)/order-detail.tsx`
- Shared by farmer + wholesaler (different action buttons per role)
- Wholesaler: Cancel (if PENDING), Complete (if CONFIRMED)
- Farmer: Confirm/Decline (if PENDING)

**New file**: `mobile/app/(orders)/supplier-detail.tsx`
- Supplier info + order history with that supplier

### Tab screens
**`mobile/app/(tabs)/orders.tsx`** — Order list with status filter chips (All, Pending, Confirmed, Completed, Cancelled). Order cards with listing title, qty, total, status badge.

**`mobile/app/(tabs)/suppliers.tsx`** — Supplier list from `ordersApi.getMySuppliers()`. Cards with farm name, total orders, total spent, last order date. Tap for detail.

### Marketplace integration
**Modify**: `mobile/app/(marketplace)/listing-details.tsx`
- Add "Place Order" button for wholesalers (navigates to `/(orders)/place-order?listingId={id}`)
- Show minimum order quantity and available quantity prominently

---

## Phase 5: Farmer Order Management

**New file**: `mobile/app/(marketplace)/incoming-orders.tsx`
- List of incoming orders with status filters
- Confirm/Decline actions

**Modify**: `mobile/app/(tabs)/marketplace.tsx`
- Add "Incoming Orders" section for farmers (show pending count with badge)
- Add "View Incoming Orders" quick action

---

## Phase 6: Home Tab Adaptation

**Modify**: `mobile/app/(tabs)/index.tsx`
- Add role check: if wholesaler, render WholesalerHome

**New file**: `mobile/src/components/WholesalerHome.tsx`
- Greeting + role badge
- Stats: Total Orders, Pending Orders, Monthly Spend
- Recent Orders (last 5)
- Top Suppliers (top 3)
- Quick Actions: Browse Marketplace, View Orders, View Suppliers

---

## File Summary

### New files (18)
| File | Description |
|------|-------------|
| `backend/app/models/order.py` | Order model + OrderStatusEnum |
| `backend/alembic/versions/010_add_orders_table.py` | Migration |
| `backend/app/schemas/order.py` | Order schemas |
| `backend/app/services/order_service.py` | Order business logic |
| `backend/app/api/v1/endpoints/orders.py` | Order endpoints |
| `mobile/src/types/order.ts` | TypeScript order types |
| `mobile/src/services/ordersApi.ts` | Order API client |
| `mobile/src/store/order-store.ts` | Zustand order store |
| `mobile/src/utils/order-helpers.ts` | Status labels, colors |
| `mobile/src/hooks/useOrderPermissions.ts` | Order permission hook |
| `mobile/src/components/WholesalerHome.tsx` | Wholesaler home dashboard |
| `mobile/app/(tabs)/suppliers.tsx` | Suppliers tab screen |
| `mobile/app/(tabs)/orders.tsx` | Orders tab screen |
| `mobile/app/(orders)/_layout.tsx` | Orders stack layout |
| `mobile/app/(orders)/place-order.tsx` | Place order form |
| `mobile/app/(orders)/order-detail.tsx` | Order detail (shared) |
| `mobile/app/(orders)/supplier-detail.tsx` | Supplier detail |
| `mobile/app/(marketplace)/incoming-orders.tsx` | Farmer incoming orders |

### Modified files (6)
| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Add Order exports |
| `backend/app/api/v1/api.py` | Register orders router |
| `mobile/app/(tabs)/_layout.tsx` | Role-based tab visibility |
| `mobile/app/(tabs)/index.tsx` | Wholesaler home conditional |
| `mobile/app/(tabs)/marketplace.tsx` | Incoming orders section for farmers |
| `mobile/app/(marketplace)/listing-details.tsx` | "Place Order" button for wholesalers |

---

## Implementation Order

```
Phase 1 (backend)  → can test with curl/Swagger
Phase 2 (mobile data layer) → can build in parallel from 2A
Phase 3 (tab navigation) → independent, can build with Phase 2
Phase 4 (wholesaler screens) → depends on Phase 2 + 3
Phase 5 (farmer orders) → depends on Phase 2
Phase 6 (home adaptation) → depends on Phase 2
```

## Verification
1. Run migration, test all order endpoints via Swagger/curl
2. Login as wholesaler → see Suppliers, Orders tabs (not Farms, Photos)
3. Browse marketplace → tap listing → "Place Order" → submit
4. Login as farmer → marketplace shows incoming orders badge → confirm order
5. Login as wholesaler → order shows CONFIRMED → mark complete
6. Wholesaler home shows stats and recent orders
