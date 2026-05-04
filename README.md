# Email Service Backend

A small Express API that sends email through Gmail using OAuth2. It includes basic input validation, rate limiting, and security headers.

## Features

- Gmail OAuth2 via Nodemailer and Google APIs
- Rate-limited email endpoint
- CORS allowlist support
- Health check endpoint

## Tech Stack

- Node.js, Express
- Nodemailer
- Google APIs (OAuth2)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- A Google Cloud project with Gmail API enabled
- OAuth2 credentials and a refresh token

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
PORT=5000
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
EMAIL_USER=your-email@gmail.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
```

Notes:

- `CORS_ORIGINS` is optional. If omitted or empty, CORS is disabled.
- `GOOGLE_REDIRECT_URI` is optional; the default is the OAuth Playground URL.

### Run

```bash
npm run dev
```

```bash
npm start
```

## API

Base URL: `http://localhost:5000`

### Health

`GET /health`

Response:

```json
{ "status": "ok" }
```

### Send Email

`POST /api/send-email`

Rate limit: 50 requests per 15 minutes per IP.

Request body:

```json
{
  "to": "user@example.com",
  "subject": "Hello",
  "htmlContent": "<p>Hi there!</p>"
}
```

Responses:

- `200 OK` on success
- `400 Bad Request` for invalid/missing fields
- `500 Internal Server Error` for unexpected errors

## Project Structure

```
src/
  app.js
  config/
    mailConfig.js
  controllers/
    emailController.js
  routes/
    emailRoutes.js
  services/
    emailService.js
```

## Security Notes

- Do not commit `.env`.
- Use a dedicated Gmail account and rotate refresh tokens if exposed.

## License

ISC
