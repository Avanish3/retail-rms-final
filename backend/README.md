# Enterprise Retail RMS Backend

Enterprise-ready backend for a Retail Management System built with Express, TypeScript, TypeORM, PostgreSQL, Redis-ready caching, Swagger, and AI insight endpoints.

## Features

- JWT authentication with Admin, Manager, and Cashier roles
- Product and inventory management with low-stock notifications
- Billing/POS flow with tax calculation and payments
- Supply-chain order handling and multi-store support
- Customer purchase history, audit logs, and notifications
- Sales, inventory, profit, and dashboard reporting
- AI endpoints for demand forecasting, smart inventory alerts, recommendations, fraud detection, and dynamic pricing
- Swagger docs at `/api-docs`

## Quick Start

1. Copy `.env.example` to `.env`
2. Start infrastructure with `docker-compose up -d`
3. Install dependencies with `npm install`
4. Create and verify tables with `npm run db:init`
5. Seed demo data with `npm run seed`
6. Start the API with `npm run dev`

## Database Connection

- PostgreSQL host: `127.0.0.1`
- PostgreSQL port: `5432`
- Database name: `retail_rms`
- Default schema: `public`

If the API starts without errors but you do not see tables, make sure your database client is connected to the same host and port as `backend/.env`. The current local setup uses `127.0.0.1:5432`.

## pgAdmin Check

Open the `retail_rms` database in pgAdmin and run `backend/sql/verify-retail-rms.sql`.

Expected Retail RMS tables:

- `audit_logs`
- `customers`
- `inventory`
- `notifications`
- `order_items`
- `orders`
- `payments`
- `products`
- `stores`
- `users`

If you see `inventory_items` in `cognexia_inventory`, that is a different database and not this project.

## Demo Credentials

- `admin@retailrms.com` / `Password@123`
- `manager@retailrms.com` / `Password@123`
- `cashier@retailrms.com` / `Password@123`

## Key Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/inventory/upsert`
- `POST /api/billing`
- `GET /api/reports/dashboard`
- `GET /api/ai/demand-forecast`
- `GET /api/ops/audit-logs`
