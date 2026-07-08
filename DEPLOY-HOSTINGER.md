# Hostinger Deployment Guide - PAFR System

## Prerequisites
- Hostinger Business plan (or higher) with Node.js support
- A domain pointed to Hostinger
- MySQL database created in Hostinger hPanel

## Step 1: Prepare Your Code

The code is already configured for Hostinger deployment. The build process:
1. Builds the React client (`client/dist`)
2. Installs server dependencies
3. Server serves both API and static client files from a single Node.js process

## Step 2: Create MySQL Database in Hostinger

1. Log in to Hostinger hPanel
2. Go to **Databases → MySQL Databases**
3. Create a new database, user, and password
4. Note down: database name, username, password, host (usually `localhost`)

## Step 3: Import Your Database

1. In hPanel, go to **Databases → phpMyAdmin**
2. Select your new database
3. Import your existing PAFR database SQL dump

## Step 4: Deploy via Hostinger Node.js

### Option A: GitHub Deployment (Recommended)
1. Push your code to a GitHub repository
2. In hPanel, go to **Hosting → Node.js**
3. Create a new Node.js application:
   - **Application root**: `/public_html` (or your domain's root)
   - **Application URL**: your domain
   - **Application startup file**: `server/server.js`
   - **Node.js version**: 18.x or higher
4. Connect your GitHub repository
5. Set the build command: `npm run hostinger:build`
6. Set the start command: `npm run hostinger:start`

### Option B: Manual ZIP Upload
1. Run `npm run hostinger:build` locally
2. Zip the entire project (including `client/dist` and `server/node_modules`)
3. Upload via hPanel **File Manager** or **Git**
4. Extract in your domain's root directory

## Step 5: Configure Environment Variables

In hPanel → Node.js → Environment Variables, set:

| Variable | Value |
|----------|-------|
| `PORT` | `5000` |
| `DB_HOST` | `localhost` (or Hostinger's MySQL host) |
| `DB_USER` | your MySQL username |
| `DB_PASSWORD` | your MySQL password |
| `DB_NAME` | your MySQL database name |
| `DB_PORT` | `3306` |
| `JWT_SECRET` | generate a random string |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `NODE_ENV` | `production` |

## Step 6: Configure Domain & SSL

1. In hPanel, go to **Domains → DNS/Nameservers** — ensure your domain points to Hostinger
2. Go to **SSL → Install SSL** — enable free Let's Encrypt SSL
3. Force HTTPS in **SSL → Force HTTPS**

## Step 7: Test

1. Visit `https://yourdomain.com/api/health` — should return JSON with `status: "OK"` and `db: "connected"`
2. Visit `https://yourdomain.com` — should load the React frontend
3. Test login and key features

## Troubleshooting

- **Build fails**: Check Node.js version (must be ≥18). Check build logs in hPanel.
- **Database connection failed**: Verify DB credentials. Hostinger MySQL host may not be `localhost` — check hPanel for the correct host.
- **CORS errors**: Add your domain to `CORS_ORIGINS` env var.
- **404 on page refresh**: The SPA fallback in `server.js` handles this — ensure `client/dist` was built successfully.
- **Port issues**: Hostinger manages the port via `PORT` env var. Don't hardcode it.

## Architecture

```
Client Browser
    │
    ▼
Hostinger Node.js App (single process)
    ├── Express API routes (/api/*)
    ├── Static file serving (client/dist)
    └── SPA fallback (index.html)
    │
    ▼
Hostinger MySQL Database
```

## Notes
- The entire app (frontend + backend) runs as a single Node.js process
- No separate frontend hosting needed — Express serves the built React files
- API uses relative paths (`/api`) so it works on any domain
- Vercel deployment still works — these changes are backward compatible
