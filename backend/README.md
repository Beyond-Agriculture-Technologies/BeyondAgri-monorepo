# BeyondAgri

This repository contains the backend service for the Smart Farming Platform, separating it from the mobile/web interface.

📌 Backend Repository – Smart Farming Platform (MVP)

This repository contains the backend service for the Smart Farming Platform MVP.
It is built as a monolithic FastAPI application deployed on AWS Lambda behind an API Gateway, following a serverless-first architecture to minimize costs and complexity.

## 🚀 Quick Start

### Prerequisites

- Python 3.9-3.12
- Poetry (for dependency management)
- PostgreSQL (for local development)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd BeyondAgri

# Install dependencies using Poetry
poetry install

# Copy environment variables template
cp .env.example .env
# Edit .env with your configuration

# Run the development server
poetry run uvicorn app.main:app --reload
```

The server will start at `http://localhost:8000` with automatic API documentation available at `http://localhost:8000/docs`.

### Project Structure

```
app/
├── api/v1/              # API routes and endpoints
│   ├── endpoints/       # Individual endpoint modules
│   └── api.py          # Main API router
├── core/               # Core configuration and security
│   ├── config.py       # Application settings
│   └── security.py     # Security utilities
├── models/             # Database models
├── services/           # Business logic services
└── main.py            # FastAPI application entry point
```

🔹 Key Features
• User Management – Registration, KYC, onboarding, and RBAC via AWS Cognito.
• Marketplace – Product listings (vegetables, fruits, meat, poultry), order creation, and external payment link generation.
• Inventory – Farmer inventory tracking, wholesaler aggregation, and expiry/spoilage alerts.
• Logistics – Delivery request creation and status tracking using AWS Location Service.
• Community Forum – Minimal Q&A-style feed with basic moderation.
• Offline Sync API – REST-based synchronization endpoints with versioned change logs for PWA offline support.

🔹 Tech Stack
• Framework: FastAPI (Python)
• Hosting: AWS Lambda (serverless monolith)
• Database: PostgreSQL (AWS RDS)
• Authentication: AWS Cognito (JWT-based)
• Storage: Amazon S3 + CloudFront for media files
• Messaging: SNS/SQS for asynchronous tasks
• CI/CD: CircleCI or GitHub Actions
• Monitoring: AWS CloudWatch

## 🛠️ Development Commands

### Virtual Environment Activation

**Note**: Poetry 2.0+ doesn't include the `shell` command by default. Use one of these methods:

```bash
# Option 1: Run commands directly (Recommended)
poetry run uvicorn app.main:app --reload --port 8001

# Option 2: Manual activation
# First, get your virtual environment path:
poetry env list
# Then activate using the full path:
source /Users/[username]/Library/Caches/pypoetry/virtualenvs/[env-name]/bin/activate

# To deactivate:
deactivate
```

### Common Commands

```bash
# Run development server with auto-reload
poetry run uvicorn app.main:app --reload

# Run tests
poetry run pytest

# Format code
poetry run black .
poetry run isort .

# Type checking
poetry run mypy app/

# Linting
poetry run flake8 app/
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure the following:

- **Database**: PostgreSQL connection details
- **JWT**: Secret key for authentication
- **AWS**: Credentials and service configuration
- **CORS**: Allowed origins for cross-origin requests

🔹 Additional Notes
• Uses IndexedDB sync endpoints for offline-first experience.
• Designed for auto-scaling with AWS Lambda.
• Low operational overhead with backups, logging, and monitoring handled by AWS services.
• Future extensions include IoT integration, advanced logistics optimization, internal payments, and predictive analytics.
