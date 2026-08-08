# Jansuvida Backend

This directory is the backend foundation plan for moving the customer portal from browser-only prototype storage to a real server/database.

## Recommended stack
- Node.js + Express API
- MySQL 8+
- HTTPS in production
- HttpOnly, Secure, SameSite session cookie or short-lived access token + refresh token
- Passwords stored only as Argon2id/bcrypt hashes

## Core API contract

### Authentication
- `POST /api/auth/register` — create customer account
- `POST /api/auth/login` — authenticate customer
- `POST /api/auth/logout` — invalidate session
- `GET /api/auth/me` — current customer

### Services
- `GET /api/services` — active services
- `POST /api/admin/services` — admin creates service
- `PATCH /api/admin/services/:id` — admin updates service
- `DELETE /api/admin/services/:id` — admin disables service

### Applications
- `POST /api/applications` — authenticated customer creates application
- `GET /api/applications` — authenticated customer's applications
- `GET /api/applications/:applicationNo` — customer/admin tracking
- `PATCH /api/admin/applications/:id/status` — admin changes status

### Documents
- `POST /api/applications/:id/documents` — authenticated upload
- `GET /api/applications/:id/documents` — authorized document list
- `PATCH /api/admin/documents/:id/status` — admin verifies/rejects

### Payments
- `POST /api/payments` — create payment request
- `GET /api/payments` — customer payment history
- `GET /api/admin/payments` — admin payment queue
- `PATCH /api/admin/payments/:id/status` — admin verification

## Security requirements
1. Validate and normalize all input server-side.
2. Never trust customer IDs or application ownership supplied by the browser.
3. Enforce authorization on every customer/admin route.
4. Rate-limit login, registration and sensitive endpoints.
5. Store uploaded files outside the public web root and generate safe server-side filenames.
6. Restrict document MIME types and size; scan uploads before release where available.
7. Do not store passwords, OTPs, API keys or payment secrets in Git.
8. Keep payment confirmation server-side; browser "I Have Paid" is only a request, never proof of payment.
9. Use a verified payment gateway webhook/signature verification for automatic payment confirmation.
10. Use HTTPS and secure cookies in production.

The existing `database/schema.sql` is the starting relational schema. The frontend pages remain usable as a prototype until these APIs are implemented and configured.