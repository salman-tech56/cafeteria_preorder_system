# CaféFlow PS62 — Cafeteria Pre-Order & Crowd Management System

> **"Your Food. Your Time. Your Way."**  
> A high-performance, full-stack cafeteria pre-ordering and time-slotted pickup platform engineered to eliminate lunch rush queues, prevent food overselling through atomic MySQL transactions and row-level locks, and provide kitchen staff with real-time operational telemetry.

---

## 🏗️ Architecture & Technology Stack

### Frontend (`client/`)
- **Core**: React 18 (`react` ^18.3.1, `react-dom` ^18.3.1), Vite 5 (`vite` ^5.4.14)
- **Styling**: Tailwind CSS (`tailwindcss` ^3.4.17), Autoprefixer, PostCSS
- **State & Routing**: React Router v6 (`react-router-dom` ^6.28.2), Context API (`AuthContext`, `CartContext`)
- **HTTP Client**: Axios (`axios` ^1.7.9) with configurable base URL and JWT Bearer interceptor
- **Icons & Visualization**: Lucide React (`lucide-react` ^0.475.0), Recharts (`recharts` ^2.15.1)
- **Utilities**: `clsx`, `tailwind-merge`

### Backend (`server/`)
- **Runtime & Framework**: Node.js, Express.js (`express` ^4.21.2)
- **Database Driver & Pool**: `mysql2` (`^3.24.4`) using `mysql2/promise` with connection pooling
- **Security & Authentication**: JSON Web Tokens (`jsonwebtoken` ^9.0.2), password hashing via `bcryptjs` (`^3.0.2`)
- **CORS**: `cors` (`^2.8.5`) supporting dynamic origins, localhost, and Vercel deployments
- **Environment**: `dotenv` (`^16.4.7`)

### Database (`server/database/`)
- **Engine**: MySQL 8.0
- **Database Name**: `cafeflow`
- **Schema**: `server/database/schema.sql` (6 relational tables with foreign keys and indexes)
- **Seed Data**: `server/database/seed.sql` & `server/src/seed/seedData.js`

---

## 🗄️ Database Schema & Relational Model

The relational architecture is defined in `server/database/schema.sql`:

```
users (1) ─────────────< orders (many)
                            │
                            ├───< order_items (many) >─── (1) menu_items
                            │
                            ├───< order_status_history (many)
                            │
pickup_slots (1) ───────< orders (many)
```

### Tables

1. **`users`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `name` (VARCHAR 100)
   - `email` (VARCHAR 191 UNIQUE)
   - `password` (VARCHAR 255 - bcrypt hash)
   - `role` (ENUM: `'customer'`, `'staff'`, default `'customer'`)
   - `phone` (VARCHAR 20)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **`menu_items`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `name` (VARCHAR 150)
   - `description` (TEXT)
   - `category` (VARCHAR 50: `'Breakfast'`, `'Main Course'`, `'Quick Bites'`, `'Beverages'`, `'Combos'`)
   - `base_price` (DECIMAL 10,2)
   - `gst_rate` (DECIMAL 5,2, default 5.00%)
   - `stock` (INT, default 0, CHECK `stock >= 0`)
   - `available` (TINYINT(1), default 1)
   - `image` (VARCHAR 500)
   - `created_at`, `updated_at` (TIMESTAMP)

3. **`pickup_slots`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `slot_start` (VARCHAR 10, e.g. `'12:00'`)
   - `slot_end` (VARCHAR 10, e.g. `'12:15'`)
   - `slot_label` (VARCHAR 50, e.g. `'12:00 PM - 12:15 PM'`)
   - `capacity` (INT, default 25)
   - `booked_count` (INT, default 0)
   - `date` (DATE)
   - `available` (TINYINT(1), default 1)
   - `created_at` (TIMESTAMP)

4. **`orders`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `order_number` (VARCHAR 50 UNIQUE, e.g. `CF-260923-00123`)
   - `user_id` (INT FK ➔ `users.id` ON DELETE CASCADE)
   - `pickup_slot_id` (INT FK ➔ `pickup_slots.id` ON DELETE RESTRICT)
   - `customer_name` (VARCHAR 100)
   - `customer_email` (VARCHAR 191)
   - `customer_phone` (VARCHAR 20)
   - `slot_label` (VARCHAR 50)
   - `pickup_date` (DATE)
   - `subtotal` (DECIMAL 10,2)
   - `gst_amount` (DECIMAL 10,2)
   - `total_amount` (DECIMAL 10,2)
   - `status` (ENUM: `'Placed'`, `'Preparing'`, `'Ready'`, `'Collected'`, `'Cancelled'`)
   - `placed_at`, `preparing_at`, `ready_at`, `collected_at` (TIMESTAMP)
   - `created_at`, `updated_at` (TIMESTAMP)

5. **`order_items`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `order_id` (INT FK ➔ `orders.id` ON DELETE CASCADE)
   - `menu_item_id` (INT FK ➔ `menu_items.id` ON DELETE RESTRICT)
   - `item_name` (VARCHAR 150)
   - `quantity` (INT)
   - `unit_price` (DECIMAL 10,2)
   - `gst_rate` (DECIMAL 5,2)
   - `gst_amount` (DECIMAL 10,2)
   - `total_price` (DECIMAL 10,2)

6. **`order_status_history`**:
   - `id` (INT PK, AUTO_INCREMENT)
   - `order_id` (INT FK ➔ `orders.id` ON DELETE CASCADE)
   - `status` (VARCHAR 50)
   - `timestamp` (TIMESTAMP)
   - `note` (VARCHAR 255)
   - `updated_by` (INT NULL)
   - `updated_by_name` (VARCHAR 100)

---

## ⚡ Core Business & Concurrency Logic

1. **ACID Transaction & Stock Locking**:
   - Order placement executes inside a single MySQL transaction (`conn.beginTransaction()`).
   - Row-level lock acquired via `SELECT ... FOR UPDATE` on both the selected pickup slot and all ordered menu items.
   - Remaining stock and slot capacity are validated atomically. If any item has insufficient stock or slot is full, the entire transaction rolls back (`conn.rollback()`), guaranteeing zero negative stock and zero overselling.

2. **Strict Customer Data Isolation**:
   - Customer identity is extracted exclusively from verified JWT payload (`req.user.id`).
   - Any client-submitted `user_id`, `customer_id`, or spoofed email in request bodies is rejected or ignored.
   - Customers can only query their own orders (`/api/orders/my-orders`). Direct ID access by another customer triggers an automatic `403 Forbidden` IDOR block.

3. **Configurable GST Calculations**:
   - GST is configurable per item (`base_price * gst_rate / 100`).
   - Line totals and tax summaries are calculated and stored on the server to prevent client-side price tampering.

4. **Crowd Management & Load Indicators**:
   - Live cafeteria load indicator (`Low Load`, `Moderate Load`, `High Load`) calculated dynamically from active slot bookings.
   - Smart recommendation engine suggests the next best available alternative slot if a preferred time slot is full.

---

## 🔌 REST API Reference

### Health (`/api/health`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Ping server, uptime, MySQL database connection status | Public |

### Authentication (`/api/auth`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new customer account (email normalized to lowercase) | Public |
| `POST` | `/api/auth/login` | Authenticate customer/staff, return JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer JWT |

### Menu (`/api/menu`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | List menu items (supports query filters `category`, `search`) | Public |
| `GET` | `/api/menu/categories` | Get distinct food categories | Public |
| `GET` | `/api/menu/:id` | Get individual menu item details | Public |
| `POST` | `/api/menu` | Add new menu item | Staff Only |
| `PUT` | `/api/menu/:id` | Update menu item details, pricing, availability | Staff Only |
| `DELETE` | `/api/menu/:id` | Delete menu item | Staff Only |
| `PATCH` | `/api/menu/:id/stock` | Adjust stock count | Staff Only |

### Pickup Slots (`/api/slots`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/slots` | List pickup slots for date + load indicator & alternative slot | Public |
| `POST` | `/api/slots` | Create new pickup slot | Staff Only |
| `PUT` | `/api/slots/:id` | Update slot capacity, time, or availability | Staff Only |
| `DELETE` | `/api/slots/:id` | Delete pickup slot | Staff Only |
| `POST` | `/api/slots/generate-day` | Batch-generate 15-min slots for a given date | Staff Only |

### Orders (`/api/orders`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Place order (ACID transaction with stock & capacity row locks) | Customer |
| `GET` | `/api/orders/my-orders` | Fetch authenticated customer's isolated order history | Customer |
| `GET` | `/api/orders` | Fetch active kitchen orders queue | Staff Only |
| `GET` | `/api/orders/:id` | Get order details with timeline status history | Authenticated |
| `PATCH` | `/api/orders/:id/status` | Advance status (`Placed` ➔ `Preparing` ➔ `Ready` ➔ `Collected`) | Staff Only |
| `PUT` | `/api/orders/:id/status` | Update order status (PUT alias) | Staff Only |

### Staff Analytics (`/api/analytics`)
| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics` | Real-time business telemetry: today's revenue, GST, hourly load, popular food, low-stock restock batches | Staff Only |
| `GET` | `/api/analytics/today` | Summary metrics for current operational day | Staff Only |
| `GET` | `/api/analytics/weekly` | 7-day orders and revenue historical trends | Staff Only |

---

## 🔑 Default Accounts (Auto-Seeded)

The database automatically initializes and seeds on first startup if tables are empty:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Cafeteria Staff** | `staff@cafeflow.com` | `Staff@123` | Kitchen Queue, Order Progress, Menu CRUD, Stock Adjustments, Business Analytics |
| **Demo Customer** | `customer@cafeflow.com` | `Customer@123` | Menu Browsing, Private Cart, Slot Reservation, Isolated Order History |
| **Any New Customer** | Any valid email | Any password (≥6 chars) | Self-registration via UI; completely isolated account data |

---

## ⚙️ Environment Variables

### Backend Configuration (`server/.env`)

```env
PORT=5000
NODE_ENV=development

# MySQL Database Connection (mysql2 pool)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cafeflow
DB_USER=root
DB_PASSWORD=your_mysql_password_here

# JWT Authentication
JWT_SECRET=cafeflow_hackathon_super_secret_jwt_key_2026

# Allowed Frontend Origins for CORS (comma-separated)
CLIENT_URL=http://localhost:5173,https://your-cafeflow.vercel.app
```

### Frontend Configuration (`client/.env`)

```env
# Backend API Base URL (empty for local Vite dev proxy, or full URL in production)
VITE_API_URL=http://localhost:5000/api
```

---

## 💻 Local Setup & Execution Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL Server**: v8.0 or higher running locally (or via Docker/remote)

### 2. Database Initialization
Ensure your MySQL server is running, then run:

```bash
# Optional: manual creation via MySQL CLI
mysql -u root -p < server/database/schema.sql
mysql -u root -p < server/database/seed.sql
```
*(Note: If the `cafeflow` database does not exist, the server automatically creates the database, executes `schema.sql`, and seeds initial data on startup).*

### 3. Install Dependencies
```bash
# Root helper to install both backend and frontend dependencies
npm run install:all

# Or individually:
cd server && npm install
cd ../client && npm install
```

### 4. Configure Environment
Create `server/.env` based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```
Update `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` to match your local MySQL configuration.

### 5. Run the Application

```bash
# From project root, run both frontend and backend concurrently:
npm run dev

# Or start services in separate terminals:
# Terminal 1: Backend Server (Port 5000)
cd server
npm start

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

### 6. Access the Application
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Test Verification

Run verification suites from the `server/` directory:

```bash
cd server

# 1. Verify dynamic customer account isolation, IDOR prevention & RBAC
node test_dynamic_isolation.js

# 2. Verify all API endpoints, atomic stock deductions, and staff analytics
node test_e2e_api.js

# 3. Verify security boundaries, input validation, and email normalization
node test_security_isolation.js

# 4. Verify authentication flow and JWT validation
node test_auth.js
```

Validate production build:
```bash
cd client
npm run build
```

---

## 🚀 Production Deployment

### Database (Managed MySQL)
- Use any managed MySQL 8.0 instance (e.g. AWS RDS, DigitalOcean Managed Databases, PlanetScale, Aiven, or Railway MySQL).
- Obtain host, port, database name, username, and password.
- Run `server/database/schema.sql` (or allow `initDB()` to create tables on first run).

### Backend (Render / Railway / VPS)
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=10000` (or host-assigned port)
  - `DB_HOST=<remote-mysql-host>`
  - `DB_PORT=3306`
  - `DB_NAME=cafeflow`
  - `DB_USER=<mysql-user>`
  - `DB_PASSWORD=<mysql-password>`
  - `JWT_SECRET=<strong-random-secret-key>`
  - `CLIENT_URL=https://your-cafeflow.vercel.app`

### Frontend (Vercel)
- **Root Directory**: `client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL=https://your-backend-domain.com/api`
- The included [vercel.json](file:///c:/Users/Mohamed%20Salman/Desktop/cafeteria_preorder_system/client/vercel.json) configures SPA rewrites for direct navigation to `/my-orders` and `/staff`.
