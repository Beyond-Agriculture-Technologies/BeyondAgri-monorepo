# BeyondAgri

This repository contains the backend service for the Smart Farming Platform, separating it from the mobile/web interface.

📌 Backend Repository – Smart Farming Platform (MVP)

This repository contains the backend service for the Smart Farming Platform MVP.
It is built as a monolithic FastAPI application deployed on AWS Lambda behind an API Gateway, following a serverless-first architecture to minimize costs and complexity.

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

🔹 Additional Notes
• Uses IndexedDB sync endpoints for offline-first experience.
• Designed for auto-scaling with AWS Lambda.
• Low operational overhead with backups, logging, and monitoring handled by AWS services.
• Future extensions include IoT integration, advanced logistics optimization, internal payments, and predictive analytics.
