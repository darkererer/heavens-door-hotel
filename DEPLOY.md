# Deploy and Set a Custom Domain

This project is an Express server that serves your static site and handles email via SMTP.

## 1) Prepare the repository

```bash
# Initialize Git if you haven’t
git init

# Add everything and commit
git add .
git commit -m "Initial deploy"

# Create a new GitHub repo and push (replace URL)
git branch -M main
git remote add origin https://github.com/<your-username>/hotel-website.git
git push -u origin main
```

## 2) Deploy to Render (free)

1. Go to https://render.com, create an account.
2. New > Web Service > Connect your GitHub repo.
3. Settings:
   - Root: `.`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - Runtime: Node 18+
4. Add Environment Variables (from `.env.example`):
   - `PORT` = `3000` (Render sets `PORT`, you may leave it unset)
   - `HOTEL_NAME`, `FROM_EMAIL`, `ADMIN_EMAIL`
   - `SMTP_*` variables for your email provider.
5. Click Deploy. After a minute, you’ll get a public `onrender.com` URL.

## 3) Add a custom domain

1. In your Render service, go to Settings > Custom Domains > Add Domain.
2. Enter your domain, e.g. `www.yourdomain.com`.
3. Render shows DNS targets. At your domain registrar (Namecheap, GoDaddy, Cloudflare):
   - Create a CNAME record:
     - Name/Host: `www`
     - Value/Target: `your-service.onrender.com`
     - TTL: Auto
4. (Optional) Apex/root domain (yourdomain.com):
   - If registrar supports ALIAS/ANAME: point `@` to `your-service.onrender.com`.
   - If not: create an A record to Render’s IP shown in the dashboard (or use a redirect to `www`).
5. Wait for DNS to propagate (5–30 minutes). Render will issue HTTPS automatically.

## 4) Test

- Open `https://www.yourdomain.com`.
- Hit `https://www.yourdomain.com/health` for a quick check.

## Alternatives

- Railway.app or Fly.io: similar setup; use `npm start` and the same env vars.
- Static hosting (Netlify/Vercel) + separate email API: If you only need the static site, deploy pages statically and move email endpoints to serverless functions.
