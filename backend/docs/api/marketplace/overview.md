# Marketplace API - Overview

## Introduction

The Marketplace system (Phase 3) enables farmers to list their products for sale and wholesalers to browse and discover available products. Key features include:

- Farmers create explicit product listings (separate from inventory)
- Wholesalers browse, search, and filter listings
- Public access for browsing (authentication optional)
- Rich filtering by category, province, price range
- Listing lifecycle management (draft, active, paused, archived)

**Base Path:** `/api/v1/marketplace`

## Key Concepts

### 1. Product Categories

Listings are organized into categories:

| Category | Description |
|----------|-------------|
| `HARVEST` | Fresh produce, fruits, vegetables |
| `MEAT` | Beef, pork, lamb, game |
| `POULTRY` | Chicken, duck, turkey, eggs |
| `DAIRY` | Milk, cheese, butter, yogurt |
| `GRAINS` | Wheat, maize, rice, barley |
| `OTHER` | Any other agricultural products |

### 2. Listing Statuses

Listings progress through a lifecycle:

```
DRAFT ──> ACTIVE ──┬──> PAUSED ──> ACTIVE
                   │
                   ├──> SOLD_OUT
                   │
                   ├──> EXPIRED (auto)
                   │
                   └──> ARCHIVED (soft delete)
```

| Status | Visible in Browse | Description |
|--------|-------------------|-------------|
| `DRAFT` | No | Being prepared, not published yet |
| `ACTIVE` | Yes | Live and visible to wholesalers |
| `PAUSED` | No | Temporarily hidden by farmer |
| `SOLD_OUT` | No | No available quantity |
| `EXPIRED` | No | Past expiry date |
| `ARCHIVED` | No | Soft deleted by farmer |

### 3. Access Control

| User Type | Browse Listings | Create/Manage Listings |
|-----------|-----------------|------------------------|
| **Guest** (unauthenticated) | Yes | No |
| **Wholesaler** | Yes | No |
| **Farmer** | Yes | Yes (own listings only) |

## Quick Reference

### All Endpoints

| Category | Endpoint | Method | Auth | Description |
|----------|----------|--------|------|-------------|
| **Browse** | `/listings` | GET | Optional | Browse with filters |
| | `/listings/{id}` | GET | Optional | Get listing detail |
| | `/provinces` | GET | None | Get filter options |
| | `/categories` | GET | None | Get category list |
| **Farmer** | `/my-listings` | GET | Farmer | List own listings |
| | `/my-listings` | POST | Farmer | Create listing |
| | `/my-listings/{id}` | GET | Farmer | Get own listing |
| | `/my-listings/{id}` | PUT | Farmer | Update listing |
| | `/my-listings/{id}` | DELETE | Farmer | Archive listing |
| | `/my-listings/{id}/publish` | POST | Farmer | Publish draft |
| | `/my-listings/{id}/pause` | POST | Farmer | Pause active |
| | `/my-listings/{id}/resume` | POST | Farmer | Resume paused |

## Common Workflows

### 1. Farmer Creates a Listing

```javascript
// Create a draft listing
const listing = await api.post('/marketplace/my-listings', {
  title: "Fresh Roma Tomatoes",
  description: "Organic tomatoes from our farm in Western Cape",
  category: "HARVEST",
  available_quantity: 500,
  unit: "kg",
  price_per_unit: 25.00,
  currency: "ZAR",
  minimum_order_quantity: 10,
  quality_grade: "A",
  certifications: ["Organic", "Fair Trade"],
  photos: ["https://s3.../tomatoes1.jpg", "https://s3.../tomatoes2.jpg"],
  province: "Western Cape",
  city: "Stellenbosch",
  publish_immediately: false  // Create as draft
});

console.log(listing.id);     // 123
console.log(listing.status); // "DRAFT"
```

### 2. Publish the Listing

```javascript
// Publish when ready
const published = await api.post(`/marketplace/my-listings/${listing.id}/publish`);

console.log(published.status);       // "ACTIVE"
console.log(published.published_at); // "2026-01-10T14:30:00Z"
```

### 3. Wholesaler Browses Listings

```javascript
// Browse all active listings
const response = await api.get('/marketplace/listings');

console.log(response.data);        // Array of listings
console.log(response.total);       // Total count
console.log(response.page);        // Current page
console.log(response.total_pages); // Total pages

// Browse with filters
const filtered = await api.get('/marketplace/listings', {
  params: {
    category: 'HARVEST',
    province: 'Western Cape',
    min_price: 10,
    max_price: 50,
    search: 'tomato',
    page: 1,
    page_size: 20
  }
});
```

### 4. Get Listing Detail

```javascript
// Get full listing with farmer info
const detail = await api.get(`/marketplace/listings/${listingId}`);

console.log(detail.title);              // "Fresh Roma Tomatoes"
console.log(detail.farmer.farm_name);   // "Green Valley Farm"
console.log(detail.farmer.farm_location); // "Stellenbosch"
console.log(detail.farmer.certifications); // {"organic": true}
```

### 5. Farmer Manages Listings

```javascript
// Update listing
await api.put(`/marketplace/my-listings/${listingId}`, {
  price_per_unit: 22.50,  // Price drop
  available_quantity: 400  // Updated quantity
});

// Pause listing temporarily
await api.post(`/marketplace/my-listings/${listingId}/pause`);

// Resume listing
await api.post(`/marketplace/my-listings/${listingId}/resume`);

// Archive (soft delete) listing
await api.delete(`/marketplace/my-listings/${listingId}`);
```

### 6. Get Filter Options

```javascript
// Get provinces with active listings (for dropdown)
const provinces = await api.get('/marketplace/provinces');
// ["Western Cape", "Gauteng", "KwaZulu-Natal", ...]

// Get all categories
const categories = await api.get('/marketplace/categories');
// ["HARVEST", "MEAT", "POULTRY", "DAIRY", "GRAINS", "OTHER"]
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FARMER                                   │
│  Creates listings from inventory or independently                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ProductListing                                │
│  - farmer_account_id (owner)                                    │
│  - inventory_item_id (optional link)                            │
│  - title, description, category                                  │
│  - price, quantity, unit                                         │
│  - province, city, farm_name                                     │
│  - status (DRAFT → ACTIVE → PAUSED/EXPIRED/ARCHIVED)            │
│  - photos, certifications                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WHOLESALER                                  │
│  Browses active listings, filters by category/location/price    │
│  Views farmer info, contacts for orders (future)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Filtering and Pagination

### Query Parameters for Browse

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category (HARVEST, MEAT, etc.) |
| `province` | string | Filter by province (partial match) |
| `min_price` | decimal | Minimum price per unit |
| `max_price` | decimal | Maximum price per unit |
| `search` | string | Search in title and description |
| `featured_only` | boolean | Show only featured listings |
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (1-100, default: 20) |

### Examples

```javascript
// All harvest products in Western Cape
GET /marketplace/listings?category=HARVEST&province=Western Cape

// Products priced R10-R50
GET /marketplace/listings?min_price=10&max_price=50

// Search for "organic tomatoes"
GET /marketplace/listings?search=organic tomatoes

// Paginate results
GET /marketplace/listings?page=2&page_size=10

// Multiple filters
GET /marketplace/listings?category=HARVEST&province=Gauteng&min_price=20&page=1&page_size=20
```

### Paginated Response Format

```json
{
  "data": [
    {
      "id": 1,
      "title": "Fresh Roma Tomatoes",
      "description": "Organic tomatoes...",
      "category": "HARVEST",
      "available_quantity": "500.00",
      "unit": "kg",
      "price_per_unit": "25.00",
      "currency": "ZAR",
      "province": "Western Cape",
      "city": "Stellenbosch",
      "farm_name": "Green Valley Farm",
      "is_featured": false,
      "published_at": "2026-01-10T10:00:00Z",
      "farmer": {
        "id": 5,
        "farm_name": "Green Valley Farm",
        "farm_location": "Stellenbosch",
        "certifications": {"organic": true}
      }
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "message": "Listings retrieved successfully"
}
```

## Request/Response Schemas

### ProductListingCreate (POST /my-listings)

```json
{
  "title": "Fresh Roma Tomatoes",           // Required, max 255 chars
  "description": "Organic tomatoes...",     // Optional
  "category": "HARVEST",                    // Required: HARVEST|MEAT|POULTRY|DAIRY|GRAINS|OTHER
  "available_quantity": 500,                // Required, >= 0
  "unit": "kg",                             // Required, max 50 chars
  "price_per_unit": 25.00,                  // Required, >= 0
  "currency": "ZAR",                        // Optional, default "ZAR"
  "minimum_order_quantity": 10,             // Optional
  "quality_grade": "A",                     // Optional
  "certifications": ["Organic"],            // Optional array
  "photos": ["https://..."],                // Optional array of URLs
  "expires_at": "2026-02-10T00:00:00Z",     // Optional
  "province": "Western Cape",               // Optional (auto-filled from profile)
  "city": "Stellenbosch",                   // Optional
  "inventory_item_id": 123,                 // Optional link to inventory
  "publish_immediately": false              // Optional, default false
}
```

### ProductListingUpdate (PUT /my-listings/{id})

All fields are optional. Only include fields to update:

```json
{
  "title": "Updated Title",
  "price_per_unit": 22.50,
  "available_quantity": 400,
  "status": "ACTIVE"
}
```

### ProductListingResponse (Farmer view)

```json
{
  "id": 123,
  "farmer_account_id": 5,
  "inventory_item_id": null,
  "title": "Fresh Roma Tomatoes",
  "description": "Organic tomatoes...",
  "category": "HARVEST",
  "available_quantity": "500.00",
  "unit": "kg",
  "price_per_unit": "25.00",
  "currency": "ZAR",
  "minimum_order_quantity": "10.00",
  "quality_grade": "A",
  "certifications": ["Organic"],
  "photos": ["https://..."],
  "province": "Western Cape",
  "city": "Stellenbosch",
  "farm_name": "Green Valley Farm",
  "status": "ACTIVE",
  "is_featured": false,
  "published_at": "2026-01-10T10:00:00Z",
  "expires_at": null,
  "created_at": "2026-01-10T09:00:00Z",
  "updated_at": "2026-01-10T10:00:00Z"
}
```

## Location Auto-Fill

When farmers create listings without specifying `province` or `farm_name`, these are automatically populated from their FarmerProfile:

```javascript
// If farmer's profile has:
// - farm_location: "Stellenbosch"
// - farm_name: "Green Valley Farm"

// Creating listing without location:
await api.post('/marketplace/my-listings', {
  title: "Fresh Eggs",
  category: "POULTRY",
  available_quantity: 100,
  unit: "dozen",
  price_per_unit: 45.00
  // province and farm_name not specified
});

// Result will have:
// province: "Stellenbosch"
// farm_name: "Green Valley Farm"
```

## Error Handling

### Common Errors

```javascript
// 404 - Listing not found
{
  "detail": "Listing not found or no longer available"
}

// 403 - Not a farmer
{
  "detail": "Farmer account required"
}

// 400 - Invalid status transition
{
  "detail": "Listing is not in paused status"
}

// 409 - Data conflict
{
  "detail": "Listing creation failed. Check inventory item ID if provided."
}
```

### Status Code Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Listing created |
| 204 | Listing deleted (archived) |
| 400 | Invalid request |
| 403 | Not authorized (not a farmer) |
| 404 | Listing not found |
| 409 | Conflict (e.g., invalid inventory_item_id) |
| 422 | Validation error |
| 500 | Server error |

## JavaScript Integration Example

```javascript
// api.js - Axios setup
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// marketplace.js - Marketplace service
export const marketplaceService = {
  // Browse listings (public)
  async browseListings(filters = {}) {
    const response = await api.get('/marketplace/listings', { params: filters });
    return response.data;
  },

  // Get listing detail (public)
  async getListingDetail(listingId) {
    const response = await api.get(`/marketplace/listings/${listingId}`);
    return response.data;
  },

  // Get filter options
  async getProvinces() {
    const response = await api.get('/marketplace/provinces');
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/marketplace/categories');
    return response.data;
  },

  // Farmer listing management
  async getMyListings(status = null) {
    const params = status ? { status } : {};
    const response = await api.get('/marketplace/my-listings', { params });
    return response.data;
  },

  async createListing(listingData) {
    const response = await api.post('/marketplace/my-listings', listingData);
    return response.data;
  },

  async updateListing(listingId, updateData) {
    const response = await api.put(`/marketplace/my-listings/${listingId}`, updateData);
    return response.data;
  },

  async publishListing(listingId) {
    const response = await api.post(`/marketplace/my-listings/${listingId}/publish`);
    return response.data;
  },

  async pauseListing(listingId) {
    const response = await api.post(`/marketplace/my-listings/${listingId}/pause`);
    return response.data;
  },

  async resumeListing(listingId) {
    const response = await api.post(`/marketplace/my-listings/${listingId}/resume`);
    return response.data;
  },

  async deleteListing(listingId) {
    await api.delete(`/marketplace/my-listings/${listingId}`);
  }
};
```

## Future Extensibility

The marketplace design supports future additions:

| Feature | How it connects |
|---------|-----------------|
| **Ordering** | Add `MarketplaceOrder` model linking wholesaler to listing |
| **Stock Sync** | `inventory_item_id` FK enables quantity synchronization |
| **Favorites** | Junction table Account <-> ProductListing |
| **Reviews** | After order completion |
| **Price Alerts** | Track listing price changes |
| **Messaging** | Wholesaler -> Farmer communication |

## Performance Tips

1. **Use pagination** - Don't fetch all listings at once
2. **Cache categories** - They rarely change
3. **Filter server-side** - Use query parameters instead of client-side filtering
4. **Lazy load images** - Photos array can contain multiple URLs
5. **Cache provinces** - Update periodically, not on every page load

## Database Indexes

The following indexes optimize common queries:

- `ix_product_listings_category_status` - Category + status filter
- `ix_product_listings_province_status` - Province + status filter
- `ix_product_listings_price_status` - Price range + status filter
- `ix_product_listings_farmer_account_id` - Farmer's own listings
- `ix_product_listings_expires_at` - Expiry checking

---

**Last Updated:** 2026-01-10
