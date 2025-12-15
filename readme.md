# Template Website Hotel with HTML, CSS, JAVASCRIPT

## Screenshots

![preview img](/preview.png)

## Run Locally

- Prerequisites: Node.js 18+.
- Install and start:

```bash
npm install
npm start
```

The site serves at http://localhost:3000 (or the `PORT` you set).

## Make It Public (Temporary)

- LocalTunnel (no account):

```bash
npx localtunnel --port 3000
# or with a subdomain (best-effort):
npx localtunnel --port 3000 --subdomain heavensdoor-hotel
```

- ngrok (requires account/token):

```bash
npm i -g ngrok
ngrok http 3000
```

Both commands give you a public URL that proxies to your local server.

## Deploy (Persistent)

- Render.com or Railway.app are the simplest for this Express app:
	- Push this folder to a GitHub repo.
	- Create a new Web Service, pick your repo, set the Start Command to `npm start`.
	- Add the environment variables from `.env.example` (do not commit real secrets).
	- Deploy; you’ll get a public URL.
	- For custom domains and DNS, see [DEPLOY.md](DEPLOY.md).

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

- `PORT`: Web server port (default 3000)
- `HOTEL_NAME`: Displayed in emails
- `FROM_EMAIL`: Sender address, e.g. `"Heaven's Door <no-reply@example.com>"`
- `ADMIN_EMAIL`: Where admin notifications are sent
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: SMTP credentials for email

Email features require valid SMTP settings.