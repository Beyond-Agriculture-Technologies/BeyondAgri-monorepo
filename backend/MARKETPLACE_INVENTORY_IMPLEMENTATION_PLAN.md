# Digital Marketplace & Inventory Management Implementation Plan

## Executive Summary

This document outlines the implementation strategy for BeyondAgri's **Digital Marketplace (B2B/B2C)** and **Inventory Management** features. Based on research into Farmbrite's API capabilities and limitations, this plan recommends building an independent system that fully meets our requirements while maintaining the option to integrate with Farmbrite in the future.

---

## Strategic Decision: Independent Build vs. Farmbrite Integration

### Farmbrite API Research Findings

#### **API Access Status**
- ⚠️ Currently in **beta testing stage**
- ⚠️ **Not openly available** - requires direct approval from Farmbrite support
- ⚠️ Must request access through user profile
- ⚠️ Approval timeline unknown

#### **Known API Capabilities** (from Zapier integration)
**Triggers (Read Operations):**
- New contact created
- New event on schedule
- New livestock yield record
- New order created
- New accounting transaction

**Actions (Write Operations):**
- Create animal measurements
- Create climate log entries

**Rate Limits:**
- 120 requests per minute

#### **Farmbrite Product Features**

**✅ Inventory Management Strengths:**
- Inventory tracking by type, variety, SKU
- Quantity on hand tracking
- **Lot/batch number tracking**
- **Expiration date tracking**
- **Low stock email alerts**
- Storage location (warehouse & bin) tracking
- Inventory linked to products and harvests
- Estimated value tracking

**✅ Basic Marketplace Features:**
- Product listings (SKU, retail/wholesale pricing, categories)
- Product status (Available, Back Ordered, Sold Out, Draft, Hidden)
- Order management
- Market dashboard (revenue, orders, top sellers)
- Delivery options (Shipped, Pickup, Delivery)
- Product images and descriptions

**❌ Critical Gaps for Our Requirements:**
- No payment gateway integration (no Stripe, PayFast, etc.)
- Not a true B2B/B2C marketplace platform
- No buyer-seller matching or discovery
- No wholesaler workflow support
- No pricing negotiation features
- Limited to farm management context, not multi-party trading
- No auction or bulk trading features

---

## Recommendation: Build Independent System

### Why Independent Build?

1. **Farmbrite is Farm Management, Not Marketplace**
   - Designed for internal farm operations
   - Not built for farmer → wholesaler → retailer workflows
   - No payment processing capabilities
   - Limited multi-party transaction support

2. **Our Requirements Need Custom Workflows**
   - Farmer ↔ Wholesaler ("The King") trading
   - Wholesaler ↔ Retailers/Businesses
   - Future: Direct farmer → customer
   - Payment gateway integration (Stripe, PayFast, SA alternatives)
   - Batch management for wholesalers
   - Complex notification system

3. **We Already Have Complete Schema**
   - `FARM_MANAGEMENT_IMPLEMENTATION_PLAN.md` provides comprehensive design
   - Covers all inventory, products, orders, and marketplace needs
   - Designed for our specific use cases

4. **Data Ownership & Control**
   - Full control over features and pricing
   - No per-farmer subscription costs to third party
   - Can optimize for South African market
   - Scale independently

5. **Flexibility for Future**
   - Can still add optional Farmbrite sync later if beneficial
   - Allows farmers to use Farmbrite internally while trading on our platform
   - Not locked into third-party limitations

---

## Implementation Plan

### Overview

**Total Timeline:** 16 weeks (4 months)
**Approach:** Agile sprints, MVP-first
**Database:** PostgreSQL with schema from `FARM_MANAGEMENT_IMPLEMENTATION_PLAN.md`
**API:** FastAPI REST endpoints
**Priority:** Inventory → Products → Orders → Payments → Notifications

---

## Phase 1: Foundation & Core Inventory (Weeks 1-4)

### Objectives
- Set up database models for inventory management
- Build REST API for inventory operations
- Implement batch/lot tracking
- Add expiry date management
- Create low stock alert system

### Database Models to Implement

#### 1.1 `inventory_types` - Item Catalog
Master catalog of inventory item types.

**Fields:**
- `id`, `account_id` (nullable for system defaults)
- `type_name` (e.g., "Tomatoes", "Beef", "Chicken")
- `category` (harvest/meat/poultry/packaging/supplies)
- `unit_of_measure` (kg, dozen, bunch, etc.)
- `perishable` (boolean)
- `typical_shelf_life_days`
- `reorder_point`, `reorder_quantity`
- Timestamps

#### 1.2 `warehouses` - Storage Facilities
Physical storage locations for farmers and wholesalers.

**Fields:**
- `id`, `account_id`
- `warehouse_name`
- `location` (address)
- `storage_capacity`, `unit`
- `temperature_controlled` (boolean)
- Timestamps

#### 1.3 `storage_bins` - Storage Subdivisions
Bins/sections within warehouses.

**Fields:**
- `id`, `warehouse_id`
- `bin_name`, `bin_code`
- `capacity`, `unit`
- Timestamps

#### 1.4 `inventory_items` - Actual Stock
Individual inventory items in stock.

**Critical Fields:**
- `id`, `account_id`, `inventory_type_id`
- `warehouse_id`, `bin_id`
- `item_name`, `description`, `sku`
- **`current_quantity`**, `unit`
- **`minimum_quantity`** (for low stock alerts)
- `acquisition_date`, **`expiry_date`**
- `cost_per_unit`, `total_value`
- **`batch_number`**, **`lot_number`**
- `status` (available/reserved/sold/expired/damaged)
- `related_crop_id`, `related_animal_id` (traceability)
- `photos` (JSONB array of S3 URLs)
- Timestamps

#### 1.5 `inventory_transactions` - Stock Movement Log
Track all inventory changes for audit trail.

**Fields:**
- `id`, `inventory_item_id`
- `transaction_type` (add/remove/adjustment/transfer/sale/spoilage)
- `transaction_date`
- `quantity_change` (positive = add, negative = remove)
- `from_location_id`, `to_location_id` (for transfers)
- `cost_per_unit`, `total_cost`
- `related_order_id`, `related_task_id`
- `performed_by_account_id`
- `notes`
- Timestamp

### API Endpoints to Build

```
# Inventory Types
GET    /api/v1/inventory/types           # List all inventory types
POST   /api/v1/inventory/types           # Create new type
GET    /api/v1/inventory/types/:id       # Get type details
PUT    /api/v1/inventory/types/:id       # Update type
DELETE /api/v1/inventory/types/:id       # Delete type

# Warehouses
GET    /api/v1/inventory/warehouses      # List warehouses
POST   /api/v1/inventory/warehouses      # Create warehouse
GET    /api/v1/inventory/warehouses/:id  # Get warehouse
PUT    /api/v1/inventory/warehouses/:id  # Update warehouse
DELETE /api/v1/inventory/warehouses/:id  # Delete warehouse

# Storage Bins
GET    /api/v1/inventory/warehouses/:id/bins     # List bins in warehouse
POST   /api/v1/inventory/warehouses/:id/bins     # Create bin
PUT    /api/v1/inventory/bins/:id                # Update bin
DELETE /api/v1/inventory/bins/:id                # Delete bin

# Inventory Items
GET    /api/v1/inventory/items           # List items (with filters)
POST   /api/v1/inventory/items           # Create item
GET    /api/v1/inventory/items/:id       # Get item details
PUT    /api/v1/inventory/items/:id       # Update item
DELETE /api/v1/inventory/items/:id       # Delete item

# Inventory Transactions
GET    /api/v1/inventory/items/:id/transactions  # Get item transaction history
POST   /api/v1/inventory/items/:id/transactions  # Log transaction
GET    /api/v1/inventory/transactions            # List all transactions

# Alerts & Reports
GET    /api/v1/inventory/alerts/low-stock        # Get low stock items
GET    /api/v1/inventory/alerts/expiring         # Get items expiring soon
GET    /api/v1/inventory/reports/valuation       # Inventory valuation report
GET    /api/v1/inventory/reports/movements       # Stock movement report
```

### Business Logic to Implement

**1.4.1 Low Stock Alert System**
```python
# Service: InventoryService.check_low_stock()
# Trigger: Scheduled job (daily) + on inventory transaction
# Logic: current_quantity <= minimum_quantity
# Action: Create notification, send email/SMS
```

**1.4.2 Expiry Alert System**
```python
# Service: InventoryService.check_expiring_items()
# Trigger: Scheduled job (daily)
# Thresholds:
#   - 7 days: Warning
#   - 3 days: Urgent
#   - Expired: Critical
# Action: Create notifications with different severity levels
```

**1.4.3 Batch/Lot Tracking**
```python
# Service: InventoryService.get_items_by_batch()
# Use case: Trace all items from specific harvest/delivery
# Enable FIFO (First In First Out) inventory management
```

**1.4.4 Automatic Inventory Valuation**
```python
# Update total_value on every transaction
# total_value = current_quantity × cost_per_unit
```

### Service Classes

Create `app/services/inventory_service.py`:
```python
class InventoryService:
    def create_item(...)
    def update_quantity(...)
    def transfer_item(...)
    def check_low_stock(...)
    def check_expiring_items(...)
    def get_items_by_batch(...)
    def calculate_total_value(...)
    def record_transaction(...)
    def get_inventory_valuation(...)
    def get_stock_movement_report(...)
```

### Testing Requirements
- Unit tests for all service methods
- Test low stock detection logic
- Test expiry date calculations
- Test batch tracking
- Test transaction logging
- Test inventory valuation calculations

### Deliverables
✅ Complete inventory database schema deployed
✅ All inventory CRUD endpoints operational
✅ Batch/lot tracking functional
✅ Expiry date tracking working
✅ Low stock alert system running
✅ Transaction audit trail complete
✅ API documentation in Swagger
✅ Unit tests passing (>80% coverage)

---

## Phase 2: Harvest Yield Tracking (Weeks 5-6)

### Objectives
- Link farm production to inventory
- Track harvest yields for crops
- Track livestock/poultry yields
- Automatic inventory creation from harvests

### Database Models to Implement

#### 2.1 `plant_types` - Crop Catalog
Master list of vegetables and fruits that can be grown.

**Top 20 Vegetables/Fruits to Support:**
- Tomatoes, Cabbage, Onions, Potatoes, Carrots
- Spinach, Lettuce, Peppers, Cucumbers, Beans
- Butternut, Pumpkin, Beetroot, Broccoli, Cauliflower
- Apples, Oranges, Bananas, Avocados, Mangoes

**Fields:**
- `id`, `account_id` (null = system default)
- `plant_name`, `scientific_name`, `variety`
- `category` (vegetable/fruit)
- `growing_season`, `days_to_maturity`
- `typical_yield_per_unit`
- Timestamps

#### 2.2 `fields` - Growing Locations
Physical locations where crops are grown.

**Fields:**
- `id`, `account_id`
- `field_name`, `field_code`
- `location_coordinates` (PostGIS POINT)
- `total_area`, `unit`
- `soil_type`, `irrigation_type`
- `status` (active/fallow/resting)
- Timestamps

#### 2.3 `crop_plantings` - Active Crop Cycles
Individual planting events.

**Fields:**
- `id`, `account_id`, `plant_type_id`, `field_id`
- `planting_name`
- `planting_date`, `expected_harvest_date`, `actual_harvest_date`
- `area_planted`, `quantity_planted`
- `status` (planned/planted/growing/harvested/failed)
- `estimated_yield`, `actual_yield`, `yield_unit`
- Timestamps

#### 2.4 `crop_harvests` - Harvest Records
Track harvest events and yields.

**Fields:**
- `id`, `planting_id`
- `harvest_date`
- `quantity_harvested`, `unit`
- `quality_grade` (A/B/C/premium/standard/seconds)
- `harvested_by_account_id`
- **`destination`** (to_inventory/direct_sale/personal_use/waste)
- **`inventory_item_id`** (link to created inventory)
- Timestamps

#### 2.5 `animals` - Livestock Tracking
For meat and poultry production.

**Animal Types to Support:**
- Beef: Cattle (Nguni, Bonsmara, etc.)
- Pork: Pigs
- Poultry: Chickens, Turkeys, Ducks

**Fields:**
- `id`, `account_id`
- `animal_type` (cattle/pig/chicken/turkey/duck)
- `animal_identifier`
- `breed`, `gender`, `birth_date`
- `current_weight`, `target_weight`
- `status` (active/sold/deceased/ready_for_market)
- Timestamps

#### 2.6 `animal_measurements` - Livestock Yields
Track production (eggs, milk) and weight gain.

**Fields:**
- `id`, `animal_id`
- `measurement_type` (weight/egg_count/milk_yield)
- `value`, `unit`
- `measured_at`
- **`creates_inventory`** (boolean - for eggs, milk)
- **`inventory_item_id`** (link to created inventory)
- Timestamps

### API Endpoints to Build

```
# Plant Types
GET    /api/v1/crops/plant-types         # List plant types
POST   /api/v1/crops/plant-types         # Create custom plant type

# Fields
GET    /api/v1/crops/fields              # List fields
POST   /api/v1/crops/fields              # Create field
PUT    /api/v1/crops/fields/:id          # Update field

# Crop Plantings
GET    /api/v1/crops/plantings           # List plantings
POST   /api/v1/crops/plantings           # Create planting
GET    /api/v1/crops/plantings/:id       # Get planting details
PUT    /api/v1/crops/plantings/:id       # Update planting

# Harvests
GET    /api/v1/crops/plantings/:id/harvests    # List harvests for planting
POST   /api/v1/crops/plantings/:id/harvests    # Record harvest (auto-creates inventory)
GET    /api/v1/crops/harvests                  # List all harvests

# Animals
GET    /api/v1/livestock/animals         # List animals
POST   /api/v1/livestock/animals         # Create animal
GET    /api/v1/livestock/animals/:id     # Get animal details
PUT    /api/v1/livestock/animals/:id     # Update animal

# Animal Measurements
GET    /api/v1/livestock/animals/:id/measurements    # Get measurements
POST   /api/v1/livestock/animals/:id/measurements    # Record measurement
```

### Business Logic to Implement

**2.4.1 Harvest → Inventory Automation**
```python
# Service: CropService.record_harvest()
# When harvest is recorded with destination='to_inventory':
#   1. Create inventory_item automatically
#   2. Set inventory_item.related_crop_id = planting_id
#   3. Set inventory_item.batch_number = f"HARVEST-{date}-{field_code}"
#   4. Set quantity = quantity_harvested
#   5. Calculate expiry_date based on plant_type.typical_shelf_life_days
#   6. Link harvest.inventory_item_id = created_item.id
```

**2.4.2 Quality Grade Pricing**
```python
# Different prices for A/B/C grade produce
# Store in inventory_item.custom_fields = {"quality_grade": "A"}
```

**2.6.1 Livestock Yield → Inventory**
```python
# Service: AnimalService.record_measurement()
# For egg_count measurements:
#   1. Create inventory_item (type: "eggs")
#   2. Link to animal_id for traceability
#   3. Set batch_number = f"EGGS-{date}-{coop_id}"
```

### Service Classes

Create `app/services/crop_service.py`:
```python
class CropService:
    def create_planting(...)
    def record_harvest(...)  # Auto-creates inventory
    def calculate_yield_efficiency(...)
    def get_harvest_history(...)
```

Create `app/services/animal_service.py`:
```python
class AnimalService:
    def create_animal(...)
    def record_measurement(...)  # Auto-creates inventory for yields
    def calculate_growth_rate(...)
    def get_ready_for_market(...)
```

### Deliverables
✅ Crop planting and harvest tracking operational
✅ Livestock and yield tracking functional
✅ Automatic inventory creation from harvests working
✅ Batch traceability complete (harvest → inventory)
✅ Quality grading system implemented
✅ API endpoints documented
✅ Tests passing

---

## Phase 3: Product Catalog & Marketplace (Weeks 7-10)

### Objectives
- Create marketplace product listings
- Support top 20 vegetables, fruits, meat, poultry
- Implement pricing (retail, wholesale, bulk)
- Add product media (photos, descriptions)
- Build product search and filtering
- Track product availability

### Database Models to Implement

#### 3.1 `products` - Marketplace Listings
Products available for sale on the platform.

**Fields:**
- `id`, `account_id` (seller: farmer or wholesaler)
- `product_name`, `description`
- **`category`** (fresh_produce/meat/poultry/processed)
- **`subcategory`** (vegetables/fruits/beef/pork/chicken/turkey/eggs)
- `product_type` (single/bundle/subscription)
- **`base_price`** (retail price)
- `unit` (kg, dozen, bunch, etc.)
- `currency` (ZAR)
- **`inventory_item_ids`** (JSONB array - links to inventory)
- `certifications` (JSONB - organic, halal, free_range, etc.)
- **`quality_grades_available`** (JSONB - {grade: price})
- **`images`** (JSONB array of S3 URLs)
- `available_from_date`, `available_to_date`
- `min_order_quantity`, `max_order_quantity`
- **`is_active`** (boolean - published/unpublished)
- `is_featured` (boolean)
- `tags` (JSONB - for search)
- `view_count`, `order_count` (metrics)
- Timestamps

#### 3.2 `product_pricing_tiers` - Volume/Wholesale Pricing
Tiered pricing for bulk orders.

**Fields:**
- `id`, `product_id`
- `tier_name` (e.g., "Retail", "Wholesale", "Bulk")
- `min_quantity`, `max_quantity`
- `price_per_unit`
- `discount_percentage`
- Timestamps

**Example Tiers:**
- Retail: 1-49 kg @ R25/kg
- Wholesale: 50-499 kg @ R20/kg (20% off)
- Bulk: 500+ kg @ R18/kg (28% off)

#### 3.3 `product_categories` - Category Taxonomy
Standardized product categories.

**Top-Level Categories:**
1. **Fresh Produce**
   - Vegetables (Tomatoes, Cabbage, Onions, Potatoes, Carrots, Spinach, Lettuce, Peppers, Cucumbers, Beans, Butternut, Pumpkin, Beetroot, Broccoli, Cauliflower)
   - Fruits (Apples, Oranges, Bananas, Avocados, Mangoes)

2. **Meat**
   - Beef (Whole carcass, Cuts: Steak, Mince, Brisket, etc.)
   - Pork (Whole pig, Cuts: Chops, Ribs, Bacon, etc.)

3. **Poultry**
   - Chicken (Whole chicken, Cuts: Breast, Thighs, Wings, etc.)
   - Turkey
   - Duck
   - Eggs (Chicken eggs, Duck eggs)

4. **Processed** (Future)
   - Dried, Canned, Frozen, etc.

### API Endpoints to Build

```
# Product Categories (System-managed)
GET    /api/v1/marketplace/categories               # List all categories

# Products
GET    /api/v1/marketplace/products                 # List/search products
POST   /api/v1/marketplace/products                 # Create product listing
GET    /api/v1/marketplace/products/:id             # Get product details
PUT    /api/v1/marketplace/products/:id             # Update product
DELETE /api/v1/marketplace/products/:id             # Delete product
PATCH  /api/v1/marketplace/products/:id/publish     # Publish product
PATCH  /api/v1/marketplace/products/:id/unpublish   # Unpublish product

# Product Pricing Tiers
GET    /api/v1/marketplace/products/:id/pricing     # Get pricing tiers
POST   /api/v1/marketplace/products/:id/pricing     # Add pricing tier
PUT    /api/v1/marketplace/products/pricing/:id     # Update tier
DELETE /api/v1/marketplace/products/pricing/:id     # Delete tier

# Product Search & Discovery
GET    /api/v1/marketplace/products/search          # Advanced search
GET    /api/v1/marketplace/products/featured        # Featured products
GET    /api/v1/marketplace/products/nearby          # Location-based search
GET    /api/v1/marketplace/sellers/:id/products     # Products by seller

# Seller Management
GET    /api/v1/marketplace/my-products              # My product listings
GET    /api/v1/marketplace/my-products/stats        # Sales stats
```

### Query Parameters for Search

```
GET /api/v1/marketplace/products?
  category=fresh_produce
  &subcategory=vegetables
  &product_name=tomatoes
  &min_price=10
  &max_price=50
  &quality_grade=A
  &certification=organic
  &location=gauteng
  &available_from=2025-10-15
  &sort_by=price_asc|price_desc|newest|popular
  &page=1
  &limit=20
```

### Business Logic to Implement

**3.4.1 Inventory-Linked Product Availability**
```python
# Service: ProductService.check_availability()
# Sum current_quantity of all linked inventory_items
# Product is available if total_quantity > 0
# Show "X kg available" on product listing
```

**3.4.2 Automatic Inventory Reservation on Order**
```python
# When order is created:
#   1. Reserve inventory items
#   2. Set inventory_item.status = 'reserved'
#   3. Reduce available quantity for product
# When order is cancelled:
#   1. Release reservation
#   2. Set inventory_item.status = 'available'
```

**3.4.3 Pricing Tier Selection**
```python
# Service: ProductService.calculate_price()
# Based on order quantity, select appropriate tier
# Return: {price_per_unit, tier_name, discount_percentage}
```

**3.4.4 Product Media Upload**
```python
# Service: ProductService.upload_image()
# 1. Upload to S3 bucket: beyondagri-product-images/
# 2. Generate CloudFront URL
# 3. Store in product.images array
# 4. Resize/optimize images (thumbnail, medium, large)
```

**3.4.5 Search & Filtering**
```python
# Service: ProductService.search()
# Implement full-text search on product_name, description
# Filter by category, subcategory, price range
# Filter by certifications, quality grades
# Sort by price, popularity (order_count), newest
# Use PostgreSQL full-text search or ElasticSearch
```

### Service Classes

Create `app/services/product_service.py`:
```python
class ProductService:
    def create_product(...)
    def update_product(...)
    def publish_product(...)
    def check_availability(...)
    def calculate_price(quantity)
    def search_products(filters)
    def upload_image(...)
    def get_featured_products(...)
    def get_seller_stats(...)
```

Create `app/services/media_service.py`:
```python
class MediaService:
    def upload_to_s3(...)
    def resize_image(...)
    def generate_cloudfront_url(...)
    def delete_from_s3(...)
```

### Frontend Requirements (for mobile/web teams)
- Product listing cards with images
- Search and filter UI
- Product detail page with photo gallery
- Pricing tier display
- "Add to cart" functionality
- Seller profile pages

### Deliverables
✅ Complete product catalog operational
✅ Support for top 20 vegetables, fruits, meat, poultry
✅ Tiered pricing (retail, wholesale, bulk) working
✅ Product image upload to S3 functional
✅ Search and filtering working
✅ Inventory-linked availability accurate
✅ API documentation complete
✅ Tests passing

---

## Phase 4: Order Management & Trade Workflows (Weeks 11-13)

### Objectives
- Implement order creation and management
- Build Farmer → Wholesaler workflow
- Build Wholesaler → Retailer/Business workflow
- Track order status through fulfillment
- Reserve inventory on order placement
- Calculate order totals, tax, delivery

### Database Models to Implement

#### 4.1 `contacts` - Customers/Buyers Directory
Manage buyers (wholesalers, retailers, businesses, consumers).

**Fields:**
- `id`, `account_id` (who owns this contact)
- `contact_type` (wholesaler/retailer/business/consumer/other)
- `contact_name`, `business_name`
- `email`, `phone`
- `address`, `city`, `postal_code`, `country`
- `tax_id` (VAT number for businesses)
- `payment_terms` (Net 30, COD, etc.)
- `credit_limit`
- `preferred_contact_method` (email/phone/sms/whatsapp)
- `is_active`
- Timestamps

#### 4.2 `orders` - Customer Orders
Orders placed on the marketplace.

**Fields:**
- `id`
- `order_number` (unique: ORD-20251008-001)
- **`customer_contact_id`** (FK to contacts - buyer)
- **`seller_account_id`** (FK to accounts - farmer/wholesaler)
- `order_date`
- **`order_status`** (pending/confirmed/preparing/ready/shipped/delivered/cancelled)
- **`payment_status`** (pending/paid/partial/refunded)
- `subtotal` (sum of items)
- `tax` (VAT if applicable)
- `shipping_cost`
- **`total_amount`** (subtotal + tax + shipping)
- `currency` (ZAR)
- `payment_method` (cash/card/bank_transfer/mobile_money/stripe/payfast)
- `payment_reference`
- **`delivery_method`** (pickup/delivery/shipping)
- `delivery_address`, `delivery_notes`
- `pickup_location` (if pickup)
- `fulfillment_date` (when order was completed)
- `notes` (internal)
- `metadata` (JSONB - for extensibility)
- Timestamps

#### 4.3 `order_items` - Line Items
Individual products in an order.

**Fields:**
- `id`, `order_id`
- **`product_id`** (FK to products)
- `quantity`, `unit`
- `price_per_unit` (price at time of order)
- `total_price` (quantity × price)
- `pricing_tier_applied` (which tier was used)
- **`inventory_item_id`** (specific inventory item reserved)
- `quality_grade` (if applicable)
- `notes` (item-specific requests)
- Timestamps

#### 4.4 `order_status_history` - Audit Trail
Track status changes.

**Fields:**
- `id`, `order_id`
- `old_status`, `new_status`
- `changed_by_account_id`
- `changed_at`
- `notes`

### Trade Workflow Definitions

#### **Workflow 1: Farmer → Wholesaler**
1. **Discovery**: Wholesaler browses marketplace or receives farmer's offer
2. **Order**: Wholesaler places bulk order (50+ kg typically)
3. **Confirmation**: Farmer confirms order, sets fulfillment date
4. **Preparation**: Farmer harvests/prepares product
5. **Fulfillment**:
   - Pickup: Wholesaler collects from farm
   - Delivery: Farmer delivers to wholesaler
6. **Payment**: COD, Net 30, or pre-paid via platform
7. **Completion**: Order marked delivered, inventory updated

#### **Workflow 2: Wholesaler → Retailer/Business**
1. **Discovery**: Retailer/restaurant browses wholesaler's catalog
2. **Order**: Retailer places order (medium volume, 10-100 kg)
3. **Confirmation**: Wholesaler confirms from their inventory
4. **Fulfillment**: Wholesaler delivers to retail location
5. **Payment**: Net 15-30 days typical for established customers
6. **Completion**: Order marked delivered, inventory updated

#### **Workflow 3: Farmer → Consumer** (Future)
1. **Discovery**: Consumer browses local farm products
2. **Order**: Consumer places small order (1-10 kg)
3. **Confirmation**: Farmer confirms
4. **Fulfillment**: Farm pickup or delivery
5. **Payment**: Pre-paid via Stripe/PayFast
6. **Completion**: Order marked delivered

### API Endpoints to Build

```
# Contacts (Buyers/Customers)
GET    /api/v1/contacts                  # List my contacts
POST   /api/v1/contacts                  # Add contact
GET    /api/v1/contacts/:id              # Get contact details
PUT    /api/v1/contacts/:id              # Update contact
DELETE /api/v1/contacts/:id              # Delete contact

# Orders - Buyer Side
POST   /api/v1/orders                    # Create order (place order)
GET    /api/v1/orders                    # List my orders as buyer
GET    /api/v1/orders/:id                # Get order details
PATCH  /api/v1/orders/:id/cancel         # Cancel order (buyer)

# Orders - Seller Side
GET    /api/v1/orders/received           # List orders I received as seller
PATCH  /api/v1/orders/:id/confirm        # Confirm order (seller)
PATCH  /api/v1/orders/:id/preparing      # Mark as preparing
PATCH  /api/v1/orders/:id/ready          # Mark as ready for pickup/delivery
PATCH  /api/v1/orders/:id/shipped        # Mark as shipped
PATCH  /api/v1/orders/:id/delivered      # Mark as delivered
PATCH  /api/v1/orders/:id/reject         # Reject order (seller)

# Order Status History
GET    /api/v1/orders/:id/history        # Get status history

# Order Statistics
GET    /api/v1/orders/stats              # My order statistics
GET    /api/v1/orders/sales-report       # Sales report (for sellers)
```

### Order Creation Flow

```python
# POST /api/v1/orders
{
  "customer_contact_id": 123,
  "delivery_method": "pickup",
  "payment_method": "bank_transfer",
  "items": [
    {
      "product_id": 456,
      "quantity": 100,
      "unit": "kg",
      "quality_grade": "A"
    }
  ],
  "notes": "Need delivery before Friday"
}

# Backend Process:
# 1. Validate products exist and are available
# 2. Calculate pricing (use tier pricing based on quantity)
# 3. Reserve inventory items (set status='reserved')
# 4. Calculate subtotal, tax, shipping
# 5. Create order record
# 6. Create order_items records
# 7. Send notification to seller
# 8. Send confirmation to buyer
# 9. Return order details with payment instructions
```

### Business Logic to Implement

**4.5.1 Order Validation**
```python
# Service: OrderService.validate_order()
# Check: Products active and available
# Check: Quantity available in inventory
# Check: Minimum order quantity met
# Check: Maximum order quantity not exceeded
```

**4.5.2 Pricing Calculation**
```python
# Service: OrderService.calculate_order_total()
# For each item:
#   1. Determine pricing tier based on quantity
#   2. Calculate item total
# Sum all items = subtotal
# Calculate tax (VAT 15% if applicable)
# Calculate shipping (if applicable)
# Total = subtotal + tax + shipping
```

**4.5.3 Inventory Reservation**
```python
# Service: InventoryService.reserve_for_order()
# Select inventory items FIFO (oldest first)
# Set inventory_item.status = 'reserved'
# Link order_item.inventory_item_id
# Update product available quantity
```

**4.5.4 Order Status Transitions**
```python
# Service: OrderService.update_status()
# Allowed transitions:
#   pending → confirmed (seller accepts)
#   pending → cancelled (buyer cancels)
#   confirmed → preparing (seller starts prep)
#   preparing → ready (ready for pickup/shipment)
#   ready → shipped (in transit)
#   shipped → delivered (completed)
#   * → cancelled (with reason)
# Log every transition in order_status_history
# Send notification on each status change
```

**4.5.5 Order Completion**
```python
# Service: OrderService.complete_order()
# When status → delivered:
#   1. Update inventory_item.status = 'sold'
#   2. Reduce inventory current_quantity
#   3. Log inventory_transaction (type='sale')
#   4. Update product.order_count += 1
#   5. Create transaction record (income)
#   6. Send review request to buyer
```

**4.5.6 Order Cancellation**
```python
# Service: OrderService.cancel_order()
# Release reserved inventory:
#   1. Set inventory_item.status = 'available'
#   2. Remove order_item.inventory_item_id link
#   3. Update product available quantity
# If payment made: initiate refund process
# Send cancellation notification
```

### Service Classes

Create `app/services/order_service.py`:
```python
class OrderService:
    def create_order(...)
    def validate_order(...)
    def calculate_order_total(...)
    def update_status(...)
    def complete_order(...)
    def cancel_order(...)
    def get_seller_orders(...)
    def get_buyer_orders(...)
    def get_sales_report(...)
```

Create `app/services/contact_service.py`:
```python
class ContactService:
    def create_contact(...)
    def update_contact(...)
    def get_contact_history(...)
    def get_top_customers(...)
```

### Notification System

**Events to Trigger Notifications:**
- New order received (→ seller)
- Order confirmed (→ buyer)
- Order ready for pickup (→ buyer)
- Order shipped (→ buyer)
- Order delivered (→ buyer + seller)
- Order cancelled (→ buyer + seller)
- Payment received (→ seller)

**Channels:**
- In-app notifications
- Email
- SMS (for critical updates)
- WhatsApp (future)

### Deliverables
✅ Complete order management system operational
✅ Farmer → Wholesaler workflow functional
✅ Wholesaler → Retailer workflow functional
✅ Order status tracking working
✅ Inventory reservation/release automated
✅ Order totals calculated correctly
✅ Status transition audit trail complete
✅ Notifications sending on status changes
✅ API documentation complete
✅ Tests passing

---

## Phase 5: Payment Gateway Integration (Weeks 14-15)

### Objectives
- Integrate Stripe for international payments
- Research and integrate SA-friendly payment gateway
- Evaluate PayFast
- Generate payment links for orders
- Track payment status
- Handle refunds

### Payment Gateway Options for South Africa

#### **Option 1: Stripe** (International standard)
**Pros:**
- Global payment processing
- Excellent API and documentation
- Supports ZAR
- Mobile-friendly
- Subscription support (for future)

**Cons:**
- Higher fees (2.9% + R3 per transaction)
- Primarily designed for international merchants
- Some SA banks may decline international transactions

**Pricing:**
- 2.9% + R3.50 per successful card transaction
- No setup fees, no monthly fees

#### **Option 2: Yoco** (Top SA Recommendation)
**Pros:**
- **Built for South African businesses**
- Lower fees than Stripe
- Excellent local support
- Popular and trusted in SA
- Instant payments to SA bank accounts
- No monthly fees

**Cons:**
- SA-only (not for international)
- Smaller feature set than Stripe

**Pricing:**
- 2.95% per transaction
- No setup fees, no monthly fees

#### **Option 3: PayFast** (SA Alternative)
**Pros:**
- Well-established in SA
- Supports multiple payment methods (cards, EFT, Bitcoin, etc.)
- Lower fees for larger volumes
- Good for marketplace platforms

**Cons:**
- Older API, less modern than Stripe
- UI not as polished

**Pricing:**
- 2.9% per transaction (negotiable for high volume)
- No setup fees, no monthly fees

#### **Option 4: Ozow** (Instant EFT)
**Pros:**
- Instant bank-to-bank transfers
- No credit card needed
- Lower fees (1.5%)
- Very popular in SA

**Cons:**
- Limited to bank transfers (no cards)
- Not suitable for international

**Pricing:**
- 1.5% per transaction
- Perfect for B2B transactions

#### **Option 5: SnapScan** (Nedbank)
**Pros:**
- Very popular QR-code payment
- Great for in-person pickup payments
- Trusted brand

**Cons:**
- Less suitable for online marketplace
- More for retail/in-person

### Recommended Payment Strategy

**Multi-Gateway Approach:**
1. **Primary: Yoco** (for most SA transactions)
2. **Secondary: Stripe** (for international, subscriptions)
3. **B2B: Ozow** (instant EFT for large wholesale orders)
4. **Fallback: PayFast** (if others unavailable)

### Database Models to Implement

#### 5.1 `payment_methods` - Available Payment Options
System configuration for payment gateways.

**Fields:**
- `id`
- `method_name` (stripe/yoco/payfast/ozow/manual)
- `method_type` (card/bank_transfer/mobile_money/cash)
- `is_active`
- `is_default`
- `supports_refunds`
- `fee_percentage`
- `fee_fixed_amount`
- `config` (JSONB - API keys, settings)
- Timestamps

#### 5.2 Update `orders` table
Add payment-related fields:
- `payment_gateway` (stripe/yoco/payfast/ozow/manual)
- `payment_link` (generated URL)
- `payment_intent_id` (gateway transaction ID)
- `payment_completed_at`
- `payment_metadata` (JSONB - gateway response)

#### 5.3 `payments` - Payment Records
Track payment transactions.

**Fields:**
- `id`, `order_id`
- `payment_gateway` (stripe/yoco/payfast/ozow)
- `transaction_id` (gateway transaction ID)
- `amount`, `currency`
- `payment_status` (pending/processing/completed/failed/refunded)
- `payment_method_type` (card/eft/mobile_money)
- `payer_email`, `payer_phone`
- `gateway_response` (JSONB - full response)
- `paid_at`, `failed_at`, `refunded_at`
- `refund_amount`, `refund_reason`
- `fees_charged` (gateway fees)
- Timestamps

### API Endpoints to Build

```
# Payment Methods (Admin)
GET    /api/v1/admin/payment-methods           # List available methods
POST   /api/v1/admin/payment-methods           # Add method
PUT    /api/v1/admin/payment-methods/:id       # Update method

# Order Payments
POST   /api/v1/orders/:id/payment-link         # Generate payment link
GET    /api/v1/orders/:id/payment-status       # Check payment status
POST   /api/v1/orders/:id/payment-confirm      # Manually confirm payment

# Webhooks (gateway callbacks)
POST   /api/v1/webhooks/stripe                 # Stripe webhook
POST   /api/v1/webhooks/yoco                   # Yoco webhook
POST   /api/v1/webhooks/payfast                # PayFast webhook
POST   /api/v1/webhooks/ozow                   # Ozow webhook

# Refunds
POST   /api/v1/orders/:id/refund               # Process refund
GET    /api/v1/payments/:id/refund-status      # Check refund status
```

### Integration Implementation

#### **Stripe Integration**
```python
# app/services/payment/stripe_service.py

import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripePaymentService:
    def create_payment_intent(order: Order) -> dict:
        """Create Stripe PaymentIntent"""
        intent = stripe.PaymentIntent.create(
            amount=int(order.total_amount * 100),  # cents
            currency="zar",
            metadata={
                "order_id": order.id,
                "order_number": order.order_number
            }
        )
        return {
            "payment_link": f"https://checkout.stripe.com/...",
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }

    def handle_webhook(payload: dict, signature: str):
        """Process Stripe webhook events"""
        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET
        )

        if event.type == "payment_intent.succeeded":
            # Update order payment status
            pass
        elif event.type == "payment_intent.payment_failed":
            # Mark payment as failed
            pass
```

#### **Yoco Integration** (Similar pattern)
```python
# app/services/payment/yoco_service.py

import requests
from app.core.config import settings

class YocoPaymentService:
    BASE_URL = "https://online.yoco.com/v1"

    def create_checkout(order: Order) -> dict:
        """Create Yoco checkout session"""
        response = requests.post(
            f"{self.BASE_URL}/checkouts",
            headers={
                "Authorization": f"Bearer {settings.YOCO_SECRET_KEY}"
            },
            json={
                "amount": int(order.total_amount * 100),  # cents
                "currency": "ZAR",
                "metadata": {
                    "order_id": order.id
                },
                "successUrl": f"{settings.FRONTEND_URL}/orders/{order.id}/success",
                "cancelUrl": f"{settings.FRONTEND_URL}/orders/{order.id}/cancel"
            }
        )
        data = response.json()
        return {
            "payment_link": data["redirectUrl"],
            "checkout_id": data["id"]
        }
```

### Payment Flow

```
1. Order Created
   ↓
2. Generate Payment Link
   - POST /api/v1/orders/:id/payment-link
   - Select gateway (Yoco for SA, Stripe for international)
   - Create checkout session
   - Return payment_link
   ↓
3. Customer Pays
   - Redirect to payment_link
   - Customer completes payment on gateway
   ↓
4. Gateway Webhook
   - Gateway calls POST /api/v1/webhooks/{gateway}
   - Verify webhook signature
   - Update order.payment_status = 'paid'
   - Update order.payment_completed_at
   - Send confirmation emails
   - Update order.order_status = 'confirmed'
   ↓
5. Seller Fulfills Order
   (Continue normal order flow)
```

### Business Logic to Implement

**5.4.1 Payment Link Generation**
```python
# Service: PaymentService.generate_payment_link()
# 1. Check order.payment_status != 'paid'
# 2. Select appropriate gateway based on:
#    - Buyer location (SA → Yoco, International → Stripe)
#    - Order amount (High value → Ozow for instant EFT)
#    - Buyer preference
# 3. Create checkout session
# 4. Update order.payment_link
# 5. Return link to buyer
```

**5.4.2 Webhook Signature Verification**
```python
# Service: PaymentService.verify_webhook()
# Critical for security - verify all webhooks
# Each gateway has different signature method
# Reject invalid signatures
```

**5.4.3 Payment Confirmation**
```python
# Service: PaymentService.confirm_payment()
# On successful webhook:
#   1. Create payment record
#   2. Update order.payment_status = 'paid'
#   3. Update order.payment_completed_at
#   4. Transition order.order_status → 'confirmed'
#   5. Send notifications
#   6. Create transaction record (income for seller)
```

**5.4.4 Refund Processing**
```python
# Service: PaymentService.process_refund()
# 1. Validate refund eligibility
# 2. Call gateway refund API
# 3. Update payment.refund_amount
# 4. Update order.payment_status = 'refunded'
# 5. Update inventory (un-reserve, return to available)
# 6. Send notifications
```

### Service Classes

Create `app/services/payment_service.py`:
```python
class PaymentService:
    def __init__(self, gateway: str):
        self.gateway = gateway
        self.provider = self._get_provider()

    def _get_provider(self):
        if self.gateway == "stripe":
            return StripePaymentService()
        elif self.gateway == "yoco":
            return YocoPaymentService()
        # ... other gateways

    def generate_payment_link(order)
    def verify_webhook(payload, signature)
    def confirm_payment(order, payment_data)
    def process_refund(order, amount, reason)
    def get_payment_status(order)
```

### Environment Configuration

Add to `app/core/config.py`:
```python
# Stripe
STRIPE_SECRET_KEY: str
STRIPE_PUBLISHABLE_KEY: str
STRIPE_WEBHOOK_SECRET: str

# Yoco
YOCO_SECRET_KEY: str
YOCO_PUBLISHABLE_KEY: str
YOCO_WEBHOOK_SECRET: str

# PayFast
PAYFAST_MERCHANT_ID: str
PAYFAST_MERCHANT_KEY: str
PAYFAST_PASSPHRASE: str

# Ozow
OZOW_SITE_CODE: str
OZOW_PRIVATE_KEY: str
OZOW_API_KEY: str
```

### Testing Requirements
- Test payment link generation
- Test successful payment flow
- Test failed payment handling
- Test webhook signature verification
- Test refund processing
- Use sandbox/test modes for all gateways

### Deliverables
✅ Payment gateway integrations complete (Yoco + Stripe minimum)
✅ Payment link generation working
✅ Webhook handlers operational
✅ Payment status tracking accurate
✅ Refund processing functional
✅ Secure webhook signature verification
✅ Payment records stored correctly
✅ Tests passing (using sandbox modes)
✅ Documentation for each gateway

---

## Phase 6: Notifications & Alerts (Week 16)

### Objectives
- Implement low stock alerts for farmers
- Build expiry notifications (7 days, 3 days, expired)
- Create batch/lot expiry tracking for wholesalers
- Send order status notifications
- Build notification delivery system (email, SMS, in-app)

### Database Models to Implement

#### 6.1 `notifications` - Notification Queue
Store all notifications.

**Fields:**
- `id`, `account_id` (recipient)
- `notification_type` (low_stock/expiry/order_status/payment/system)
- `title`, `message`
- `priority` (low/medium/high/urgent)
- `is_read` (boolean)
- `read_at`
- `delivery_channels` (JSONB - ['email', 'sms', 'push'])
- `delivery_status` (JSONB - {email: 'sent', sms: 'delivered'})
- `related_entity_type` (order/inventory_item/product)
- `related_entity_id`
- `action_url` (deeplink to relevant page)
- `scheduled_for` (send immediately or schedule)
- Timestamps

#### 6.2 `notification_preferences` - User Preferences
User settings for notifications.

**Fields:**
- `id`, `account_id`
- `email_enabled` (boolean)
- `sms_enabled` (boolean)
- `push_enabled` (boolean)
- `low_stock_enabled` (boolean)
- `expiry_alerts_enabled` (boolean)
- `order_updates_enabled` (boolean)
- `marketing_enabled` (boolean)
- `quiet_hours_start` (time - e.g., 22:00)
- `quiet_hours_end` (time - e.g., 08:00)
- Timestamps

### Notification Types to Implement

#### **6.3.1 Inventory Alerts**

**Low Stock Alert**
```
Trigger: inventory_item.current_quantity <= minimum_quantity
Frequency: Daily digest (avoid spam)
Recipients: Farmer/wholesaler who owns inventory
Priority: Medium

Title: "Low Stock Alert: {item_name}"
Message: "Your {item_name} stock is running low. Current: {current_quantity}{unit}, Minimum: {minimum_quantity}{unit}. Consider reordering."
Action: Link to inventory item
```

**Expiry Alert - 7 Days**
```
Trigger: inventory_item.expiry_date = today + 7 days
Recipients: Inventory owner
Priority: Medium

Title: "Items Expiring Soon"
Message: "{item_name} (Batch: {batch_number}) will expire in 7 days on {expiry_date}. Current quantity: {current_quantity}{unit}."
Action: Link to inventory item, suggest discount/sale
```

**Expiry Alert - 3 Days**
```
Trigger: inventory_item.expiry_date = today + 3 days
Recipients: Inventory owner
Priority: High

Title: "Urgent: Items Expiring in 3 Days"
Message: "{item_name} (Batch: {batch_number}) will expire on {expiry_date}. Current quantity: {current_quantity}{unit}. Take action now."
Action: Link to inventory item
```

**Expired Items**
```
Trigger: inventory_item.expiry_date < today AND status != 'expired'
Recipients: Inventory owner
Priority: Urgent

Title: "Items Have Expired"
Message: "{item_name} (Batch: {batch_number}) expired on {expiry_date}. Please remove from inventory. Quantity: {current_quantity}{unit}."
Action: Link to inventory item, mark as expired
```

#### **6.3.2 Order Notifications**

**New Order Received (Seller)**
```
Trigger: Order created
Recipients: Seller
Priority: High

Title: "New Order Received - {order_number}"
Message: "You have a new order from {customer_name} for {total_amount} ZAR. {item_count} items."
Action: Link to order details
```

**Order Confirmed (Buyer)**
```
Trigger: Order status → confirmed
Recipients: Buyer
Priority: Medium

Title: "Order Confirmed - {order_number}"
Message: "Your order has been confirmed by {seller_name}. Expected fulfillment: {fulfillment_date}."
Action: Link to order tracking
```

**Order Ready for Pickup (Buyer)**
```
Trigger: Order status → ready
Recipients: Buyer
Priority: High

Title: "Order Ready - {order_number}"
Message: "Your order is ready for pickup at {pickup_location}. Please collect within 24 hours."
Action: Link to pickup details
```

**Order Shipped (Buyer)**
```
Trigger: Order status → shipped
Recipients: Buyer
Priority: Medium

Title: "Order Shipped - {order_number}"
Message: "Your order has been shipped. Expected delivery: {expected_delivery_date}."
Action: Link to tracking
```

**Order Delivered (Buyer + Seller)**
```
Trigger: Order status → delivered
Recipients: Buyer, Seller
Priority: Low

Title: "Order Delivered - {order_number}"
Message: "Your order has been delivered. Thank you for your business!"
Action: Link to leave review
```

**Payment Received (Seller)**
```
Trigger: Payment webhook → success
Recipients: Seller
Priority: High

Title: "Payment Received - {order_number}"
Message: "Payment of {amount} ZAR received for order {order_number}. Funds will be in your account within 2-3 business days."
Action: Link to transaction
```

#### **6.3.3 Batch/Lot Management (Wholesalers)**

**Batch Expiry Summary (Daily Digest)**
```
Trigger: Scheduled daily (08:00 AM)
Recipients: Wholesalers with batch tracking enabled
Priority: Medium

Title: "Daily Batch Expiry Report"
Message: "You have {count} batches expiring in the next 7 days. Total quantity: {total_quantity}. Review and take action."
Action: Link to expiring batches report
```

### API Endpoints to Build

```
# User Notifications
GET    /api/v1/notifications                    # List my notifications
GET    /api/v1/notifications/unread             # Unread count
PATCH  /api/v1/notifications/:id/read           # Mark as read
PATCH  /api/v1/notifications/mark-all-read      # Mark all as read
DELETE /api/v1/notifications/:id                # Delete notification

# Notification Preferences
GET    /api/v1/notifications/preferences        # Get my preferences
PUT    /api/v1/notifications/preferences        # Update preferences

# Admin/System
POST   /api/v1/notifications/send               # Send notification (admin)
GET    /api/v1/notifications/delivery-status    # Check delivery status
```

### Notification Delivery Implementation

#### **Email Delivery** (AWS SES)
```python
# app/services/notification/email_service.py

import boto3
from app.core.config import settings

class EmailNotificationService:
    def __init__(self):
        self.ses = boto3.client(
            'ses',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )

    def send_email(self, to: str, subject: str, body: str):
        """Send email via AWS SES"""
        response = self.ses.send_email(
            Source=settings.EMAIL_FROM,
            Destination={'ToAddresses': [to]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': body}}
            }
        )
        return response['MessageId']
```

#### **SMS Delivery** (AWS SNS or Twilio)
```python
# app/services/notification/sms_service.py

import boto3
from app.core.config import settings

class SMSNotificationService:
    def __init__(self):
        self.sns = boto3.client(
            'sns',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )

    def send_sms(self, to: str, message: str):
        """Send SMS via AWS SNS"""
        response = self.sns.publish(
            PhoneNumber=to,
            Message=message
        )
        return response['MessageId']
```

#### **Push Notifications** (Future - Firebase)
```python
# app/services/notification/push_service.py
# Implement when mobile app is ready
```

### Background Jobs Implementation

Use Celery or AWS Lambda scheduled functions:

```python
# app/tasks/notification_tasks.py

from celery import Celery
from app.services import InventoryService, NotificationService

celery_app = Celery('beyondagri')

@celery_app.task
def check_low_stock_daily():
    """Check for low stock items daily at 08:00"""
    inventory_service = InventoryService()
    notification_service = NotificationService()

    low_stock_items = inventory_service.get_low_stock_items()

    # Group by account
    by_account = {}
    for item in low_stock_items:
        if item.account_id not in by_account:
            by_account[item.account_id] = []
        by_account[item.account_id].append(item)

    # Send digest to each account
    for account_id, items in by_account.items():
        notification_service.send_low_stock_digest(
            account_id, items
        )

@celery_app.task
def check_expiring_items_daily():
    """Check for expiring items daily at 08:00"""
    inventory_service = InventoryService()
    notification_service = NotificationService()

    # 7 days
    expiring_7d = inventory_service.get_expiring_items(days=7)
    for item in expiring_7d:
        notification_service.send_expiry_alert(
            item, days_until=7, priority='medium'
        )

    # 3 days
    expiring_3d = inventory_service.get_expiring_items(days=3)
    for item in expiring_3d:
        notification_service.send_expiry_alert(
            item, days_until=3, priority='high'
        )

    # Expired
    expired = inventory_service.get_expired_items()
    for item in expired:
        notification_service.send_expiry_alert(
            item, days_until=0, priority='urgent'
        )
        # Auto-update status
        inventory_service.mark_as_expired(item.id)

@celery_app.task
def send_batch_expiry_digest_daily():
    """Send batch expiry digest to wholesalers at 08:00"""
    inventory_service = InventoryService()
    notification_service = NotificationService()

    wholesalers = inventory_service.get_wholesaler_accounts()

    for wholesaler in wholesalers:
        batches = inventory_service.get_expiring_batches(
            account_id=wholesaler.id,
            days=7
        )
        if batches:
            notification_service.send_batch_expiry_digest(
                wholesaler, batches
            )
```

### Service Classes

Create `app/services/notification_service.py`:
```python
class NotificationService:
    def __init__(self):
        self.email_service = EmailNotificationService()
        self.sms_service = SMSNotificationService()

    def create_notification(account_id, type, title, message, ...)
    def send_notification(notification_id)
    def send_low_stock_alert(inventory_item)
    def send_expiry_alert(inventory_item, days_until, priority)
    def send_order_notification(order, event_type)
    def send_payment_notification(payment)
    def send_batch_expiry_digest(account, batches)
    def get_user_preferences(account_id)
    def respect_quiet_hours(account_id) -> bool
```

### Scheduled Jobs Configuration

```python
# app/core/celery_beat_config.py

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'check-low-stock-daily': {
        'task': 'app.tasks.notification_tasks.check_low_stock_daily',
        'schedule': crontab(hour=8, minute=0),  # 08:00 AM daily
    },
    'check-expiring-items-daily': {
        'task': 'app.tasks.notification_tasks.check_expiring_items_daily',
        'schedule': crontab(hour=8, minute=0),  # 08:00 AM daily
    },
    'send-batch-expiry-digest': {
        'task': 'app.tasks.notification_tasks.send_batch_expiry_digest_daily',
        'schedule': crontab(hour=8, minute=0),  # 08:00 AM daily
    },
}
```

### Deliverables
✅ Notification system operational
✅ Low stock alerts sending daily
✅ Expiry alerts (7d, 3d, expired) working
✅ Batch expiry digest for wholesalers
✅ Order status notifications firing
✅ Email delivery via AWS SES configured
✅ SMS delivery via AWS SNS configured
✅ User notification preferences functional
✅ Quiet hours respected
✅ Background jobs scheduled and running
✅ Tests passing

---

## Summary: Complete Feature Checklist

### 3.2 Digital Marketplace (B2B and B2C)

✅ **Product Listings**
- ✅ Top 20 vegetables supported
- ✅ Top 5 fruits supported
- ✅ Beef (cattle) supported
- ✅ Pork (pigs) supported
- ✅ Poultry (chicken, turkey, duck, eggs) supported

✅ **Product Attributes**
- ✅ Pricing (retail, wholesale, bulk tiers)
- ✅ Availability (linked to inventory)
- ✅ Condition/Quality grades
- ✅ Media (product photos on S3/CloudFront)
- ✅ Description, certifications, tags

✅ **Trade Workflows**
- ✅ Farmer ↔ Wholesaler ("The King") workflow
- ✅ Wholesaler ↔ Retailers/Businesses workflow
- ✅ (Future) Farmer → Customer workflow prepared

✅ **Payment Gateways**
- ✅ Stripe integration (international)
- ✅ SA-friendly gateway (Yoco recommended)
- ✅ PayFast as alternative
- ✅ Ozow for instant EFT (B2B)
- ✅ Payment link generation
- ✅ Webhook handling
- ✅ Refund processing

### 3.3 Inventory Management

✅ **Farmers: Product Tracking**
- ✅ Track product stock levels
- ✅ Monitor availability in real-time
- ✅ Record harvest yields
- ✅ Link harvests to inventory automatically
- ✅ Track livestock yields (meat, eggs)

✅ **Wholesalers: Stock Management**
- ✅ Manage stock acquired from farmers
- ✅ Batch/lot number tracking (full traceability)
- ✅ Track multiple storage locations (warehouses, bins)
- ✅ Transfer stock between locations
- ✅ Monitor inventory valuation

✅ **Notifications & Alerts**
- ✅ Low stock notifications (when quantity ≤ minimum)
- ✅ Expiry alerts (7 days, 3 days, expired)
- ✅ Batch expiry tracking for wholesalers
- ✅ Daily digest reports
- ✅ Email and SMS delivery
- ✅ User-configurable preferences

---

## Technical Architecture

### Database
- **PostgreSQL 13+** with PostGIS for location data
- **SQLAlchemy 2.0** ORM
- **Alembic** for migrations
- Comprehensive schema covering all requirements

### Backend
- **FastAPI** REST API
- **Pydantic 2.0** for validation
- Service layer for business logic
- Background jobs via Celery or AWS Lambda

### Storage & CDN
- **Amazon S3** for product images, documents
- **CloudFront** for fast global delivery
- Automatic image resizing and optimization

### Payments
- Multi-gateway architecture
- **Yoco** (primary for SA)
- **Stripe** (international)
- **Ozow** (B2B instant EFT)
- Secure webhook verification

### Notifications
- **AWS SES** for email
- **AWS SNS** for SMS
- In-app notifications
- Scheduled background jobs

### Authentication
- **AWS Cognito** (already implemented)
- JWT-based API authentication
- Role-based access control

---

## Development Timeline

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| Phase 1 | 1-4 | Core Inventory Management |
| Phase 2 | 5-6 | Harvest Yield Tracking |
| Phase 3 | 7-10 | Product Catalog & Marketplace |
| Phase 4 | 11-13 | Order Management & Trade Workflows |
| Phase 5 | 14-15 | Payment Gateway Integration |
| Phase 6 | 16 | Notifications & Alerts |
| **Total** | **16 weeks** | **Complete MVP** |

---

## Next Steps

### Immediate Actions (Week 1)

1. **Review and Approve Plan**
   - Confirm approach with stakeholders
   - Finalize payment gateway selection
   - Set budget and timeline

2. **Environment Setup**
   - Ensure PostgreSQL 13+ with PostGIS
   - Set up AWS services (S3, SES, SNS)
   - Configure development environments

3. **Payment Gateway Registration**
   - Sign up for Yoco account
   - Sign up for Stripe account
   - Complete merchant verification
   - Obtain API keys (sandbox + production)

4. **Start Phase 1 Implementation**
   - Create database models
   - Generate migrations
   - Build inventory service
   - Develop API endpoints

5. **Set Up CI/CD**
   - Configure automated testing
   - Set up deployment pipeline
   - Configure staging environment

### Success Metrics

**Technical:**
- API response time < 200ms
- Database queries optimized
- Test coverage > 80%
- Zero critical security vulnerabilities

**Business:**
- Farmers can list products in < 5 minutes
- Orders processed in < 30 seconds
- Notifications delivered within 1 minute
- Payment success rate > 95%
- Inventory accuracy > 99%

---

## Conclusion

This implementation plan provides a complete, independent solution for BeyondAgri's Digital Marketplace and Inventory Management requirements. By building our own system rather than relying on Farmbrite's limited API, we gain:

1. **Full Feature Control** - Custom workflows for SA market
2. **No Vendor Lock-in** - Complete data ownership
3. **Cost Efficiency** - No per-farmer subscription fees
4. **Scalability** - Optimize for our specific needs
5. **Flexibility** - Can still add Farmbrite sync later if needed

The 16-week timeline is aggressive but achievable with focused development. Prioritizing inventory and marketplace features first ensures core value delivery, with payments and notifications rounding out the MVP.

**Ready to begin implementation upon approval.**

---

**Document Version**: 1.0
**Created**: 2025-10-08
**Author**: BeyondAgri Development Team
**Status**: Ready for Review & Approval
