# Connect Inventory to Marketplace Listings

## Context

Farmers currently create marketplace listings by manually entering all fields (title, category, quantity, unit, price, etc.) even though they often already have matching inventory items. The backend `ProductListing` model already has an `inventory_item_id` FK to `InventoryItem` (nullable, marked "for future stock sync"), and `CreateListingRequest` already supports `inventory_item_id`. This connection is completely unused — we need to wire it up on the mobile side so farmers can select an inventory item and have the listing form pre-filled.

## Field Mapping: Inventory → Marketplace Listing

| InventoryItemResponse field | Listing form field | Notes |
|---|---|---|
| `item_name` | `title` | Direct copy |
| `description` | `description` | Direct copy |
| `current_quantity` | `available_quantity` | Farmer may want to list less than full stock |
| `unit` | `unit` | Direct copy |
| `cost_per_unit` | `price_per_unit` | Farmer will likely mark up, but good starting point |
| `photos` | `photos` | Future — both support JSON arrays |
| InventoryType `.category` | `category` | Shared enum values: HARVEST, MEAT, POULTRY. PACKAGING/SUPPLIES have no marketplace equivalent → default to OTHER |

## Files to modify

### 1. `mobile/app/(marketplace)/listing-form.tsx` — Add "Import from Inventory" picker

Before the Title field, add an optional "Import from Inventory" section:
- A touchable card/button: "Import from Inventory" with a package icon
- When tapped, shows a picker/list of the farmer's AVAILABLE inventory items (fetched via `useInventoryStore.fetchItems({ status: 'AVAILABLE' })`)
- Each item in the picker shows: `item_name`, `current_quantity unit`, category
- When an item is selected:
  - Pre-fill form fields from the mapping table above
  - Store the `selectedInventoryItemId` in component state
  - Show a "Linked to: {item_name}" badge that can be dismissed
- The farmer can still edit all pre-filled values
- On submit, include `inventory_item_id` in `CreateListingRequest`

### 2. `mobile/src/types/inventory.ts` — No changes needed
All necessary types already exist.

### 3. `mobile/src/types/marketplace.ts` — No changes needed
`CreateListingRequest` already has `inventory_item_id?: number`.

### 4. `mobile/src/store/inventory-store.ts` — No changes needed
`fetchItems(filters)` already supports filtering by status. The store's `items` and `inventoryTypes` arrays are already available.

## Implementation Details

### Inventory Item Picker (inside listing-form.tsx)

- Add `useInventoryStore` import to listing-form.tsx
- Fetch available items on mount: `fetchItems({ status: 'AVAILABLE' })`
- Also fetch `fetchInventoryTypes()` to get category info for each item
- New state: `selectedInventoryItemId: number | null`, `showInventoryPicker: boolean`
- Category mapping function:
  ```
  HARVEST → HARVEST, MEAT → MEAT, POULTRY → POULTRY
  PACKAGING → OTHER, SUPPLIES → OTHER
  ```
- When item is selected, call a `prefillFromInventory(item)` function that sets all form fields
- Show the picker only in create mode (not edit mode)

### Submit changes

In `handleSubmit` for create mode, add `inventory_item_id: selectedInventoryItemId` to `createData` if set.

## Key files

- `mobile/app/(marketplace)/listing-form.tsx` — Main file to modify
- `mobile/src/store/inventory-store.ts` — Already has `fetchItems`, `items`, `inventoryTypes` (read-only usage)
- `mobile/src/types/inventory.ts` — `InventoryItemResponse`, `InventoryTypeResponse`, `InventoryCategoryEnum`
- `mobile/src/types/marketplace.ts` — `CreateListingRequest.inventory_item_id` already exists

## Verification

1. Open Create Listing form — "Import from Inventory" section appears at the top
2. Tap it — shows list of AVAILABLE inventory items
3. Select an item — form pre-fills (title, description, quantity, unit, price, category)
4. Farmer can modify any pre-filled field
5. Submit — listing is created with `inventory_item_id` linking to the inventory item
6. Verify in My Listings that the listing shows correctly
