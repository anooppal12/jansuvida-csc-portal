# JANSUVIDA — CSC Digital Services Portal

**Brand line:** Har Seva Ek Jagah – Digital India Ka Vishwas

Jansuvida is a customer-facing digital services portal for CSC / Jan Seva Kendra operations.

## Deployment status

- **Status:** Development / not live
- **Live URL:** Not available yet
- **Frontend:** Static HTML, CSS and JavaScript in the repository root
- **Backend:** Node.js + Express in `backend/`
- **Database:** MySQL
- **Target domain:** `jansuvida.com` (domain ownership and availability must be confirmed separately)

Do not treat the portal as production-ready until the frontend, API, database, authentication, uploads and admin workflows have been deployed and tested together.

## Current frontend

- Responsive homepage and mobile navigation
- Searchable service cards
- Government schemes information section
- Customer login / registration interface
- Application tracking interface
- Customer notifications area
- WhatsApp contact link

## Backend capabilities in the codebase

- Customer authentication
- Admin authentication and management APIs
- Service listing
- Customer applications and status management
- Document upload and review routes
- Payment routes
- Customer notifications
- Health-check endpoint at `/api/health`

These are code-level capabilities only; they require a configured database and a running backend service.

## Local development

### 1. Backend

Requirements: Node.js 20+ and MySQL.

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with the real database connection and strong, unique secrets. Never commit the real `.env` file or production credentials.

Then start the API:

```bash
npm run dev
```

The API defaults to port 3000. Check `/api/health` after creating and applying the required database schema.

### 2. Frontend

Serve the repository root using a local static web server. Configure the frontend API base URL to point to the backend, for example:

```html
<script>window.JANSUVIDA_API_BASE = "http://localhost:3000/api";</script>
<script src="assets/js/app.js"></script>
```

For production, use the deployed HTTPS API URL and configure the backend CORS origin to the exact frontend domain.

## Hosting plan

GitHub stores the source code; it does not run the Express API or MySQL database. A production deployment needs:

1. Static frontend hosting with HTTPS.
2. A separate Node.js hosting service for `backend/`.
3. A managed MySQL database and the required schema/migrations.
4. Environment variables configured in the backend host (not in source files).
5. Correct frontend API URL and backend CORS origin.
6. End-to-end testing of customer login, registration, applications, documents, payments and admin workflows.

GitHub Pages can host the static frontend only. It cannot host this Express/MySQL backend. Do not publish a frontend-only deployment as a working customer portal before the API is configured.

## Brand and contact

- **JANSUVIDA**
- **Tagline:** Har Seva Ek Jagah – Digital India Ka Vishwas
- **Phone:** 011-69313168 / 8273537894
- **WhatsApp:** 9627140116
- **Email:** bankofindiacspmpi@gmail.com
