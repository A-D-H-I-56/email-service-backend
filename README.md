# 🚀 Email Service Backend (Open BYOC Gateway)

A robust, production-ready, Bring-Your-Own-Credentials (BYOC) email delivery API built with **Node.js, Express 5, Nodemailer, MongoDB, and Clerk**.

Designed for developers, SaaS products, and personal projects to send transactional emails through their own Gmail or custom SMTP accounts with real-time verification, dynamic variable interpolation, and encrypted credential storage.

---

## ✨ Features

- 🔑 **Bring-Your-Own-Credentials (BYOC)**: Supports **Gmail App Passwords** and **Google OAuth2** dynamically per request or per user profile.
- ⚡ **Three Operational Authentication Modes**:
  - **Stateless / Guest Mode**: Send emails on the fly by passing credentials directly in the request payload (zero persistence).
  - **Session-Authenticated (Clerk)**: Authenticate with Clerk Bearer tokens to store credentials securely and query send history.
  - **API Key Gateway**: Send emails server-to-server using an auto-generated API key (`x-api-key`) without storing passwords in caller clients.
- 🧩 **Dynamic Template Interpolation**: Automatically substitutes variables formatted as `{name}` or `{{name}}` across Subject lines, HTML bodies, and Plaintext fallbacks. Defaults to recipient's local username if `{name}` is omitted.
- 🛡️ **Enterprise-Grade Security**:
  - **AES-256-GCM Encryption** with unique IV and Auth Tag for stored credentials at rest.
  - Automatic error sanitization to ensure passwords and client secrets never leak in logs or API responses.
  - Granular IP-based rate limiting on sensitive routes.
- 📎 **Secure File Attachments (Hybrid JSON)**: Send documents (PDFs, DOCX), images (PNG, JPEG), media, or archives up to 25MB via **Base64 strings**, **HTTPS URLs**, or **Inline CIDs** with automatic blocked dangerous extension filtering (`.exe`, `.bat`, etc.) and SSRF/LFI protection.
- 📬 **Full MIME Delivery**: Support for `to` (single email or array), `cc`, `bcc`, `replyTo`, `fromName`, `html`, and plaintext fallback.
- 📊 **Audit & Activity Logs**: Automated tracking of delivery statuses, response latencies (ms), and failure diagnostics in MongoDB.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+ / v20+ recommended)
- **Framework**: Express 5 (ES Modules)
- **Email Dispatcher**: Nodemailer & Google APIs (`googleapis`)
- **Database & ODM**: MongoDB with Mongoose
- **Authentication**: `@clerk/express` & API Key management
- **Validation**: Zod
- **Security & Utilities**: Crypto (AES-256-GCM), Helmet, CORS, Express-Rate-Limit

---

## 📁 Project Structure

```text
src/
├── app.js                  # Express 5 server configuration & global middleware
├── config/
│   └── db.js               # MongoDB connection lifecycle management
├── controllers/
│   └── emailController.js  # Handlers: Send, Verify, User Config, Activity Logs
├── models/
│   ├── UserConfig.js       # Encrypted credentials & API key schema
│   └── EmailLog.js         # Audit log & delivery telemetry schema
├── routes/
│   └── emailRoutes.js      # API router with rate-limiting middleware
├── schemas/
│   └── emailSchema.js      # Zod request validation schemas
├── services/
│   └── emailService.js     # Transporter factory, verification & interpolation engine
└── utils/
    └── crypto.js           # AES-256-GCM encryption and decryption helpers
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 18+** installed (`node -v`)
- **MongoDB** instance (Local MongoDB or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Gmail Account** with 2FA enabled and an [App Password](https://myaccount.google.com/apppasswords) generated
- *(Optional)* **Clerk Account** ([Clerk Dashboard](https://dashboard.clerk.com)) for persistent user profiles

### 2. Installation
```bash
git clone https://github.com/A-D-H-I-56/email-service-backend.git
cd email-service-backend
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (see `.env.example`):

```env
PORT=5050
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/email-service?retryWrites=true&w=majority

# Clerk Authentication (Optional in Guest/Stateless mode)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AES-256 Encryption Secret (Must be 32+ characters)
ENCRYPTION_SECRET=your-secure-encryption-secret-32-chars-min
```

### 4. Running the Server
```bash
# Development mode (auto-reload with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5050` (or your configured `PORT`).

---

## 📡 API Reference

### 1. Health Check
Checks service availability, MongoDB database connection status, and Clerk status.

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "Open BYOC Email Gateway",
  "database": "connected",
  "clerkEnabled": true,
  "timestamp": "2026-08-31T01:30:00.000Z"
}
```

---

### 2. Verify Sender Credentials
Validates whether the provided Gmail App Password or OAuth2 credentials can successfully connect and authenticate with SMTP.

- **Rate Limit**: 30 requests / 15 minutes

```http
POST /api/verify-credentials
Content-Type: application/json
```

#### A. Gmail App Password
```json
{
  "auth": {
    "type": "app_password",
    "user": "your-email@gmail.com",
    "pass": "xxxx xxxx xxxx xxxx"
  }
}
```

#### B. Google OAuth2
```json
{
  "auth": {
    "type": "oauth2",
    "user": "your-email@gmail.com",
    "clientId": "your-google-client-id.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-your-client-secret",
    "refreshToken": "1//04your-refresh-token",
    "redirectUri": "https://developers.google.com/oauthplayground"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Credentials verified successfully. Ready to send emails!"
}
```

---

### 3. Send Email
Dispatches an email with dynamic template interpolation. Credentials can be supplied per-request (Stateless mode), via Clerk session token, or via API Key (`x-api-key`).

- **Rate Limit**: 100 requests / 15 minutes

```http
POST /api/send-email
Content-Type: application/json
```

#### Option A: Stateless / Guest Mode (Pass credentials directly)
```json
{
  "auth": {
    "type": "app_password",
    "user": "your-email@gmail.com",
    "pass": "xxxx xxxx xxxx xxxx"
  },
  "message": {
    "to": "recipient@example.com",
    "subject": "Welcome to our platform, {name}! 🎉",
    "html": "<h1>Hello {name}</h1><p>Your order #{orderId} is confirmed!</p>",
    "text": "Hello {name}, your order #{orderId} is confirmed!",
    "fromName": "Acme Team",
    "variables": {
      "name": "Alex",
      "orderId": "98421"
    }
  }
}
```

#### Option B: Authenticated / Dashboard Mode (Using Clerk JWT)
```http
POST /api/send-email
Authorization: Bearer <clerk_session_jwt>
Content-Type: application/json

{
  "message": {
    "to": ["user1@example.com", "user2@example.com"],
    "subject": "Monthly Newsletter",
    "html": "<p>Hi {{name}}, here is your monthly digest.</p>",
    "fromName": "Newsletter Team"
  }
}
```

#### Option C: Server-to-Server Gateway (Using API Key)
```http
POST /api/send-email
x-api-key: es_9f83a8...
Content-Type: application/json

{
  "message": {
    "to": "customer@example.com",
    "subject": "Password Reset",
    "html": "<p>Click here to reset your password.</p>"
  }
}
```

#### Option D: Sending with File Attachments (Base64 & Remote HTTPS URLs)
```http
POST /api/send-email
Authorization: Bearer <clerk_session_jwt>
Content-Type: application/json

{
  "message": {
    "to": "client@example.com",
    "subject": "Invoice & Report #{orderId}",
    "html": "<p>Hi {name}, your invoice is attached.</p><img src=\"cid:logo\">",
    "variables": {
      "orderId": "98421"
    },
    "attachments": [
      {
        "filename": "invoice.pdf",
        "content": "JVBERi0xLjQKJ...",
        "contentType": "application/pdf"
      },
      {
        "filename": "annual-report.docx",
        "path": "https://cdn.example.com/documents/report.docx"
      },
      {
        "filename": "company-logo.png",
        "path": "https://cdn.example.com/images/logo.png",
        "cid": "logo"
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<7a9f8b2c-1234-5678-abcd-ef0123456789@gmail.com>",
  "latencyMs": 512
}
```

---

### 4. User Configuration (Authenticated via Clerk)

#### Get Saved Configuration
Retrieves the sender configuration for the authenticated user. Passwords and secrets are never returned in plaintext.

```http
GET /api/user-config
Authorization: Bearer <clerk_session_jwt>
```

**Response (200 OK):**
```json
{
  "success": true,
  "config": {
    "emailUser": "sender@gmail.com",
    "authType": "app_password",
    "clientId": "",
    "defaultSenderName": "Alex from Acme",
    "apiKey": "es_82d9f7a4...",
    "hasSavedCredentials": true,
    "updatedAt": "2026-08-31T01:15:00.000Z"
  }
}
```

#### Save / Update Configuration
Saves or updates sender credentials. Stored values are encrypted at rest using AES-256-GCM and an API Key is provisioned.

```http
POST /api/user-config
Authorization: Bearer <clerk_session_jwt>
Content-Type: application/json
```

**Request Body (App Password):**
```json
{
  "emailUser": "sender@gmail.com",
  "authType": "app_password",
  "appPassword": "xxxx xxxx xxxx xxxx",
  "defaultSenderName": "Support Team"
}
```

**Request Body (OAuth2):**
```json
{
  "emailUser": "sender@gmail.com",
  "authType": "oauth2",
  "clientId": "your-google-client-id.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-your-client-secret",
  "refreshToken": "1//04your-refresh-token",
  "defaultSenderName": "Support Team"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Configuration saved securely",
  "apiKey": "es_82d9f7a421b0cd93e4f71a9e"
}
```

---

### 5. Email Activity Logs (Authenticated via Clerk)
Retrieves the 50 most recent email delivery attempts and their telemetry for the authenticated user.

```http
GET /api/email-logs
Authorization: Bearer <clerk_session_jwt>
```

**Response (200 OK):**
```json
{
  "success": true,
  "logs": [
    {
      "_id": "66d2891f7a4...",
      "clerkUserId": "user_2test12345",
      "senderEmail": "sender@gmail.com",
      "recipient": "recipient@example.com",
      "subject": "Welcome to our platform, Alex! 🎉",
      "status": "sent",
      "latencyMs": 482,
      "error": null,
      "createdAt": "2026-08-31T01:20:00.000Z"
    }
  ]
}
```

---

## 🔒 Security Architecture

1. **Zero Raw Password Storage**: Passwords and refresh tokens are encrypted using **AES-256-GCM** with an initialization vector (IV) and authentication tag.
2. **Secret Redaction**: Error middleware actively scrubs sensitive key patterns (`pass: '...'`, `clientSecret: '...'`, `refreshToken: '...'`) from stack traces before returning responses.
3. **CORS Hardening**: Explicit origin whitelisting via `CORS_ORIGINS`.
4. **App Passwords**: For Gmail accounts, generate 16-character [App Passwords](https://myaccount.google.com/apppasswords) with 2FA enabled.

---

## 📄 License

MIT © [Adnan Alam](https://github.com/A-D-H-I-56)
