# ebookdz Setup and Deployment Guide

This guide provides a complete, end-to-end reference to set up, configure, run, and deploy the ebookdz project. It includes API documentation, database schema, SlickPay integration, and deployment instructions for Railway, Heroku, Netlify, and Vercel.

---

## 1) Project Overview

- Name: ebookdz
- Purpose: Digital e-book marketplace/platform for browsing, purchasing, and downloading ebooks.
- Stack (typical):
  - Backend: Node.js (Express) or Python (FastAPI) with REST APIs
  - Frontend: React/Vue or Server-rendered templates
  - Database: PostgreSQL or MongoDB
  - Payments: SlickPay
  - Storage: Local dev storage; production object storage (e.g., AWS S3) or repository assets
  - Deployment targets: Railway/Heroku (backend), Netlify/Vercel (frontend)

Adjust paths and commands below to match your actual codebase structure (api/, client/, etc.).

---

## 2) System Requirements

- Node.js >= 18.x and npm or pnpm/yarn
- Git
- Database:
  - PostgreSQL >= 14 (recommended) OR MongoDB >= 6
- Optional: Docker >= 24 if running via containers
- Accounts/keys:
  - SlickPay API keys (sandbox and production)
  - Deployment accounts for Railway/Heroku/Netlify/Vercel

---

## 3) Installation

Clone repository and install dependencies:

```bash
# Clone
git clone https://github.com/Clickdzpro1/ebookdz.git
cd ebookdz

# If monorepo (example)
# cd api && npm install
# cd ../client && npm install

# Single repo (example)
npm install
```

If using a database locally, ensure it is running and accessible.

---

## 4) Configuration

Create an environment file (.env) at project root (and in api/ or client/ if separated). Example keys below; only include those used by your codebase.

```bash
# Server
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Database (Postgres example)
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ebookdz
# OR Mongo example
MONGODB_URI=mongodb://localhost:27017/ebookdz

# JWT/Auth
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d

# SlickPay
SLICKPAY_PUBLIC_KEY=pk_test_xxx
SLICKPAY_SECRET_KEY=sk_test_xxx
SLICKPAY_WEBHOOK_SECRET=whsec_xxx
SLICKPAY_CURRENCY=DZD

# Storage (optional)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# CORS / Frontend URL
CLIENT_URL=http://localhost:5173
```

Secure .env files (never commit secrets). Use environment variables in production.

---

## 5) Running Locally

- With Node/Express backend:

```bash
npm run dev     # e.g., nodemon
# or
npm start
```

- With a separate client:

```bash
# in client/
npm run dev     # e.g., Vite/React at http://localhost:5173
```

Visit the BASE_URL or client URL. Ensure DB connection and SlickPay keys are set in .env.

---

## 6) Database Structure

Below is a reference schema. Adjust to your implementation.

- users
  - id (uuid)
  - name, email (unique), password_hash
  - role (admin, user)
  - created_at, updated_at

- books
  - id (uuid)
  - title, author, description
  - price_cents (int), currency (DZD)
  - file_url (string), cover_url (string)
  - created_at, updated_at

- orders
  - id (uuid)
  - user_id (fk users.id)
  - status (pending, paid, failed, refunded)
  - total_cents (int), currency (DZD)
  - created_at, updated_at

- order_items
  - id (uuid)
  - order_id (fk orders.id)
  - book_id (fk books.id)
  - unit_price_cents (int)
  - quantity (int)

- payments
  - id (uuid)
  - order_id (fk orders.id)
  - provider ("slickpay")
  - provider_payment_id
  - amount_cents
  - status (initiated, succeeded, failed)
  - raw (jsonb)
  - created_at

Migrations: Use Prisma/Knex/Sequelize or Mongo migrations as applicable. Run migrations on deploy.

---

## 7) API Documentation

Base URL: /api

Auth
- POST /api/auth/register
  - body: { name, email, password }
  - 201: { user, token }
- POST /api/auth/login
  - body: { email, password }
  - 200: { user, token }

Books
- GET /api/books
  - query: { q, page, limit }
  - 200: { items: Book[], total }
- GET /api/books/:id
  - 200: Book
- POST /api/books (admin)
  - body: { title, author, description, price_cents, currency, file_url, cover_url }

Orders & Checkout
- POST /api/checkout
  - body: { items: [{ book_id, quantity }] }
  - 200: { order_id, client_secret | payment_intent }
- GET /api/orders/:id
  - 200: Order with items and status

Webhooks
- POST /api/webhooks/slickpay
  - Verify with SLICKPAY_WEBHOOK_SECRET
  - Update payment status and order status accordingly

Response Examples

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "secret" }
---
200 OK
{ "user": {"id":"...","email":"user@example.com"}, "token": "jwt..." }
```

```http
POST /api/checkout
Content-Type: application/json
Authorization: Bearer <token>

{ "items": [{"book_id":"b_123","quantity":1}] }
---
200 OK
{ "order_id": "ord_abc", "payment_intent": "sp_pi_456" }
```

Error Model
- 400: { error: "message" }
- 401: { error: "unauthorized" }
- 404: { error: "not_found" }
- 500: { error: "internal_error", trace?: string }

---

## 8) SlickPay Integration Guide

1. Create SlickPay account and obtain public/secret keys (sandbox first).
2. Server-side payment intent creation (example in Node/Express):

```js
// pseudo-code
import axios from 'axios'

async function createSlickPayIntent(order) {
  const res = await axios.post('https://api.slickpay.dev/v1/payment_intents', {
    amount: order.total_cents,
    currency: process.env.SLICKPAY_CURRENCY || 'DZD',
    metadata: { order_id: order.id }
  }, {
    headers: { Authorization: `Bearer ${process.env.SLICKPAY_SECRET_KEY}` }
  })
  return res.data // { id, status, ... }
}
```

3. Client confirmation: Use SlickPay SDK/widget if available, or redirect/hosted page as per docs.
4. Webhook handling:
   - Validate signature using SLICKPAY_WEBHOOK_SECRET
   - On payment.succeeded: mark payment succeeded, set order.status = "paid", grant download access
   - On payment.failed: set order.status = "failed"
5. Test with sandbox events. Log raw payloads for debugging.

---

## 9) Deployment

General
- Keep secrets in platform env vars (never commit .env)
- Run DB migrations on each deploy
- Configure allowed origins (CORS) and production BASE_URL/CLIENT_URL

Railway (backend)
- Create a new project from GitHub repo
- Add a PostgreSQL plugin or external DB; set DATABASE_URL
- Set env vars: PORT, NODE_ENV=production, JWT_SECRET, SlickPay keys, CLIENT_URL
- Railway auto-builds: set Start Command (e.g., `npm start`)
- Add a "Deploy Hook" if needed

Heroku (backend)
- heroku create ebookdz-api
- heroku addons:create heroku-postgresql:mini
- heroku config:set NODE_ENV=production PORT=3000 DATABASE_URL=... JWT_SECRET=... SLICKPAY_SECRET_KEY=... SLICKPAY_WEBHOOK_SECRET=... CLIENT_URL=https://your-frontend
- git push heroku main
- heroku run npm run migrate

Netlify (frontend)
- New site from Git
- Build command: `npm run build`
- Publish directory: `dist` (Vite) or `build` (CRA)
- Environment: VITE_API_URL=https://your-api
- Enable redirects for SPA: _redirects file with `/* /index.html 200`

Vercel (frontend or fullstack)
- Import project from GitHub
- Framework preset: if using Next.js
- Env vars: NEXT_PUBLIC_API_URL, SLICKPAY_PUBLIC_KEY
- Set build command/output as framework requires

Database Migrations on Deploy
- Railway: Add a "Deploy command" like `npm run migrate`
- Heroku: `release` phase or `heroku run npm run migrate`
- Vercel/Netlify (frontend): not applicable unless using serverless DB migrations tool

---

## 10) Troubleshooting

- Build fails: Check Node version, lockfile, and build command
- 500 errors: Inspect logs (Railway/Heroku dashboard). Verify DATABASE_URL and JWT_SECRET
- DB connection refused: Ensure correct SSL settings in production; add `?sslmode=require` for Postgres if necessary
- CORS issues: Set correct CLIENT_URL and server CORS configuration
- Payment not updating: Verify webhook signing secret and endpoint URL is publicly reachable
- 404 API routes: Confirm base path (/api) and deployment routing rules
- Static assets missing: Ensure correct public/ storage config and URLs
- Timeouts: Optimize heavy queries, increase platform timeouts if supported

---

## 11) Commit Message

Add comprehensive setup and deployment guide
