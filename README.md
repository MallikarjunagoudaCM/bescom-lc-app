# BESCOM Line Clear Procedure System

Full-stack app: React + Node.js + MongoDB + Cloudinary + JWT Auth

## Services Required

| Service | Purpose | Cost |
|---|---|---|
| MongoDB Atlas | Database | Free tier |
| Cloudinary | Photo uploads | Free tier |
| Gmail SMTP | Email notifications | Free |
| Twilio / MSG91 | SMS alerts (optional) | Pay-per-use |

## Project Structure

```
bescom-lc/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite app
└── README.md
```

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env      # fill in your secrets
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3. Seed admin user
```bash
cd backend
npm run seed
```

## Mobile Deployment (Android APK)

Convert the web app to an Android .apk using Capacitor for hybrid mobile deployment. This wraps your React app in a native Android container.

### Prerequisites
- Node.js 22+ and npm installed
- Android Studio installed (for building APK)
- Java JDK 11+ installed
- `JAVA_HOME` set to your JDK installation path
- Backend hosted online (e.g., Heroku, AWS) - update `VITE_API_URL` in frontend `.env` to the hosted URL
- Android device or emulator for testing

> Note: Capacitor 8 requires Node.js 22 or higher. If you are on Node 20, upgrade your Node version before running `npx cap sync android`.

### Step-by-Step Guide

1. **Install Capacitor Dependencies** (in frontend directory):
   ```bash
   cd frontend
   npm install @capacitor/core@8.3.3 @capacitor/cli@8.3.3 @capacitor/android@8.3.3
   ```

   Make sure the Capacitor package versions match (all 8.x) before syncing and building Android.

2. **Initialize Capacitor**:
   - Run: `npx cap init`
   - Enter app name: "BESCOM LC"
   - Enter app ID: "com.bescom.lc" (or your preferred package name)
   - Enter web asset directory: "dist" (Vite's build output)

3. **Add Android Platform**:
   ```bash
   npx cap add android
   ```
   This creates an `android/` folder in the frontend directory.

4. **Build the Web App**:
   ```bash
   npm run build
   ```
   This generates the production build in `dist/`.

5. **Sync with Capacitor**:
   ```bash
   npx cap sync android
   ```
   This copies the built web assets to the Android project.

> If you see `android platform has not been added yet`, run `npx cap add android` first from the `frontend/` directory.

6. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```
   Android Studio will open with the project.

   > If you see an error about Android Studio not being installed or the path being missing, set the correct path manually:
   > ```bash
   > export CAPACITOR_ANDROID_STUDIO_PATH="/path/to/android-studio/bin/studio.sh"
   > npx cap open android
   > ```
   >
   > Or open Android Studio and select `Open` > `Existing Project` > `frontend/android`.

7. **Configure and Build APK**:
   - In Android Studio, ensure the project is synced.
   - If you see duplicate Kotlin class or dependency errors, clean the project and run `npx cap sync android` again before rebuilding.
   - Use one of these options:
     - **Build > Generate App Bundles or APKs > Build APK(s)**
     - or, if that is not visible, use **Build > Assemble Module 'android.app'**
   - Wait for the build to complete; the APK will be in `android/app/build/outputs/apk/debug/`.

8. **Install and Test**:
   - Transfer the APK to an Android device.
   - Enable "Install from unknown sources" in device settings.
   - Install and launch the app.
   - Test all features, especially API calls and uploads.

### Notes
- **Backend Hosting**: Mobile apps cannot run local servers. Host your backend (e.g., on Heroku) and update `VITE_API_URL` to the production URL before building. If your backend URL is the API root, include `/api` in `VITE_API_URL`, for example `https://your-backend.example.com/api`.
- **Plugins**: If you need native features (e.g., camera), install Capacitor plugins like `@capacitor/camera` and add code to use them.
- **Debugging**: Use Android Studio's emulator or connect a device for logs.
- **Updates**: To update the app, rebuild the web app, sync, and rebuild the APK.
- **Limitations**: Hybrid apps run in a WebView; performance may differ from native apps for heavy tasks.

## GCP Deployment with MongoDB Atlas and Cloudinary

This setup uses GCP for backend hosting while keeping MongoDB Atlas and Cloudinary unchanged.

### What stays outside GCP
- MongoDB Atlas for the database
- Cloudinary for photo uploads

### What runs on GCP
- Backend API on Cloud Run (recommended)
- Optional frontend site on Firebase Hosting
- Mobile APK built locally using the hosted backend URL

### Step 1: Prepare the backend
1. Keep MongoDB Atlas and Cloudinary values in `backend/.env`.
2. Verify the backend works locally:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Confirm `src/index.js` uses `process.env.PORT || 5000`.

### Step 2: Set up GCP tools
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate and select your project:
   ```bash
   gcloud init
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Enable Cloud Run and Container Registry:
   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com
   ```

### Step 3: Deploy backend to Cloud Run
**Before deploying, ensure you have all environment variables ready.** See the "Cloud Run Environment Variables" section below for the complete list.

1. In the backend folder, build the Docker image:
   ```bash
   cd backend
   docker build -t gcr.io/YOUR_PROJECT_ID/bescom-lc-backend .
   ```
2. Push the image to Container Registry:
   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/bescom-lc-backend
   ```
3. Deploy to Cloud Run with all required environment variables:
   ```bash
   gcloud run deploy bescom-lc-backend \
     --image gcr.io/YOUR_PROJECT_ID/bescom-lc-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 512Mi \
     --set-env-vars MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/bescom-lc",CLOUDINARY_CLOUD_NAME="your_cloud_name",CLOUDINARY_API_KEY="your_api_key",CLOUDINARY_API_SECRET="your_api_secret",JWT_SECRET="your_jwt_secret",JWT_REFRESH_SECRET="your_refresh_secret",CLIENT_URL="https://your-frontend-url",NODE_ENV="production",EMAIL_USER="your_email@gmail.com",EMAIL_PASS="your_app_password"
   ```
   > **Security Note**: For production, use Cloud Run's "Set up with Secret Manager" instead of passing secrets on the command line. See the "Using Cloud Secret Manager" section below.
4. Allow unauthenticated access.
5. Copy the service URL from Cloud Run.

### Cloud Run Environment Variables

Here's a complete list of required and optional environment variables:

| Variable | Required | Example | Notes |
|---|---|---|---|
| `MONGO_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/bescom-lc` | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` | Yes | `your_cloud_name` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Yes | `your_api_key` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Yes | `your_api_secret` | From Cloudinary dashboard |
| `JWT_SECRET` | Yes | `any-random-string` | Used for access token signing |
| `JWT_REFRESH_SECRET` | Yes | `any-random-string-2` | Used for refresh token signing |
| `CLIENT_URL` | Yes | `https://your-firebase-url.web.app` | Frontend URL (for CORS) |
| `NODE_ENV` | Yes | `production` | Set to production for Cloud Run |
| `EMAIL_USER` | No | `your_email@gmail.com` | Gmail for notifications (optional) |
| `EMAIL_PASS` | No | `app_password_here` | Gmail app password (optional) |
| `TWILIO_SID` | No | `your_twilio_sid` | For SMS (optional) |
| `TWILIO_TOKEN` | No | `your_twilio_token` | For SMS (optional) |
| `TWILIO_FROM` | No | `+1234567890` | For SMS (optional) |
| `PORT` | No | `5000` | Cloud Run automatically sets this |

### Using Cloud Secret Manager (Recommended for production)

Instead of passing secrets on the command line, use Google Secret Manager:

1. Create secrets in Secret Manager:
   ```bash
   echo -n "mongodb+srv://user:pass@cluster.mongodb.net/bescom-lc" | gcloud secrets create MONGO_URI --data-file=-
   echo -n "your_cloud_name" | gcloud secrets create CLOUDINARY_CLOUD_NAME --data-file=-
   echo -n "your_api_key" | gcloud secrets create CLOUDINARY_API_KEY --data-file=-
   echo -n "your_api_secret" | gcloud secrets create CLOUDINARY_API_SECRET --data-file=-
   echo -n "your_jwt_secret" | gcloud secrets create JWT_SECRET --data-file=-
   echo -n "your_refresh_secret" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-
   ```

2. Grant Cloud Run access to secrets:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member=serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   ```

3. Deploy referencing the secrets:
   ```bash
   gcloud run deploy bescom-lc-backend \
     --image gcr.io/YOUR_PROJECT_ID/bescom-lc-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 512Mi \
     --set-secrets MONGO_URI=MONGO_URI:latest,CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest \
     --set-env-vars CLIENT_URL="https://your-firebase-url.web.app",NODE_ENV="production"
   ```


### Step 4: Point the frontend to the hosted backend
1. In `frontend/.env`, set:
   ```env
   VITE_API_URL=https://YOUR_CLOUD_RUN_URL/api
   ```
2. Rebuild the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

### Step 5: Optional web hosting with Firebase
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Set up hosting in `frontend`:
   ```bash
   cd frontend
   firebase login
   firebase init hosting
   ```
   - Choose your Firebase project
   - Set `build` as the public directory
   - Answer yes for a single-page app
3. Deploy:
   ```bash
   npm run build
   firebase deploy
   ```
4. Note the Firebase hosting URL.

> If your frontend is already deployed to Firebase, update the backend `CLIENT_URL` environment variable in Cloud Run to your Firebase URL, then redeploy or update the backend service.
> Example:
> ```bash
> gcloud run deploy bescom-lc-backend \
>   --image gcr.io/YOUR_PROJECT_ID/bescom-lc-backend \
>   --platform managed \
>   --region us-central1 \
>   --allow-unauthenticated \
>   --update-env-vars CLIENT_URL="https://project-036986f6-aa49-49f8-aec.web.app"
> ```

### Step 6: Build the Android APK with Capacitor
1. Install Capacitor and Android platform:
   ```bash
   cd frontend
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Initialize Capacitor once:
   ```bash
   npx cap init
   ```
   - App name: `BESCOM LC`
   - App ID: `com.bescom.lc`
   - Web asset directory: `dist`
3. Build the frontend again:
   ```bash
   npm run build
   ```
4. Sync to Android:
   ```bash
   npx cap sync android
   ```
5. Open Android Studio:
   ```bash
   npx cap open android
   ```
6. Build the APK:
   - Go to **Build > Build Bundle(s)/APK(s) > Build APK**
   - The APK is at `android/app/build/outputs/apk/debug/`

### Step 7: Install and test the APK
1. Transfer the APK to your Android device.
2. Enable `Install unknown apps` if required.
3. Install and launch the app.
4. Test login, API calls, uploads, and notifications.

### Important notes
- The mobile app must use the live Cloud Run backend URL in `frontend/.env`, not `localhost`.
- Firebase Hosting is optional and only needed if you want the web app online.
- Backend Dockerfile and `.dockerignore` are already included in `backend/`.
- Keep MongoDB Atlas and Cloudinary unchanged for this setup.

## Environment Variables

### Backend `.env`
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bescom-lc
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
TWILIO_SID=optional
TWILIO_TOKEN=optional
TWILIO_FROM=optional
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
```

## Default Login (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@bescom.in | Admin@1234 |
| SO/AEE | soaee@bescom.in | Pass@1234 |
| JE/Operator | je@bescom.in | Pass@1234 |
| SO/AE | soae@bescom.in | Pass@1234 |
