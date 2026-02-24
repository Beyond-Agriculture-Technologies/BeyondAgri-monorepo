# BeyondAgri Monorepo

A comprehensive agricultural supply chain management platform connecting farmers, wholesalers, and administrators. Built for the South African market with an offline-first mobile app and a serverless backend.

## Repository Structure

```
BeyondAgri-monorepo/
├── backend/    # FastAPI backend (Python)
├── mobile/     # React Native mobile app (TypeScript / Expo)
```

## Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Backend            | FastAPI, Python 3.9–3.12, Poetry                |
| Database           | PostgreSQL, SQLAlchemy 2.0, Alembic, GeoAlchemy2|
| Auth               | AWS Cognito, JWT                                |
| Infrastructure     | AWS Lambda, API Gateway, S3, SNS/SQS            |
| Mobile             | React Native 0.81, Expo SDK 54, TypeScript      |
| Mobile State       | Zustand                                         |
| Mobile Navigation  | Expo Router (file-based)                        |
| Offline Storage    | SQLite (expo-sqlite)                            |
| Maps               | Google Maps API (geocoding, elevation)           |

## Features

### Inventory Management
- CRUD for inventory items with photo support
- Warehouse and storage bin management
- Transaction history (add, remove, transfer, sale, spoilage, return)
- Low-stock and expiry alerts
- Batch tracking for quality control
- Valuation reports by category and status

### Marketplace
- Farmers list produce for sale (harvest, meat, poultry, dairy, grains)
- Wholesalers browse and purchase
- Listing lifecycle management (draft, active, paused, sold out, expired)

### Role-Based Access Control
- **Farmer** — manage own inventory and listings
- **Wholesaler** — manage warehouses, transfer items, view aggregated analytics
- **Admin** — system-wide access and user management

### Offline-First Mobile
- Local SQLite database for full offline capability
- Automatic sync when connectivity is restored
- Secure token storage with expo-secure-store

### Authentication
- Registration with phone verification (SMS via Cognito)
- JWT-based session management with refresh tokens
- Password reset flow

### Geolocation
- Google Maps geocoding for farm and warehouse addresses
- Elevation data API

## Getting Started

### Prerequisites

- Python 3.9–3.12 and [Poetry](https://python-poetry.org/)
- PostgreSQL
- Node.js and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Backend

```bash
cd backend

# Install dependencies
poetry install

# Configure environment
cp .env.example .env
# Edit .env with your database, AWS, and Google Maps credentials

# Run database migrations
poetry run alembic upgrade head

# Start the development server
poetry run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Mobile

```bash
cd mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set EXPO_PUBLIC_API_BASE_URL to your backend URL

# Start Expo
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go on a physical device.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `COGNITO_USER_POOL_ID` | AWS Cognito user pool |
| `COGNITO_CLIENT_ID` | AWS Cognito app client |
| `AWS_REGION` | AWS region |
| `AWS_S3_BUCKET` | S3 bucket for file uploads |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins |

### Mobile (`mobile/.env.local`)

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API endpoint |
| `EXPO_PUBLIC_API_VERSION` | API version (e.g. `v1`) |

See the `.env.example` files in each directory for the full list.

## Project Documentation

- [`backend/README.md`](backend/README.md) — backend setup, architecture, and API details
- [`mobile/README.md`](mobile/README.md) — mobile app setup, architecture, and testing
- [`backend/docs/`](backend/docs/) — integration guides and implementation details

## License

Proprietary — Beyond Agriculture Technologies.
