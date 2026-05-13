# BESCOM Transfer System — Azure Deployment Guide
## Free Tier: Two App Services (Code deploy) + MongoDB Atlas Free Tier

---

## Architecture Overview

```
[Browser]
    │
    ├──► Azure App Service (Frontend) — React build served by Node static server
    │       URL: https://bescom-transfer-ui.azurewebsites.net
    │
    └──► Azure App Service (Backend) — Node.js/Express API
            URL: https://bescom-transfer-api.azurewebsites.net
                    │
                    └──► MongoDB Atlas (Free M0 cluster)
```

## Free Tier Limits (Azure F1 plan)
- 1 GB RAM, shared CPU
- 60 CPU minutes/day
- 1 GB storage
- Custom domain: not available on Free tier (use .azurewebsites.net)
- SSL: included free

---

## STEP 0 — Prerequisites

Install these tools on your machine:

```bash
# 1. Azure CLI
# Windows: https://aka.ms/installazurecliwindows
# macOS:
brew install azure-cli
# Ubuntu:
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Verify
az --version

# 3. Login to Azure
az login
# A browser window opens — sign in with your Azure account

# 4. Set your subscription (if you have multiple)
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

---

## STEP 1 — MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com and sign in (or create free account)
2. Create a new **Free M0 cluster** (512 MB storage, shared)
3. Under **Database Access** → Add Database User:
   - Username: `bescom_admin`
   - Password: generate a strong password, save it
   - Role: `Atlas admin`
4. Under **Network Access** → Add IP Address:
   - Click **Allow Access from Anywhere** (0.0.0.0/0) — required for Azure App Service
5. Under **Clusters** → Connect → **Drivers**:
   - Copy your connection string:
   ```
   mongodb+srv://bescom_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password and add the DB name:
   ```
   mongodb+srv://bescom_admin:YOURPASS@cluster0.xxxxx.mongodb.net/bescom_transfer?retryWrites=true&w=majority
   ```
   Save this — you'll need it in Step 3.

---

## STEP 2 — Create Azure Resource Group and App Service Plans

```bash
# Create a Resource Group (use a region close to India — eastasia or southeastasia)
az group create \
  --name bescom-transfer-rg \
  --location eastasia

# Create FREE App Service Plan for Backend (Linux, F1 free tier)
az appservice plan create \
  --name bescom-backend-plan \
  --resource-group bescom-transfer-rg \
  --sku F1 \
  --is-linux

# Create FREE App Service Plan for Frontend (Linux, F1 free tier)
az appservice plan create \
  --name bescom-frontend-plan \
  --resource-group bescom-transfer-rg \
  --sku F1 \
  --is-linux
```

---

## STEP 3 — Deploy the Backend (Node.js API)

### 3a. Create the Backend Web App

```bash
az webapp create \
  --resource-group bescom-transfer-rg \
  --plan bescom-backend-plan \
  --name bescom-transfer-api \
  --runtime "NODE:18-lts"
```

> Note the URL: `https://bescom-transfer-api.azurewebsites.net`

### 3b. Configure Backend Environment Variables

```bash
# Set all required environment variables (replace values in CAPS)
az webapp config appsettings set \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api \
  --settings \
    MONGODB_URI="mongodb+srv://bescom_admin:YOURPASS@cluster0.xxxxx.mongodb.net/bescom_transfer?retryWrites=true&w=majority" \
    JWT_SECRET="GENERATE_A_LONG_RANDOM_STRING_MINIMUM_32_CHARS_eg_abc123xyz789def456uvw012" \
    JWT_EXPIRES_IN="7d" \
    ALLOWED_ORIGINS="https://bescom-transfer-ui.azurewebsites.net" \
    NODE_ENV="production" \
    PORT="8080"
```

> **Generate JWT_SECRET**: Run this locally and copy the output:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### 3c. Configure Startup Command

```bash
az webapp config set \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api \
  --startup-file "node src/server.js"
```

### 3d. Deploy Backend Code using ZIP deploy

```bash
# From your machine, inside the project root:
cd bescom-transfer/backend

# Install production dependencies
npm install --production

# Create ZIP of backend (exclude node_modules — Azure installs them)
# On Windows (PowerShell):
Compress-Archive -Path src, package.json, package-lock.json -DestinationPath backend.zip -Force

# On macOS/Linux:
zip -r backend.zip src/ package.json package-lock.json

# Deploy ZIP to Azure
az webapp deployment source config-zip \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api \
  --src backend.zip
```

### 3e. Verify Backend is Running

```bash
# Check logs
az webapp log tail \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api

# Test health endpoint
curl https://bescom-transfer-api.azurewebsites.net/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## STEP 4 — Deploy the Frontend (React)

The React app is built locally and served via a small Express static server on Azure.

### 4a. Create a simple static server for the React build

Create this file at `frontend/server.js`:

```javascript
// frontend/server.js — serves React build on Azure
const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'build')));

// All routes serve index.html (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend server on port ${PORT}`));
```

Create `frontend/package-server.json` for the static server:

```json
{
  "name": "bescom-frontend-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.18.2" }
}
```

### 4b. Build the React app locally

```bash
cd bescom-transfer/frontend

# Set the production API URL before building
# Edit .env.production — replace with your actual backend URL:
echo "REACT_APP_API_URL=https://bescom-transfer-api.azurewebsites.net/api" > .env.production

# Install and build
npm install
npm run build
```

### 4c. Create the Frontend Web App on Azure

```bash
az webapp create \
  --resource-group bescom-transfer-rg \
  --plan bescom-frontend-plan \
  --name bescom-transfer-ui \
  --runtime "NODE:18-lts"
```

### 4d. Configure Frontend Startup

```bash
az webapp config set \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-ui \
  --startup-file "node server.js"
```

### 4e. Deploy Frontend using ZIP deploy

```bash
cd bescom-transfer/frontend

# Install static server dependencies
npm install express --prefix ./server-deps

# On macOS/Linux — zip build output + server:
zip -r frontend.zip build/ server.js server-deps/node_modules/

# On Windows (PowerShell):
Compress-Archive -Path build, server.js -DestinationPath frontend.zip -Force

# Deploy
az webapp deployment source config-zip \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-ui \
  --src frontend.zip
```

> **Simpler alternative**: Use the package.json approach below

### 4f. Simpler Frontend Deployment (Recommended)

Instead of zipping node_modules, let Azure install express:

```bash
# Create a minimal package.json for the deployed frontend
cat > bescom-transfer/frontend/package-deploy.json << 'EOF'
{
  "name": "bescom-frontend",
  "version": "1.0.0",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.18.2" }
}
EOF

# Zip only the essentials
cd bescom-transfer/frontend
zip -r frontend.zip build/ server.js package-deploy.json

# Rename inside zip to package.json (Azure looks for package.json)
# Or simply name it package.json directly:
cp package-deploy.json package.json
zip -r frontend.zip build/ server.js package.json

az webapp deployment source config-zip \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-ui \
  --src frontend.zip
```

---

## STEP 5 — Verify Full Deployment

```bash
# 1. Check backend health
curl https://bescom-transfer-api.azurewebsites.net/api/health

# 2. Open frontend in browser
# https://bescom-transfer-ui.azurewebsites.net

# 3. Check backend logs
az webapp log tail --resource-group bescom-transfer-rg --name bescom-transfer-api

# 4. Check frontend logs
az webapp log tail --resource-group bescom-transfer-rg --name bescom-transfer-ui
```

---

## STEP 6 — Create First HR Admin User

After deployment, create the first HR Corporate user via the API:

```bash
curl -X POST https://bescom-transfer-api.azurewebsites.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "HR001",
    "name": "HR Admin",
    "email": "hr.admin@bescom.karnataka.gov.in",
    "phone": "9876543210",
    "password": "SecurePass@123",
    "joiningDate": "2010-01-01",
    "designation": "Assistant General Manager (HR)",
    "group": "C",
    "currentPosting": {
      "zone": "Corporate",
      "circle": "Head Office",
      "division": "HR Division",
      "postingSince": "2020-01-01"
    }
  }'
```

Then manually update the role in MongoDB Atlas:
1. Open Atlas → Browse Collections → bescom_transfer → users
2. Find HR001 → Edit → set `"role": "hr_corporate"` and `"isVerified": true`

Or use the Atlas Data API or MongoDB Compass to run:
```javascript
db.users.updateOne(
  { employeeId: "HR001" },
  { $set: { role: "hr_corporate", isVerified: true } }
)
```

---

## STEP 7 — Create Office Admin Users (for Vacancy Submission)

For each division/section that needs to submit vacancies, create an `office_admin` user:

```bash
# First register them normally via API, then update role in Atlas:
db.users.updateOne(
  { employeeId: "OFF001" },
  { $set: {
    role: "office_admin",
    managedUnit: {
      unitType: "section",
      zone: "Southern Zone",
      circle: "Bengaluru South Circle",
      division: "Jayanagar Division",
      subDivision: "BTM Layout Sub-division",
      section: "BTM 2nd Stage O&M"
    }
  }}
)
```

---

## STEP 8 — Enable Logging (Recommended)

```bash
# Enable application logging for both apps
az webapp log config \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api \
  --application-logging filesystem \
  --level information

az webapp log config \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-ui \
  --application-logging filesystem \
  --level information
```

---

## Redeployment (When You Update Code)

### Backend update:
```bash
cd bescom-transfer/backend
zip -r backend.zip src/ package.json package-lock.json
az webapp deployment source config-zip \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-api \
  --src backend.zip
```

### Frontend update:
```bash
cd bescom-transfer/frontend
npm run build
zip -r frontend.zip build/ server.js package.json
az webapp deployment source config-zip \
  --resource-group bescom-transfer-rg \
  --name bescom-transfer-ui \
  --src frontend.zip
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Backend 503 / App not starting | Check `az webapp log tail` — usually missing env var or DB connection |
| CORS error in browser | Ensure ALLOWED_ORIGINS in backend env exactly matches frontend URL |
| MongoDB connection failed | Check Atlas IP whitelist has 0.0.0.0/0 and connection string is correct |
| React app shows blank page | Check browser console — likely REACT_APP_API_URL wrong in build |
| Free tier cold start (slow first load) | F1 plan sleeps after 20 mins inactivity — normal, first request is slow |
| 60 CPU minutes/day limit hit | Upgrade to B1 Basic (~$13/month) or schedule light usage |

---

## Environment Variable Summary

### Backend App Settings (set via Azure Portal or CLI)
| Key | Value |
|---|---|
| MONGODB_URI | Your Atlas connection string |
| JWT_SECRET | Random 48+ char string |
| JWT_EXPIRES_IN | 7d |
| ALLOWED_ORIGINS | https://bescom-transfer-ui.azurewebsites.net |
| NODE_ENV | production |
| PORT | 8080 |

### Frontend Build Variables (.env.production before `npm run build`)
| Key | Value |
|---|---|
| REACT_APP_API_URL | https://bescom-transfer-api.azurewebsites.net/api |

---

## Cost Summary (Free Tier)

| Resource | Plan | Cost |
|---|---|---|
| Backend App Service | F1 Free | $0/month |
| Frontend App Service | F1 Free | $0/month |
| MongoDB Atlas | M0 Free | $0/month |
| **Total** | | **$0/month** |

> When your usage grows beyond free limits, upgrade backend to B1 ($13/month) — it removes the 60 CPU min/day cap and sleep behaviour.

