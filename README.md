# CaféFlow PS62 — Cafeteria Pre-Order & Crowd Management System

> **"Your Food. Your Time. Your Way."**  
> A full-stack cafeteria pre-ordering and time-slotted pickup platform engineered to eliminate lunch rush queues, prevent food overselling through atomic stock deductions, and provide kitchen staff with real-time operational telemetry.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons, Recharts, Axios, React Router v6
- **Backend**: Node.js, Express.js, Mongoose, JWT (JSON Web Tokens), bcryptjs, CORS
- **Database**: MongoDB Atlas (Cloud) / Standalone MongoDB / `mongodb-memory-server` (automatic fallback)
- **Deployment Targets**:
  - **Frontend**: [Vercel](https://vercel.com)
  - **Backend**: [Render](https://render.com)
  - **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)

---

## 🚀 Step-by-Step Production Deployment Guide

### STEP 1: Set Up MongoDB Atlas Database

1. **Create an Account / Log In**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create or log in to your account.
2. **Create a Database Cluster**:
   - Click **"Create Deployment"** and select the free **M0 Shared Cluster**.
   - Choose a cloud provider and region closest to your users (e.g. AWS / Mumbai `ap-south-1` or Singapore `ap-southeast-1`).
3. **Configure Database User Credentials**:
   - Navigate to **Security ➔ Database Access**.
   - Click **"Add New Database User"**.
   - Select **Password Authentication**.
   - Choose a username (e.g. `cafeflow_admin`) and a secure password.
   - Assign the **"Read and write to any database"** built-in role.
   - Click **"Add User"**.
4. **Configure Network IP Access**:
   - Navigate to **Security ➔ Network Access**.
   - Click **"Add IP Address"**.
   - Click **"Allow Access from Anywhere"** (`0.0.0.0/0`) so that Render can connect to your database.
   - Click **"Confirm"**.
5. **Copy the Connection String (`MONGODB_URI`)**:
   - Navigate to **Database ➔ Clusters ➔ Connect**.
   - Choose **"Drivers"** (Node.js).
   - Copy the connection URI:
     ```
     mongodb+srv://<db_username>:<db_password>@cluster0.xxxx.mongodb.net/cafeflow?retryWrites=true&w=majority
     ```
   - Replace `<db_username>` and `<db_password>` with your database user credentials.

---

### STEP 2: Deploy Backend to Render

1. **Push Repository to GitHub**:
   - Ensure your repository is pushed to your GitHub account:
     ```bash
     git add .
     git commit -m "Prepare production deployment"
     git push origin main
     ```
2. **Create Web Service on Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com).
   - Click **"New +" ➔ "Web Service"**.
   - Connect your GitHub repository (`cafeteria_preorder_system`).
3. **Configure Build & Start Settings**:
   - **Name**: `cafeflow-backend` (or your preferred name)
   - **Region**: Choose the region closest to your MongoDB Atlas cluster (e.g., Singapore / Frankfurt / Oregon).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. **Add Environment Variables**:
   Under **"Environment Variables"**, add the following keys:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production optimizations and error handling |
   | `PORT` | `10000` (or leave default) | Render sets port automatically |
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.../cafeflow` | Your MongoDB Atlas connection URI from Step 1 |
   | `JWT_SECRET` | *(64-character random secure key)* | Secret for signing and verifying customer/staff JWTs |
   | `CLIENT_URL` | `https://your-cafeflow.vercel.app` | Deployed Vercel frontend URL (can update after Step 3) |

5. **Deploy Service**:
   - Click **"Create Web Service"**.
   - Wait for the build and deployment logs to finish.
   - Verify health: Visit `https://your-cafeflow-backend.onrender.com/api/health`. You will see `{"status":"ok","database":"connected"}`.
   - **Copy your Render backend URL**: e.g., `https://cafeflow-backend.onrender.com`.

---

### STEP 3: Deploy Frontend to Vercel

1. **Log in to Vercel**:
   - Visit [Vercel](https://vercel.com) and sign in with your GitHub account.
2. **Import Repository**:
   - Click **"Add New..." ➔ "Project"**.
   - Select your `cafeteria_preorder_system` GitHub repository.
3. **Configure Project Settings**:
   - **Project Name**: `cafeflow`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `client`
   - **Build Command**: `npm run build` (detected automatically)
   - **Output Directory**: `dist` (detected automatically)
   - **Install Command**: `npm install` (detected automatically)
4. **Set Environment Variable**:
   Under **"Environment Variables"**, add:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://your-cafeflow-backend.onrender.com/api` | Your Render backend API endpoint from Step 2 |

5. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will install dependencies, run `vite build`, and publish your production deployment.
   - The included `client/vercel.json` automatically configures SPA routing rewrites so direct navigation and refreshes on routes like `/my-orders` and `/staff` work cleanly without 404s.

6. **Update Render `CLIENT_URL`**:
   - Copy your Vercel deployment URL (e.g. `https://cafeflow-ps62.vercel.app`).
   - Go back to Render ➔ `cafeflow-backend` ➔ **Environment**.
   - Update `CLIENT_URL` to:
     ```
     https://cafeflow-ps62.vercel.app,http://localhost:5173
     ```
   - Render will automatically trigger a redeploy with the updated CORS policy.

---

## 🔑 Default Accounts (Auto-Seeded on First Run)

The server automatically detects an empty database and seeds the menu items, pickup slots, and initial accounts:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Demo Customer** | `customer@cafeflow.com` | `Customer@123` | Pre-ordering, private cart, time-slot reservation, order tracking |
| **Cafeteria Staff** | `staff@cafeflow.com` | `Staff@123` | Kitchen Queue, Orders Board, Live Stock Controls, Slot Management, Analytics |
| **Any New Customer** | Any valid email | Any password (≥6 chars) | Self-registration via UI; completely isolated account data |

---

## 💻 Local Development Setup

To run CaféFlow locally on your development machine:

1. **Clone repository**:
   ```bash
   git clone https://github.com/your-username/cafeteria_preorder_system.git
   cd cafeteria_preorder_system
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Start local servers**:
   ```bash
   # Terminal 1: Backend Server (Port 5000)
   cd server
   npm run dev

   # Terminal 2: Frontend Client (Port 5173)
   cd client
   npm run dev
   ```

4. **Open in browser**:
   - Client: [http://localhost:5173](http://localhost:5173)
   - Backend Healthcheck: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Verification & Testing Commands

Run automated verification suites from the `server/` directory:

```bash
# 1. Verify dynamic customer account data isolation & zero IDOR/BOLA
node test_dynamic_isolation.js

# 2. Verify all API endpoints, overselling prevention, and innovations
node test_e2e_api.js

# 3. Verify security, malformed email rejections, and RBAC boundaries
node test_security_isolation.js
```

To build and validate the frontend production bundle:
```bash
cd client
npm run build
```
