# BeyondAgri Backend API Documentation

## Overview

Welcome to the BeyondAgri Backend API documentation. This REST API powers the BeyondAgri platform, connecting farmers, wholesalers, and businesses in South Africa's agricultural marketplace.

**Current Version:** v1
**Base URL (Development):** `http://localhost:8000/api/v1`
**Base URL (Production):** `TBD`

## Technology Stack

- **Framework:** FastAPI 0.104+
- **Database:** PostgreSQL 13+ with PostGIS
- **Authentication:** AWS Cognito + JWT
- **ORM:** SQLAlchemy 2.0
- **API Docs:** OpenAPI 3.0 (Swagger/ReDoc)
- **Language:** Python 3.12

## Quick Start

### 1. Authentication

All API requests (except `/auth/` endpoints) require a valid JWT token:

```bash
# Login to get a token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "SecurePassword123!"
  }'

# Response
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. Making Authenticated Requests

Include the JWT token in the `Authorization` header:

```bash
curl -X GET http://localhost:8000/api/v1/inventory/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Request/Response Format

- **Request Body:** JSON
- **Response Format:** JSON
- **Date Format:** ISO 8601 (e.g., `2025-10-10T14:30:00Z`)
- **Decimal Numbers:** String representation for precision (e.g., `"123.45"`)

## API Endpoints Overview

### Authentication & Accounts
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/accounts/profile` - Get current user profile
- `PUT /api/v1/accounts/profile` - Update profile

[→ Full Authentication Documentation](./api/authentication.md)

### Inventory Management (Phase 1 - ✅ Complete)

#### Inventory Types
- `GET /api/v1/inventory/types` - List inventory types
- `POST /api/v1/inventory/types` - Create custom type
- `GET/PUT/DELETE /api/v1/inventory/types/{id}` - Manage types

#### Warehouses
- `GET /api/v1/inventory/warehouses` - List warehouses
- `POST /api/v1/inventory/warehouses` - Create warehouse
- `GET/PUT/DELETE /api/v1/inventory/warehouses/{id}` - Manage warehouses

#### Storage Bins
- `GET /api/v1/inventory/warehouses/{id}/bins` - List bins in warehouse
- `POST /api/v1/inventory/warehouses/{id}/bins` - Create storage bin
- `PUT/DELETE /api/v1/inventory/bins/{id}` - Manage bins

#### Inventory Items
- `GET /api/v1/inventory/items` - List items (with advanced filters)
- `POST /api/v1/inventory/items` - Create inventory item
- `GET/PUT/DELETE /api/v1/inventory/items/{id}` - Manage items
- `POST /api/v1/inventory/items/{id}/transfer` - Transfer to another location

#### Transactions
- `GET /api/v1/inventory/items/{id}/transactions` - View transaction history
- `POST /api/v1/inventory/items/{id}/transactions` - Record transaction

#### Alerts
- `GET /api/v1/inventory/alerts/low-stock` - Get low stock alerts
- `GET /api/v1/inventory/alerts/expiring?days=7` - Get expiring items
- `POST /api/v1/inventory/alerts/mark-expired` - Mark expired items

#### Reports
- `GET /api/v1/inventory/reports/valuation` - Inventory valuation report
- `GET /api/v1/inventory/reports/batch/{number}` - Batch traceability

[→ Full Inventory Documentation](./api/inventory/overview.md)

### Marketplace (Phase 3 - ✅ Complete)

#### Public Browse Endpoints (Wholesaler/Guest)
- `GET /api/v1/marketplace/listings` - Browse listings with filters & pagination
- `GET /api/v1/marketplace/listings/{id}` - Get listing detail
- `GET /api/v1/marketplace/provinces` - Get provinces with active listings
- `GET /api/v1/marketplace/categories` - Get available product categories

#### Farmer Listing Management
- `GET /api/v1/marketplace/my-listings` - List own listings
- `POST /api/v1/marketplace/my-listings` - Create new listing
- `GET /api/v1/marketplace/my-listings/{id}` - Get own listing
- `PUT /api/v1/marketplace/my-listings/{id}` - Update listing
- `POST /api/v1/marketplace/my-listings/{id}/publish` - Publish draft listing
- `POST /api/v1/marketplace/my-listings/{id}/pause` - Pause active listing
- `POST /api/v1/marketplace/my-listings/{id}/resume` - Resume paused listing
- `DELETE /api/v1/marketplace/my-listings/{id}` - Archive listing

[→ Full Marketplace Documentation](./api/marketplace/overview.md)

## Common HTTP Headers

### Required for All Authenticated Requests
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Optional Headers
```http
Accept-Language: en-US
X-Request-ID: {unique-id}
```

## Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

## Error Response Format

All errors follow this structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Validation errors (422) include field-level details:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

[→ Full Error Handling Guide](./guides/error-handling.md)

## Pagination

List endpoints support pagination via query parameters:

```bash
GET /api/v1/inventory/items?skip=0&limit=20
```

**Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100, max: 1000)

**Response:**
Returns an array of items. Use `skip` for offset-based pagination.

[→ Pagination Guide](./guides/pagination.md)

## Filtering

Many endpoints support filtering via query parameters:

```bash
# Filter inventory items by status
GET /api/v1/inventory/items?status=available

# Filter by warehouse
GET /api/v1/inventory/items?warehouse_id=5

# Multiple filters
GET /api/v1/inventory/items?status=available&low_stock_only=true&expiring_within_days=7
```

[→ Full Filtering Documentation](./api/inventory/items.md#filtering)

## Account Types

The API supports three account types with different permissions:

| Account Type | Description | Access Level |
|--------------|-------------|--------------|
| **farmer** | Individual farmers | Own inventory, create products |
| **wholesaler** | Bulk buyers/sellers | Advanced inventory, bulk orders |
| **admin** | System administrators | Full system access |

## Interactive API Documentation

FastAPI provides auto-generated interactive documentation:

### Swagger UI
**URL:** `http://localhost:8000/docs`
Try out API endpoints directly in your browser with authentication support.

### ReDoc
**URL:** `http://localhost:8000/redoc`
Clean, readable API reference documentation.

## Getting Started Guides

### For Frontend Developers
1. [Authentication Flow](./guides/authentication-flow.md) - How to implement login/signup
2. [Common Workflows](./guides/common-workflows.md) - Step-by-step guides for common tasks
3. [JavaScript Examples](./examples/javascript-examples.md) - React/Vue/vanilla JS code samples
4. [Error Handling](./guides/error-handling.md) - How to handle errors gracefully

### Quick Examples

#### Setting Up Axios with Auth
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

#### Creating an Inventory Item
```javascript
const createInventoryItem = async (itemData) => {
  try {
    const response = await api.post('/inventory/items', {
      inventory_type_id: 1,
      item_name: "Fresh Tomatoes",
      current_quantity: 100,
      unit: "kg",
      minimum_quantity: 20,
      expiry_date: "2025-10-20T00:00:00Z",
      batch_number: "HARVEST-2025-10-10",
      cost_per_unit: 25.50,
      warehouse_id: 1
    });

    console.log('Item created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating item:', error.response?.data);
    throw error;
  }
};
```

## Phase Roadmap

### ✅ Phase 1: Core Inventory Management (Current)
- Inventory types, warehouses, storage bins
- Inventory items with batch/lot tracking
- Transaction audit trail
- Low stock & expiry alerts
- Inventory valuation reports

### 🚧 Phase 2: Harvest Yield Tracking (Upcoming)
- Crop plantings and harvests
- Livestock and animal measurements
- Automatic inventory creation from harvests

### ✅ Phase 3: Product Catalog & Marketplace (Complete)
- Product listings with photos and categories
- Browse-only marketplace for wholesalers
- Search by title/description
- Filter by category, province, price range
- Farmer listing management (draft, publish, pause, archive)

### 📅 Phase 4: Order Management
- Order creation and tracking
- Farmer → Wholesaler workflow
- Wholesaler → Retailer workflow
- Order status management

### 📅 Phase 5: Payment Integration
- Stripe integration
- Yoco (SA payment gateway)
- PayFast support
- Payment link generation

### 📅 Phase 6: Notifications
- Email notifications (AWS SES)
- SMS alerts (AWS SNS)
- Low stock/expiry notifications
- Order status updates

## Support & Resources

- **API Issues:** [GitHub Issues](https://github.com/Beyond-Agriculture-Technologies/BeyondAgri/issues)
- **OpenAPI Spec:** Available at `/openapi.json`
- **Postman Collection:** [Download](../docs/examples/postman-collection.json)

## Documentation Index

### API Reference
- [Authentication](./api/authentication.md)
- [Accounts](./api/accounts.md)
- [Inventory System](./api/inventory/)
  - [Overview](./api/inventory/overview.md)
  - [Inventory Types](./api/inventory/types.md)
  - [Warehouses](./api/inventory/warehouses.md)
  - [Inventory Items](./api/inventory/items.md)
  - [Transactions](./api/inventory/transactions.md)
  - [Alerts](./api/inventory/alerts.md)
  - [Reports](./api/inventory/reports.md)
- [Marketplace](./api/marketplace/)
  - [Overview](./api/marketplace/overview.md)

### Data Models
- [Account Models](./models/account-models.md)
- [Inventory Models](./models/inventory-models.md)
- [Enums Reference](./models/enums.md)

### Guides
- [Authentication Flow](./guides/authentication-flow.md)
- [Error Handling](./guides/error-handling.md)
- [Pagination](./guides/pagination.md)
- [Common Workflows](./guides/common-workflows.md)

### Examples
- [cURL Examples](./examples/curl-examples.md)
- [JavaScript Examples](./examples/javascript-examples.md)
- [Postman Collection](./examples/postman-collection.json)

---

**Last Updated:** 2026-01-10
**API Version:** v1.1.0
**Documentation Version:** 1.1
