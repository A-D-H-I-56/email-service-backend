# 🚀 Email Service Backend (Open BYOC Gateway)

A robust, production-ready, Bring-Your-Own-Credentials (BYOC) email delivery API built with **Node.js, Express 5, Nodemailer, MongoDB, and Clerk**.

Designed for developers, SaaS products, and personal projects to send transactional emails through their own Gmail or custom SMTP accounts with real-time verification, dynamic variable interpolation, and encrypted credential storage.

---

## ✨ Features

- 🔑 **Bring-Your-Own-Credentials (BYOC)**: Supports **Gmail App Passwords** and **OAuth2** dynamically per request or per authenticated user.
- ⚡ **Dual Operational Modes**:
  - **Stateless / Guest Mode**: Send emails directly by providing sender credentials in the request header/body without storing anything.
  - **Authenticated / Cloud Sync**: Integrated with **Clerk** and **MongoDB** to persist AES-256-GCM encrypted credentials and delivery logs.
- 🧩 **Template Variable Interpolation**: Automatically substitutes tokens like `{name}` and `{{name}}` across Subject lines, HTML bodies, and Plaintext fallbacks.
- 🛡️ **Enterprise Security**:
  - **AES-256-GCM Encryption** for sensitive stored passwords and refresh tokens.
  - Secret sanitization on all error outputs (passwords/tokens are never exposed in logs or API responses).
  - IP-based rate limiting on sensitive endpoints.
- 📬 **Full MIME Support**: `to`, `subject`, `html`, `text` (plaintext fallback), `fromName`, `cc`, `bcc`, `replyTo`.
- 📊 **Activity Logging**: Automatically records email delivery status, timestamps, and error diagnostics in MongoDB.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express 5
- **Email Engine**: Nodemailer
- **Database**: MongoDB (via Mongoose)
- **Authentication**: `@clerk/express`
- **Validation**: Zod
- **Security**: Crypto (AES-256-GCM), Helmet, CORS, Express-Rate-Limit

---

## 📁 Project Structure

```text
src/
├── app.js                  # Server bootstrap & middleware chain
├── config/
│   └── db.js               # MongoDB connection lifecycle
├── controllers/
│   └── emailController.js  # Request handlers (Send, Verify, Config, Logs)
├── models/
│   ├── UserConfig.js       # Encrypted credentials & API key schema
│   └── EmailLog.js         # Sent message audit trail schema
├── routes/
│   └── emailRoutes.js      # Express router with validation & rate limiting
├── schemas/
│   └── emailSchema.js      # Zod request validation schemas
├── services/
│   └── emailService.js     # Transporter factory, verification & interpolation
└── utils/
    └── crypto.js           # AES-256-GCM encryption/decryption utilities
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- MongoDB instance (Local MongoDB or MongoDB Atlas)
- Gmail account with an [App Password](https://myaccount.google.com/apppasswords)
- Clerk account (optional, for user persistence)

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
CORS_ORIGIN=http://localhost:5173,https://email-service.adhiz.app

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/email-service

# Clerk Authentication (Optional for Guest Mode)
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Security (32-character hex encryption key)
ENCRYPTION_SECRET=your-32-character-secret-key-here
```

### 4. Running Locally
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

---

## 📡 API Reference

### 1. Health Check
```http
GET /health
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-22T06:30:00.000Z",
  "database": "connected"
}
```

---

### 2. Send Email
```http
POST /api/send-email
Content-Type: application/json
Authorization: Bearer <clerk-jwt-token> (optional if passing auth in body)
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Welcome to our platform, {name}! 🎉",
  "html": "<h1>Hello {name}</h1><p>Thanks for joining!</p>",
  "text": "Hello {name}, thanks for joining!",
  "fromName": "Acme Team",
  "variables": {
    "name": "Alex"
  },
  "auth": {
    "type": "gmail-app-password",
    "user": "your-email@gmail.com",
    "pass": "your-16-char-app-password"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "<abcd-1234@gmail.com>",
  "accepted": ["recipient@example.com"],
  "response": "250 2.0.0 OK"
}
```

---

### 3. Verify Sender Credentials
```http
POST /api/verify-credentials
Content-Type: application/json

{
  "type": "gmail-app-password",
  "user": "your-email@gmail.com",
  "pass": "your-app-password"
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "message": "Gmail SMTP connection verified successfully."
}
```

---

### 4. User Config & Activity Logs (Authenticated)
- `GET /api/user-config`: Retrieves saved sender configuration (passwords returned masked).
- `POST /api/user-config`: Saves or updates encrypted BYOC sender credentials.
- `GET /api/email-logs`: Retrieves recent delivery history for the authenticated user.

---

## 🔒 Security Best Practices

1. **Never commit `.env`**: Always use environment variables in production platforms (Vercel, Render, Railway).
2. **Encrypted Storage**: Sensitive passwords and refresh tokens are encrypted via **AES-256-GCM** using the `ENCRYPTION_SECRET`.
3. **App Passwords**: Recommend users generate dedicated [Gmail App Passwords](https://myaccount.google.com/apppasswords) with 2-Factor Authentication rather than raw passwords.

---

## 📄 License

MIT © [Adnan Alam](https://github.com/A-D-H-I-56)
