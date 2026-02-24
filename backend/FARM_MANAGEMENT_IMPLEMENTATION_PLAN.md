# Farm Management System - Complete Implementation Plan

## Overview

This document outlines the complete database schema and implementation strategy for BeyondAgri's farm management system. The design mirrors Farmbrite's functionality while maintaining complete data ownership and independence, allowing for future migration away from third-party services.

## Strategic Goals

1. **Data Ownership** - Store all farm management data locally in our PostgreSQL database
2. **Farmbrite Integration** - Sync with Farmbrite API initially for feature parity
3. **Future Independence** - Build capability to completely replace Farmbrite
4. **Performance** - Fast local queries without API latency or rate limits
5. **Reliability** - System functions even when Farmbrite API is unavailable

## Architecture Approach

### Hybrid Sync Pattern

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  BeyondAgri DB  │ ←──────→│  Sync Layer  │ ←──────→│  Farmbrite API  │
│  (Source of     │         │  (Optional)  │         │  (Third Party)  │
│   Truth)        │         │              │         │                 │
└─────────────────┘         └──────────────┘         └─────────────────┘
        ↑
        │
        ↓
┌─────────────────┐
│   FastAPI       │
│   Endpoints     │
└─────────────────┘
```

### Key Principles

- **Local First**: All data stored locally, API calls are secondary
- **Sync Optional**: System works without Farmbrite integration
- **Gradual Migration**: Can phase out Farmbrite over time
- **No Vendor Lock-in**: Full control over data structure and features

---

## Database Schema Design

### 1. LIVESTOCK & ANIMAL MANAGEMENT

#### `animals` - Individual Animal Tracking
Core table for tracking individual livestock animals.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts (farmer ownership) |
| `farmbrite_animal_id` | String | Nullable, for Farmbrite sync |
| `animal_type` | Enum | cattle/sheep/goat/pig/chicken/turkey/duck/etc |
| `animal_identifier` | String | Tag number, name, or visual ID |
| `breed` | String | Animal breed |
| `gender` | Enum | male/female/unknown |
| `birth_date` | Date | Date of birth |
| `acquisition_date` | Date | Date acquired by farm |
| `death_date` | Date | Nullable, date of death |
| `mother_id` | Integer | Nullable, FK to animals (dam) |
| `father_id` | Integer | Nullable, FK to animals (sire) |
| `current_weight` | Decimal | Current weight |
| `target_weight` | Decimal | Target/market weight |
| `health_status` | Enum | healthy/sick/quarantine/deceased |
| `location` | String | Current location (field, barn, pen) |
| `purchase_price` | Decimal | Initial purchase cost |
| `current_value` | Decimal | Current estimated value |
| `notes` | Text | Additional notes |
| `custom_fields` | JSONB | Flexible custom data |
| `status` | Enum | active/sold/deceased/transferred |
| `group_ids` | JSONB | Array of group memberships |
| `photos` | JSONB | Array of S3 photo URLs |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

**Relationships:**
- Belongs to: `Account` (farmer)
- Has many: `AnimalMeasurement`, `AnimalHealthRecord`, `AnimalFeeding`
- Can belong to many: `AnimalGroup`

---

#### `animal_groups` - Herds, Flocks, and Pens
Manage groups of animals collectively.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `group_name` | String | Name of the group (e.g., "Dairy Herd A") |
| `group_type` | Enum | herd/flock/pen/batch |
| `animal_type` | Enum | Type of animals in group |
| `location` | String | Where the group is located |
| `total_count` | Integer | Total animals in group |
| `active_count` | Integer | Currently active animals |
| `notes` | Text | Additional notes |
| `metadata` | JSONB | Flexible additional data |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `animal_measurements` - Weight, Height, Production Tracking
Track physical measurements over time.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `animal_id` | Integer | FK to animals |
| `measurement_type` | Enum | weight/height/temperature/milk_yield/egg_count |
| `value` | Decimal | Measurement value |
| `unit` | String | Unit of measurement (kg, lbs, liters, etc.) |
| `measured_at` | Timestamp | When measurement was taken |
| `measured_by_account_id` | Integer | FK to accounts (who measured) |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `animal_health_records` - Veterinary Care and Treatments
Track health interventions and veterinary care.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `animal_id` | Integer | FK to animals |
| `record_type` | Enum | vaccination/treatment/checkup/injury/surgery |
| `administered_date` | Date | Date of treatment |
| `administered_by` | String | Name of person who administered |
| `medication_name` | String | Name of medication/vaccine |
| `dosage` | String | Dosage amount |
| `duration` | Integer | Treatment duration in days |
| `veterinarian_contact_id` | Integer | Nullable, FK to contacts |
| `next_due_date` | Date | When next treatment is due |
| `cost` | Decimal | Cost of treatment |
| `notes` | Text | Additional notes |
| `documents` | JSONB | Array of document URLs (prescriptions, reports) |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `animal_feedings` - Feed Tracking and Consumption
Track what animals eat and feeding schedules.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `animal_id` | Integer | Nullable, FK to animals (for individual) |
| `group_id` | Integer | Nullable, FK to animal_groups (for group) |
| `feeding_date` | Date | Date of feeding |
| `feed_type` | String | Type of feed |
| `feed_inventory_id` | Integer | Nullable, FK to inventory_items |
| `quantity_fed` | Decimal | Amount fed |
| `unit` | String | Unit of measurement |
| `cost` | Decimal | Cost of feed |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `animal_grazings` - Pasture Rotation Management
Track grazing patterns and pasture rotation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `animal_id` | Integer | Nullable, FK to animals |
| `group_id` | Integer | Nullable, FK to animal_groups |
| `field_id` | Integer | FK to fields |
| `grazing_start_date` | Date | When grazing started |
| `grazing_end_date` | Date | Nullable, when grazing ended |
| `rotation_number` | Integer | Rotation sequence number |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 2. CROP & PLANTING MANAGEMENT

#### `plant_types` - Crop Catalog
Master catalog of plant varieties that can be grown.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | Nullable (null = system default, not null = custom) |
| `plant_name` | String | Common name (e.g., "Tomato") |
| `scientific_name` | String | Latin name |
| `variety` | String | Specific variety (e.g., "Roma", "Cherry") |
| `category` | Enum | vegetable/fruit/grain/herb/flower/etc |
| `growing_season` | Enum | spring/summer/fall/winter/year_round |
| `days_to_maturity` | Integer | Typical days from planting to harvest |
| `planting_depth` | Decimal | Recommended planting depth |
| `row_spacing` | Decimal | Space between rows |
| `plant_spacing` | Decimal | Space between plants |
| `water_requirements` | Enum | low/medium/high |
| `sun_requirements` | Enum | full_sun/partial_shade/full_shade |
| `typical_yield_per_unit` | Decimal | Expected yield per area |
| `notes` | Text | Growing tips and notes |
| `custom_fields` | JSONB | Flexible additional data |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `fields` - Growing Locations
Physical locations where crops are grown.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `field_name` | String | Name of the field |
| `field_code` | String | Short code/identifier |
| `location_coordinates` | PostGIS POINT | GPS coordinates |
| `total_area` | Decimal | Size of field |
| `unit` | Enum | hectares/acres/sq_meters |
| `soil_type` | String | Soil composition |
| `soil_ph` | Decimal | pH level |
| `irrigation_type` | Enum | drip/sprinkler/rain_fed/flood |
| `drainage_quality` | Enum | poor/fair/good/excellent |
| `status` | Enum | active/fallow/resting/retired |
| `notes` | Text | Additional notes |
| `photos` | JSONB | Array of field photo URLs |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `crop_plantings` - Active Crop Plantings
Individual planting events/crop cycles.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `plant_type_id` | Integer | FK to plant_types |
| `field_id` | Integer | FK to fields |
| `planting_name` | String | Descriptive name (e.g., "Spring Tomatoes 2025") |
| `planting_date` | Date | Date planted |
| `expected_harvest_date` | Date | Projected harvest date |
| `actual_harvest_date` | Date | Nullable, actual harvest date |
| `area_planted` | Decimal | Area used for this planting |
| `unit` | Enum | hectares/acres/sq_meters/rows |
| `quantity_planted` | Integer | Number of seeds/seedlings |
| `planting_method` | Enum | direct_seed/transplant/broadcast |
| `status` | Enum | planned/planted/growing/harvested/failed |
| `estimated_yield` | Decimal | Expected harvest amount |
| `actual_yield` | Decimal | Nullable, actual harvest amount |
| `yield_unit` | String | Unit of yield measurement |
| `total_cost` | Decimal | Total investment in this planting |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

**Relationships:**
- Belongs to: `Account`, `PlantType`, `Field`
- Has many: `CropActivity`, `CropHarvest`, `Treatment`

---

#### `crop_activities` - Maintenance Activities
Track all activities performed on crops.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `planting_id` | Integer | FK to crop_plantings |
| `activity_type` | Enum | watering/fertilizing/weeding/pruning/pest_control/staking |
| `activity_date` | Date | Date activity performed |
| `performed_by_account_id` | Integer | FK to accounts |
| `materials_used` | JSONB | Array of {inventory_id, quantity} |
| `quantity_used` | Decimal | Amount of material |
| `unit` | String | Unit of measurement |
| `cost` | Decimal | Cost of activity |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `crop_harvests` - Harvest Records
Track harvest events and yields.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `planting_id` | Integer | FK to crop_plantings |
| `harvest_date` | Date | Date of harvest |
| `quantity_harvested` | Decimal | Amount harvested |
| `unit` | String | Unit of measurement |
| `quality_grade` | Enum | A/B/C/premium/standard/seconds |
| `harvest_location` | String | Which part of field |
| `harvested_by_account_id` | Integer | FK to accounts |
| `destination` | Enum | to_inventory/direct_sale/personal_use/waste |
| `inventory_item_id` | Integer | Nullable, FK to inventory_items |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 3. INVENTORY MANAGEMENT

#### `inventory_types` - Item Catalog
Master catalog of inventory item types.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | Nullable (system defaults vs custom) |
| `type_name` | String | Name of inventory type |
| `category` | Enum | harvest/feed/seed/fertilizer/chemical/equipment/supply/packaging |
| `unit_of_measure` | String | Default unit for this type |
| `perishable` | Boolean | Whether item expires |
| `typical_shelf_life_days` | Integer | Nullable, typical shelf life |
| `reorder_point` | Decimal | When to reorder |
| `reorder_quantity` | Decimal | How much to reorder |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `warehouses` - Storage Facilities
Physical storage locations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `warehouse_name` | String | Name of warehouse/storage |
| `location` | String | Physical address/location |
| `storage_capacity` | Decimal | Total capacity |
| `unit` | String | Unit of capacity measurement |
| `temperature_controlled` | Boolean | Climate controlled facility |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `storage_bins` - Storage Subdivisions
Bins/sections within warehouses.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `warehouse_id` | Integer | FK to warehouses |
| `bin_name` | String | Name/identifier of bin |
| `bin_code` | String | Short code for quick reference |
| `capacity` | Decimal | Bin capacity |
| `unit` | String | Unit of measurement |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `inventory_items` - Actual Inventory Stock
Individual inventory items in stock.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `inventory_type_id` | Integer | FK to inventory_types |
| `warehouse_id` | Integer | Nullable, FK to warehouses |
| `bin_id` | Integer | Nullable, FK to storage_bins |
| `item_name` | String | Specific item name |
| `description` | Text | Detailed description |
| `sku` | String | Stock keeping unit |
| `current_quantity` | Decimal | Current stock level |
| `unit` | String | Unit of measurement |
| `minimum_quantity` | Decimal | Alert threshold |
| `acquisition_date` | Date | Date acquired |
| `expiry_date` | Date | Nullable, expiration date |
| `cost_per_unit` | Decimal | Unit cost |
| `total_value` | Decimal | Calculated: quantity × cost |
| `supplier_contact_id` | Integer | Nullable, FK to contacts |
| `batch_number` | String | Batch/lot identifier |
| `lot_number` | String | Lot identifier |
| `status` | Enum | available/reserved/sold/expired/damaged |
| `related_crop_id` | Integer | Nullable, FK to crop_plantings |
| `related_animal_id` | Integer | Nullable, FK to animals |
| `notes` | Text | Additional notes |
| `photos` | JSONB | Array of photo URLs |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

**Relationships:**
- Belongs to: `Account`, `InventoryType`, `Warehouse`, `StorageBin`
- Has many: `InventoryTransaction`, `OrderItem`
- Can link to: `CropPlanting` (source), `Animal` (source)

---

#### `inventory_transactions` - Stock Movement Log
Track all inventory changes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `inventory_item_id` | Integer | FK to inventory_items |
| `transaction_type` | Enum | add/remove/adjustment/transfer/sale/spoilage |
| `transaction_date` | Timestamp | When transaction occurred |
| `quantity_change` | Decimal | Amount added (positive) or removed (negative) |
| `unit` | String | Unit of measurement |
| `from_location_id` | Integer | Nullable, for transfers (warehouse/bin) |
| `to_location_id` | Integer | Nullable, for transfers |
| `cost_per_unit` | Decimal | Cost at time of transaction |
| `total_cost` | Decimal | Total transaction cost |
| `related_order_id` | Integer | Nullable, FK to orders |
| `related_task_id` | Integer | Nullable, FK to tasks |
| `performed_by_account_id` | Integer | FK to accounts |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |

---

### 4. PRODUCTS & MARKETPLACE

#### `products` - Marketplace Product Listings
Products available for sale.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts (farmer/seller) |
| `product_name` | String | Display name |
| `description` | Text | Product description |
| `category` | Enum | fresh_produce/processed/meat/dairy/eggs/honey/etc |
| `product_type` | Enum | single/bundle/subscription/custom_order |
| `base_price` | Decimal | Base price per unit |
| `unit` | String | Pricing unit (kg, dozen, bunch, etc.) |
| `currency` | String | Currency code (ZAR, USD, etc.) |
| `inventory_item_ids` | JSONB | Array of linked inventory items |
| `certifications` | JSONB | Array of certifications (organic, fair_trade, etc.) |
| `quality_grades_available` | JSONB | Available quality grades and prices |
| `images` | JSONB | Array of product image URLs |
| `available_from_date` | Date | When product becomes available |
| `available_to_date` | Date | Nullable, when product is no longer available |
| `min_order_quantity` | Decimal | Minimum order amount |
| `max_order_quantity` | Decimal | Nullable, maximum order amount |
| `is_active` | Boolean | Whether product is currently listed |
| `is_featured` | Boolean | Featured product flag |
| `tags` | JSONB | Array of tags for search/filtering |
| `custom_fields` | JSONB | Additional flexible data |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `product_pricing_tiers` - Volume Discounts
Tiered pricing for bulk orders.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `product_id` | Integer | FK to products |
| `tier_name` | String | Name of tier (e.g., "Wholesale") |
| `min_quantity` | Decimal | Minimum quantity for this tier |
| `max_quantity` | Decimal | Nullable, maximum quantity |
| `price_per_unit` | Decimal | Price at this tier |
| `discount_percentage` | Decimal | Discount from base price |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 5. ORDERS & SALES

#### `orders` - Customer Orders
Orders placed by buyers.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `customer_contact_id` | Integer | FK to contacts |
| `seller_account_id` | Integer | FK to accounts |
| `order_number` | String | Unique order identifier |
| `order_date` | Timestamp | When order was placed |
| `fulfillment_date` | Date | Nullable, when order was fulfilled |
| `order_status` | Enum | pending/confirmed/preparing/ready/shipped/delivered/cancelled |
| `payment_status` | Enum | pending/paid/partial/refunded |
| `subtotal` | Decimal | Sum of all items |
| `tax` | Decimal | Tax amount |
| `shipping_cost` | Decimal | Delivery cost |
| `total_amount` | Decimal | Grand total |
| `currency` | String | Currency code |
| `payment_method` | Enum | cash/card/bank_transfer/mobile_money/other |
| `payment_reference` | String | Transaction reference |
| `delivery_method` | Enum | pickup/delivery/shipping |
| `delivery_address` | Text | Delivery address if applicable |
| `delivery_notes` | Text | Special delivery instructions |
| `notes` | Text | Internal notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

**Relationships:**
- Belongs to: `Contact` (customer), `Account` (seller)
- Has many: `OrderItem`

---

#### `order_items` - Items in Orders
Individual line items within an order.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `order_id` | Integer | FK to orders |
| `product_id` | Integer | FK to products |
| `quantity` | Decimal | Quantity ordered |
| `unit` | String | Unit of measurement |
| `price_per_unit` | Decimal | Price at time of order |
| `total_price` | Decimal | Calculated: quantity × price |
| `inventory_item_id` | Integer | Nullable, specific inventory item used |
| `quality_grade` | String | Quality grade selected |
| `notes` | Text | Item-specific notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 6. TASKS & SCHEDULING

#### `tasks` - Farm Task Management
Schedule and track farm tasks.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts (task owner) |
| `assigned_to_account_id` | Integer | Nullable, FK to accounts (assignee) |
| `task_title` | String | Task title |
| `description` | Text | Detailed task description |
| `task_type` | Enum | planting/harvest/feeding/treatment/maintenance/inspection/other |
| `priority` | Enum | low/medium/high/urgent |
| `status` | Enum | pending/in_progress/completed/cancelled |
| `due_date` | Date | When task should be completed |
| `completed_date` | Date | Nullable, when task was completed |
| `related_animal_id` | Integer | Nullable, FK to animals |
| `related_planting_id` | Integer | Nullable, FK to crop_plantings |
| `related_equipment_id` | Integer | Nullable, FK to equipment |
| `estimated_duration_hours` | Decimal | Estimated time to complete |
| `actual_duration_hours` | Decimal | Nullable, actual time taken |
| `recurrence_rule` | JSONB | Nullable, rule for recurring tasks |
| `notes` | Text | Additional notes |
| `attachments` | JSONB | Array of attachment URLs |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `task_checklists` - Task Sub-items
Checklist items within tasks.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `task_id` | Integer | FK to tasks |
| `checklist_item` | String | Checklist item description |
| `is_completed` | Boolean | Completion status |
| `completed_at` | Timestamp | Nullable, when completed |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 7. EQUIPMENT & TOOLS

#### `equipment` - Farm Equipment Registry
Track farm machinery and equipment.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `equipment_name` | String | Equipment name |
| `equipment_type` | Enum | tractor/plow/sprayer/harvester/truck/irrigation_system/other |
| `make` | String | Manufacturer |
| `model` | String | Model number |
| `serial_number` | String | Serial number |
| `year` | Integer | Year of manufacture |
| `purchase_date` | Date | Date purchased |
| `purchase_price` | Decimal | Purchase cost |
| `current_value` | Decimal | Current estimated value |
| `location` | String | Where equipment is stored |
| `status` | Enum | available/in_use/maintenance/retired |
| `notes` | Text | Additional notes |
| `photos` | JSONB | Array of equipment photos |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `equipment_maintenance` - Maintenance Records
Track equipment service and repairs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `equipment_id` | Integer | FK to equipment |
| `maintenance_type` | Enum | routine/repair/inspection/upgrade |
| `scheduled_date` | Date | When maintenance was scheduled |
| `completed_date` | Date | Nullable, when completed |
| `performed_by` | Enum | internal/external |
| `service_provider_contact_id` | Integer | Nullable, FK to contacts |
| `description` | Text | What was done |
| `parts_used` | JSONB | Array of parts/materials |
| `cost` | Decimal | Total maintenance cost |
| `next_service_date` | Date | Nullable, when next service is due |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `equipment_usage_logs` - Usage Tracking
Track equipment usage for cost allocation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `equipment_id` | Integer | FK to equipment |
| `used_by_account_id` | Integer | FK to accounts |
| `usage_date` | Date | Date used |
| `duration_hours` | Decimal | How long it was used |
| `field_id` | Integer | Nullable, FK to fields |
| `task_id` | Integer | Nullable, FK to tasks |
| `fuel_used` | Decimal | Amount of fuel consumed |
| `cost` | Decimal | Operational cost |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 8. CONTACTS (Customers, Suppliers, Service Providers)

#### `contacts` - Contact Directory
Manage all external contacts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `contact_type` | Enum | customer/supplier/veterinarian/contractor/advisor/buyer/other |
| `contact_name` | String | Person or business name |
| `email` | String | Email address |
| `phone` | String | Phone number |
| `address` | Text | Physical address |
| `postal_code` | String | Postal/ZIP code |
| `city` | String | City |
| `country` | String | Country |
| `business_name` | String | Nullable, business name if different |
| `tax_id` | String | Nullable, tax/VAT ID |
| `payment_terms` | String | Payment terms (e.g., "Net 30") |
| `credit_limit` | Decimal | Nullable, credit limit |
| `preferred_contact_method` | Enum | email/phone/sms/whatsapp |
| `tags` | JSONB | Array of tags for categorization |
| `notes` | Text | Additional notes |
| `is_active` | Boolean | Active status |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `contact_interactions` - Communication Log
Track communications with contacts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `contact_id` | Integer | FK to contacts |
| `interaction_type` | Enum | call/email/meeting/visit/sms |
| `interaction_date` | Timestamp | When interaction occurred |
| `performed_by_account_id` | Integer | FK to accounts |
| `subject` | String | Subject/topic |
| `notes` | Text | Interaction notes |
| `follow_up_date` | Date | Nullable, when to follow up |
| `created_at` | Timestamp | Auto-generated |

---

### 9. FINANCIAL TRANSACTIONS

#### `transactions` - Income and Expense Tracking
Track all financial transactions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `transaction_date` | Date | Date of transaction |
| `transaction_type` | Enum | income/expense |
| `category` | String | Transaction category |
| `subcategory` | String | Nullable, sub-category |
| `description` | Text | Transaction description |
| `amount` | Decimal | Transaction amount |
| `currency` | String | Currency code |
| `payment_method` | Enum | cash/card/bank_transfer/mobile_money/check |
| `related_contact_id` | Integer | Nullable, FK to contacts |
| `related_order_id` | Integer | Nullable, FK to orders |
| `related_inventory_id` | Integer | Nullable, FK to inventory_items |
| `receipt_url` | String | Nullable, S3 URL to receipt/invoice |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `accounting_categories` - Transaction Categories
Define categories for financial reporting.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | Nullable (system defaults vs custom) |
| `category_name` | String | Category name |
| `parent_category_id` | Integer | Nullable, for subcategories |
| `category_type` | Enum | income/expense |
| `is_active` | Boolean | Active status |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 10. CLIMATE & ENVIRONMENTAL TRACKING

#### `climate_gauges` - Weather Stations and Sensors
Register climate monitoring devices.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `gauge_name` | String | Gauge/sensor name |
| `gauge_type` | Enum | weather_station/rain_gauge/soil_sensor/temperature_probe |
| `location_coordinates` | PostGIS POINT | GPS coordinates |
| `field_id` | Integer | Nullable, FK to fields |
| `installation_date` | Date | When installed |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `climate_logs` - Weather and Environmental Data
Log climate data over time.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `gauge_id` | Integer | FK to climate_gauges |
| `log_date` | Date | Date of reading |
| `log_time` | Time | Time of reading |
| `temperature` | Decimal | Nullable, temperature reading |
| `humidity` | Decimal | Nullable, humidity percentage |
| `rainfall` | Decimal | Nullable, rainfall amount |
| `wind_speed` | Decimal | Nullable, wind speed |
| `soil_moisture` | Decimal | Nullable, soil moisture level |
| `soil_temperature` | Decimal | Nullable, soil temperature |
| `notes` | Text | Additional notes |
| `metadata` | JSONB | Additional sensor data |
| `created_at` | Timestamp | Auto-generated |

---

### 11. TREATMENTS (Pest Control, Fertilization, Chemicals)

#### `treatments` - Chemical Applications
Track pesticides, herbicides, and fertilizer applications.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `treatment_date` | Date | Date of application |
| `treatment_type` | Enum | pesticide/herbicide/fungicide/fertilizer/growth_regulator |
| `target` | String | Target pest/disease or deficiency |
| `field_id` | Integer | Nullable, FK to fields |
| `planting_id` | Integer | Nullable, FK to crop_plantings |
| `product_name` | String | Commercial product name |
| `active_ingredient` | String | Active chemical ingredient |
| `quantity_used` | Decimal | Amount applied |
| `unit` | String | Unit of measurement |
| `application_method` | Enum | spray/broadcast/drip/injection |
| `applicator_account_id` | Integer | FK to accounts (who applied) |
| `weather_conditions` | String | Weather during application |
| `re_entry_interval` | Integer | Hours before safe re-entry |
| `harvest_interval` | Integer | Days before safe harvest |
| `cost` | Decimal | Cost of treatment |
| `notes` | Text | Additional notes |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

### 12. FARMBRITE SYNC & INTEGRATION (Optional)

#### `farmbrite_connections` - API Connection Status
Store Farmbrite API credentials and sync status.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `api_access_token` | String | Encrypted API token |
| `api_refresh_token` | String | Nullable, encrypted refresh token |
| `farmbrite_user_id` | String | Farmbrite user ID |
| `sync_enabled` | Boolean | Whether sync is active |
| `last_sync_at` | Timestamp | Nullable, last successful sync |
| `sync_status` | Enum | idle/syncing/error |
| `error_message` | Text | Nullable, last error |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

---

#### `sync_logs` - Sync Audit Trail
Track all sync operations for debugging.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `account_id` | Integer | FK to accounts |
| `entity_type` | Enum | animal/crop/inventory/product/order/etc |
| `entity_id` | Integer | Local entity ID |
| `farmbrite_entity_id` | String | Farmbrite entity ID |
| `sync_direction` | Enum | push/pull/bidirectional |
| `sync_timestamp` | Timestamp | When sync occurred |
| `status` | Enum | success/failed/partial |
| `error_details` | Text | Nullable, error information |
| `data_snapshot` | JSONB | Data snapshot for conflict resolution |
| `created_at` | Timestamp | Auto-generated |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Set up core database structure and base models

**Tasks**:
1. Create all SQLAlchemy models in `app/models/`:
   - `animal.py` - All animal-related models
   - `crop.py` - All crop-related models
   - `inventory.py` - All inventory-related models
   - `product.py` - Product and order models
   - `task.py` - Task management models
   - `equipment.py` - Equipment models
   - `contact.py` - Contact models
   - `transaction.py` - Financial models
   - `climate.py` - Climate tracking models
   - `treatment.py` - Treatment models
   - `farmbrite.py` - Farmbrite integration models

2. Generate Alembic migration scripts
   ```bash
   alembic revision --autogenerate -m "Add complete farm management schema"
   alembic upgrade head
   ```

3. Create Pydantic schemas in `app/schemas/`:
   - Request/response schemas for all models
   - Validation rules
   - Nested schemas for relationships

4. Update `app/models/__init__.py` and `app/schemas/__init__.py` with all exports

**Deliverables**:
- ✅ Complete database schema deployed
- ✅ All models documented with docstrings
- ✅ Migration scripts tested
- ✅ Pydantic schemas validated

---

### Phase 2: Core Services (Weeks 4-6)
**Goal**: Build service layer for business logic

**Tasks**:
1. Create service classes in `app/services/`:
   - `animal_service.py` - Animal CRUD, health tracking, feeding
   - `crop_service.py` - Planting, activities, harvest management
   - `inventory_service.py` - Stock management, transactions, alerts
   - `product_service.py` - Product catalog, pricing
   - `order_service.py` - Order processing, fulfillment
   - `task_service.py` - Task creation, scheduling, completion
   - `equipment_service.py` - Equipment tracking, maintenance
   - `contact_service.py` - Contact management
   - `transaction_service.py` - Financial tracking
   - `climate_service.py` - Climate data logging
   - `treatment_service.py` - Treatment application tracking

2. Implement business logic:
   - Validation rules
   - Calculations (yields, costs, inventory values)
   - Status transitions
   - Automated workflows

3. Add error handling and logging

**Deliverables**:
- ✅ All services with comprehensive CRUD operations
- ✅ Business logic implemented and tested
- ✅ Service documentation

---

### Phase 3: API Endpoints (Weeks 7-9)
**Goal**: Expose functionality through REST API

**Tasks**:
1. Create endpoint files in `app/api/v1/endpoints/`:
   - `animals.py` - Animal management endpoints
   - `crops.py` - Crop management endpoints
   - `inventory.py` - Enhanced inventory (replace existing stubs)
   - `products.py` - Product management
   - `orders.py` - Order management
   - `tasks.py` - Task management
   - `equipment.py` - Equipment management
   - `contacts.py` - Contact management
   - `transactions.py` - Financial tracking
   - `climate.py` - Climate data
   - `treatments.py` - Treatment tracking
   - `dashboard.py` - Dashboard/analytics

2. Update `app/api/v1/api.py` to include all routers

3. Implement:
   - Authorization checks (farmers can only access their own data)
   - Pagination for list endpoints
   - Filtering and sorting
   - Search functionality
   - Bulk operations

**Endpoint Structure Example**:
```python
# GET /api/v1/animals - List all animals
# POST /api/v1/animals - Create animal
# GET /api/v1/animals/{id} - Get animal details
# PUT /api/v1/animals/{id} - Update animal
# DELETE /api/v1/animals/{id} - Delete animal
# GET /api/v1/animals/{id}/health - Get health records
# POST /api/v1/animals/{id}/health - Add health record
# GET /api/v1/animals/{id}/measurements - Get measurements
# POST /api/v1/animals/{id}/measurements - Add measurement
```

**Deliverables**:
- ✅ Complete REST API for all resources
- ✅ API documentation (OpenAPI/Swagger)
- ✅ Authorization implemented
- ✅ Pagination and filtering working

---

### Phase 4: Farmbrite Integration (Weeks 10-12)
**Goal**: Build optional Farmbrite sync capability

**Tasks**:
1. Create Farmbrite API client (`app/services/farmbrite_api.py`):
   - Authentication handling
   - Rate limiting (120 requests/min)
   - Error handling and retries
   - Request/response logging

2. Create sync service (`app/services/farmbrite_sync.py`):
   - Pull data from Farmbrite → local DB
   - Push data from local DB → Farmbrite
   - Conflict resolution logic
   - Incremental sync (only changed data)

3. Create sync endpoints (`app/api/v1/endpoints/farmbrite.py`):
   ```python
   POST /api/v1/farmbrite/connect - Connect Farmbrite account
   GET /api/v1/farmbrite/status - Check sync status
   POST /api/v1/farmbrite/sync - Trigger manual sync
   POST /api/v1/farmbrite/sync/{entity_type} - Sync specific entity
   DELETE /api/v1/farmbrite/disconnect - Disconnect
   ```

4. Implement background sync:
   - Use Celery or AWS SQS for async jobs
   - Scheduled sync (every 15-30 minutes)
   - Webhook handlers (if Farmbrite supports)

5. Add sync status indicators to all relevant models

**Configuration** (add to `app/core/config.py`):
```python
FARMBRITE_API_URL: str = "https://api.farmbrite.com/v1"
FARMBRITE_RATE_LIMIT: int = 120  # requests per minute
SYNC_INTERVAL_MINUTES: int = 15
```

**Deliverables**:
- ✅ Farmbrite API client operational
- ✅ Bidirectional sync working
- ✅ Conflict resolution tested
- ✅ Background sync jobs running
- ✅ Sync audit trail in database

---

### Phase 5: Advanced Features (Weeks 13-15)
**Goal**: Add analytics, reporting, and advanced functionality

**Tasks**:
1. **Dashboard & Analytics**:
   - Farm overview dashboard
   - Inventory alerts (low stock, expiring items)
   - Financial summaries (profit/loss, expenses by category)
   - Crop performance metrics
   - Animal health summaries

2. **Reporting**:
   - Harvest reports
   - Sales reports
   - Expense reports
   - Inventory valuation
   - Export to CSV/Excel

3. **Notifications**:
   - Task reminders
   - Inventory alerts
   - Harvest time alerts
   - Maintenance due notifications
   - Email/SMS integration

4. **Advanced Features**:
   - Crop rotation planning
   - Field mapping (GIS integration)
   - Weather forecast integration
   - Mobile app API optimization
   - Offline sync for mobile (PWA support)

**Deliverables**:
- ✅ Dashboard with key metrics
- ✅ Reporting system operational
- ✅ Notification system working
- ✅ Advanced features documented

---

### Phase 6: Testing & Documentation (Weeks 16-18)
**Goal**: Ensure quality and provide comprehensive documentation

**Tasks**:
1. **Unit Tests**:
   - Test all service methods
   - Test validation logic
   - Test calculations

2. **Integration Tests**:
   - Test API endpoints
   - Test database operations
   - Test Farmbrite sync

3. **Performance Testing**:
   - Load testing for high-traffic endpoints
   - Database query optimization
   - Indexing strategy

4. **Documentation**:
   - API documentation (Swagger/ReDoc)
   - Developer guide
   - User guide
   - Database schema documentation
   - Deployment guide

5. **Security Audit**:
   - Authentication/authorization review
   - SQL injection prevention
   - XSS prevention
   - Sensitive data encryption
   - Rate limiting implementation

**Deliverables**:
- ✅ Test coverage >80%
- ✅ All tests passing
- ✅ Complete documentation
- ✅ Security audit completed
- ✅ Performance optimized

---

## Technical Stack Summary

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL 13+
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Validation**: Pydantic 2.0
- **Authentication**: AWS Cognito + JWT
- **Background Jobs**: Celery + Redis (or AWS SQS)

### Cloud Services (AWS)
- **Compute**: Lambda (serverless)
- **Database**: RDS PostgreSQL
- **Storage**: S3 (photos, documents, receipts)
- **CDN**: CloudFront
- **Messaging**: SNS/SQS
- **Monitoring**: CloudWatch

### Development Tools
- **Testing**: pytest, pytest-asyncio
- **Code Quality**: black, isort, flake8, mypy
- **API Testing**: httpx, Postman
- **Version Control**: Git

---

## Database Best Practices

### Indexing Strategy
```sql
-- Critical indexes for performance
CREATE INDEX idx_animals_account_id ON animals(account_id);
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animals_type ON animals(animal_type);

CREATE INDEX idx_crop_plantings_account_id ON crop_plantings(account_id);
CREATE INDEX idx_crop_plantings_status ON crop_plantings(status);
CREATE INDEX idx_crop_plantings_dates ON crop_plantings(planting_date, expected_harvest_date);

CREATE INDEX idx_inventory_items_account_id ON inventory_items(account_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_expiry ON inventory_items(expiry_date);

CREATE INDEX idx_orders_customer_id ON orders(customer_contact_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_account_id);
CREATE INDEX idx_orders_status ON orders(order_status);

CREATE INDEX idx_tasks_account_id ON tasks(account_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_account_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### Data Integrity
- Use foreign key constraints
- Set appropriate `ON DELETE` behaviors (CASCADE, SET NULL, RESTRICT)
- Use CHECK constraints for enum-like fields
- Use NOT NULL where appropriate
- Set default values sensibly

### Performance Optimization
- Use JSONB for flexible fields (enables indexing)
- Implement soft deletes where appropriate (is_deleted flag)
- Archive old data (completed tasks, fulfilled orders)
- Use database views for complex reporting queries
- Implement caching for frequently accessed data (Redis)

### Backup Strategy
- Daily automated backups (AWS RDS automated backups)
- Weekly manual backups to S3
- Test restore procedures monthly
- Keep backups for 30 days minimum

---

## Migration Path Away from Farmbrite

### Option 1: Gradual Migration (Recommended)
1. **Month 1-3**: Run both systems in parallel, Farmbrite as primary
2. **Month 4-6**: Switch to BeyondAgri as primary, Farmbrite as backup
3. **Month 7-9**: Phase out Farmbrite sync, evaluate missing features
4. **Month 10+**: Full independence from Farmbrite

### Option 2: Immediate Cut-over
1. Do one-time complete data import from Farmbrite
2. Disable sync
3. Use only BeyondAgri system

### Data Export/Import
Create utility scripts:
```bash
# Export all data from Farmbrite
python scripts/export_farmbrite_data.py --output /path/to/export

# Import into BeyondAgri
python scripts/import_to_beyondagri.py --input /path/to/export

# Verify data integrity
python scripts/verify_migration.py
```

---

## Security Considerations

### Data Protection
- **Encryption at Rest**: Use AWS RDS encryption
- **Encryption in Transit**: HTTPS only, TLS 1.2+
- **API Tokens**: Encrypt Farmbrite tokens in database
- **Sensitive Fields**: Encrypt payment info, tax IDs
- **Access Control**: Role-based access (farmers see only their data)

### Authentication & Authorization
```python
# Authorization decorator example
@require_farmer_ownership("animal_id")
async def get_animal(animal_id: int, current_account: Account):
    # Only animal owner can access
    pass
```

### Audit Trail
- Log all data modifications (who, what, when)
- Track sync operations
- Monitor failed login attempts
- Alert on suspicious activity

---

## Monitoring & Alerts

### Key Metrics to Track
- API response times
- Database query performance
- Farmbrite sync success rate
- Background job completion
- Error rates by endpoint
- Storage usage (S3, database)

### Alerts to Configure
- Sync failures (email to admin)
- High error rates
- Database connection issues
- Low disk space
- Unusual traffic patterns

---

## Cost Considerations

### Database Size Estimates (per farmer, per year)
- Animals: ~500 records (50 animals × 10 measurements/health records each)
- Crops: ~200 records (20 plantings × 10 activities/harvests each)
- Inventory: ~500 records
- Orders: ~100 records
- Tasks: ~300 records
- Total: ~1,600 records/farmer/year

**For 1,000 farmers**: ~1.6M records/year
**Database size**: Estimated 10-20 GB/year

### API Call Estimates (Farmbrite)
- Initial sync per farmer: ~500-1,000 API calls
- Incremental sync: ~10-50 calls per sync
- At 15-minute intervals: ~2,000-5,000 calls/day per farmer
- **Rate limit**: 120 calls/minute = safe for ~10 active syncs simultaneously

### Cost Optimization
- Cache frequently accessed data (Redis)
- Batch Farmbrite API calls where possible
- Implement smart sync (only sync entities marked for marketplace)
- Archive old data to reduce active database size

---

## Next Steps

1. **Review and approve this plan**
2. **Set up development environment** (PostgreSQL, Redis, etc.)
3. **Create project timeline and milestones**
4. **Start Phase 1: Database models implementation**
5. **Request Farmbrite API access** (if not already obtained)
6. **Set up CI/CD pipeline**
7. **Begin implementation**

---

## Appendix: Sample API Requests

### Creating an Animal
```json
POST /api/v1/animals
{
  "animal_type": "cattle",
  "animal_identifier": "TAG-001",
  "breed": "Nguni",
  "gender": "female",
  "birth_date": "2023-01-15",
  "acquisition_date": "2023-03-20",
  "current_weight": 450.5,
  "location": "Pasture A",
  "notes": "Healthy heifer, good breeding stock"
}
```

### Creating a Crop Planting
```json
POST /api/v1/crops/plantings
{
  "plant_type_id": 5,
  "field_id": 2,
  "planting_name": "Summer Tomatoes 2025",
  "planting_date": "2025-10-01",
  "expected_harvest_date": "2025-12-15",
  "area_planted": 0.5,
  "unit": "hectares",
  "quantity_planted": 2000,
  "planting_method": "transplant",
  "status": "planted",
  "estimated_yield": 5000,
  "yield_unit": "kg"
}
```

### Recording a Harvest
```json
POST /api/v1/crops/plantings/123/harvests
{
  "harvest_date": "2025-12-10",
  "quantity_harvested": 4850,
  "unit": "kg",
  "quality_grade": "A",
  "destination": "to_inventory",
  "notes": "Excellent yield, good weather conditions"
}
```

### Creating a Marketplace Product
```json
POST /api/v1/products
{
  "product_name": "Fresh Roma Tomatoes",
  "description": "Organically grown Roma tomatoes, perfect for cooking",
  "category": "fresh_produce",
  "base_price": 25.00,
  "unit": "kg",
  "currency": "ZAR",
  "certifications": ["organic", "locally_grown"],
  "images": ["https://cdn.beyondagri.com/products/tomatoes-001.jpg"],
  "min_order_quantity": 5,
  "is_active": true
}
```

---

## Questions & Clarifications

Before starting implementation, please confirm:

1. **Farmbrite API Access**: Do you already have Farmbrite API credentials?
2. **Sync Strategy**: Do you want to start with Farmbrite sync immediately, or build local system first?
3. **Priority Resources**: Which resource types are most critical for MVP? (Animals? Crops? Inventory?)
4. **Mobile App**: Are you planning a mobile app that will use these endpoints?
5. **Geographic Focus**: Which regions will you support? (affects currency, units, regulations)
6. **Multi-tenancy**: Will you support multiple farms per account, or one account = one farm?

---

## Success Criteria

This implementation will be considered successful when:

✅ All database models deployed and tested
✅ Full CRUD operations available for all resources
✅ API documentation complete and accurate
✅ Farmbrite sync operational (if required)
✅ Authorization and security implemented
✅ Performance meets SLAs (<200ms for most endpoints)
✅ Test coverage >80%
✅ Production deployment successful
✅ Can operate independently of Farmbrite

---

**Document Version**: 1.0
**Last Updated**: 2025-09-30
**Author**: BeyondAgri Development Team
**Status**: Ready for Review
