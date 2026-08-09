# Standalone WMS Separation & Deployment Plan

This plan details the final steps to deploy and run the Standalone WMS Express backend (hosted on **Render**) and React/Vite frontend (hosted on **Vercel**), connected to your **Supabase** PostgreSQL database.

---

## 1. Database Initialization (Supabase)

We use PostgreSQL schemas (`jalna`, `rajasthan`, `haryana`, `mp`) to store separate, isolated tables for each warehouse under your single Supabase project `pxozgaccicuobirvbdnf`.

### Step A: Enable Schemas in Supabase SQL Editor
1. Open the [Supabase Dashboard](https://supabase.com) for project `pxozgaccicuobirvbdnf`.
2. Go to the **SQL Editor** tab from the left sidebar.
3. Click **New Query** and execute the following SQL to register the schemas:
   ```sql
   CREATE SCHEMA IF NOT EXISTS jalna;
   CREATE SCHEMA IF NOT EXISTS rajasthan;
   CREATE SCHEMA IF NOT EXISTS haryana;
   CREATE SCHEMA IF NOT EXISTS mp;
   ```

### Step B: Configure Your Connection Password
Open the [backend/.env](file:///c:/claro-warehouse/backend/.env) file and replace `YOUR_PASSWORD` with your actual Supabase database password.

### Step C: Push Tables to All Schemas
Prisma pushes schemas to the database schema defined in the query parameter of the connection string. Run these commands from the `backend/` folder to create the database tables in all 4 schemas:

```bash
# In your shell/terminal inside the `backend` folder:

# 1. Jalna schema
cross-env DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pxozgaccicuobirvbdnf.supabase.co:6543/postgres?schema=jalna" npx prisma db push

# 2. Rajasthan schema
cross-env DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pxozgaccicuobirvbdnf.supabase.co:6543/postgres?schema=rajasthan" npx prisma db push

# 3. Haryana schema
cross-env DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pxozgaccicuobirvbdnf.supabase.co:6543/postgres?schema=haryana" npx prisma db push

# 4. MP schema
cross-env DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pxozgaccicuobirvbdnf.supabase.co:6543/postgres?schema=mp" npx prisma db push
```

### Step D: Run Seeder Script
Run the automated TypeScript seeder to populate catalog items (Tiers A-E, Manufacturers, default Users, Engineers, and Farmers) in all 4 schemas:
```bash
# In the `backend` folder:
npx ts-node --esm prisma/seed.ts
```

---

## 2. Standalone Cloud Deployment

### A. Backend Express API (Render)
1. Set up a new **Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Configure the build parameters:
   * **Root Directory:** `backend`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
4. Set the Environment Variables:
   * `DATABASE_URL`: `postgresql://postgres:YOUR_PASSWORD@db.pxozgaccicuobirvbdnf.supabase.co:6543/postgres?schema=jalna`
   * `PORT`: `5000`

### B. Frontend React Dashboard (Vercel)
1. Deploy the `frontend/` folder to [Vercel](https://vercel.com).
2. Set the Environment Variables:
   * `VITE_API_URL`: Set this to your live Render backend API URL (e.g. `https://claro-wms-api.onrender.com/api/v1`)
3. Add a `vercel.json` in the `frontend` folder to handle routing rewrites:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## 3. How to Run Locally

### 1. Run the Express Backend
In the `backend` directory, run:
```bash
npm run dev
```
*(Server listens on `http://localhost:5000`)*

### 2. Run the Vite Frontend
In the `frontend` directory, run:
```bash
npm run dev
```
*(Dashboard runs on `http://localhost:3000`)*
