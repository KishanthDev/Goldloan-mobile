# 🪙 Goldora - Mobile App (Expo & React Native)

A cross-platform mobile application for tracking and managing Gold Loans, built with **Expo (React Native)** on the frontend and backed by **Google Sheets** (database) and **Google Drive** (file & photo storage) via a **Google Apps Script REST API** with multi-tier caching.

---

## 📱 Features

- **📊 Dashboard:**
  - **Live Gold Rates**: Real-time 24K, 22K, and 18K gold prices per gram for Bangalore scraped and cached.
  - **KPI Metrics**: Active Loan Portfolio, Pledged Gold Grams, Available Bank Limits, and Total Vault Value.
  - **Recent Repayments**: Quick transaction timeline.
- **👥 Customers:**
  - Customer directory with search by name, code, mobile, or city.
  - Profile view with linked bank accounts, active loans, and pledged ornaments.
  - Register new borrowers with KYC info (Aadhaar, PAN).
- **💎 Gold Vault (Ornaments):**
  - Gross, Stone, and Net Gold Weight tracking.
  - Auto-calculating valuation based on purity (24K, 22K, 18K) and live gold rates.
  - Real-time appreciation gains tracking (`Market Value` vs. `Buying Cost`).
  - Hallmark number tracking and vault locker remarks.
- **💰 Loans (Origination & Servicing):**
  - Loan origination wizard: Select Borrower ➔ Choose Bank Account ➔ Select Available Ornaments to Pledge.
  - Available credit limit validation per bank account.
  - Automatic deduction of processing fees (0.5%), documentation charges, and insurance.
  - Record payments / EMI repayments (Interest, Principal, Part Payment) with UPI/NetBanking reference.
- **🔒 Loan Closure & Ornament Release:**
  - Settle loans, record closure remarks, and automatically return pledged ornaments to available status.
- **⚡ Multi-Tier Caching:**
  - Level 1: In-memory cache for instant 0 ms tab switching.
  - Level 2: `AsyncStorage` persistent disk cache for full offline availability.
  - Level 3: Google Apps Script `CacheService` server caching for fast API responses (< 150ms).
- **🛠️ Built-in Demo Mode:**
  - The app launches in **Demo / Mock Mode** out-of-the-box so you can explore and test all screens immediately before connecting Google Sheets!

---

## 🚀 Quick Start (Running on Mobile / Web)

### 1. Start the Expo Development Server
```powershell
npx expo start
```

### 2. View on Your Phone (Zero Deployment Needed!)
1. Install **Expo Go** from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) or [App Store](https://apps.apple.com/app/expo-go/id982107779).
2. Open Expo Go and enter your local network address:
   ```text
   exp://192.168.1.4:8081
   ```
   *(Or scan the QR code displayed in your terminal).*
3. **If testing on 4G/5G mobile data:**
   ```powershell
   npx expo start --tunnel
   ```

### 3. View on Web Browser
Open your browser at:
```text
http://localhost:8081
```

---

## ☁️ Connecting Your Google Sheet & Drive Backend

The complete backend code is located in [`backend/Code.gs`](./backend/Code.gs).

### Step 1: Create Google Sheet & Script
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet (e.g. named `Gold Loan Database`).
2. In the top menu, click **Extensions ➔ Apps Script**.
3. Replace any starter code in the script editor with the contents of [`backend/Code.gs`](./backend/Code.gs).

### Step 2: Initialize Database Tables
1. At the top of the Apps Script editor, select the function **`setupSheets`** from the function dropdown.
2. Click **Run**.
3. Grant the required permissions when prompted.
4. Check your Google Sheet: All required tabs (`Admins`, `Users`, `BankAccounts`, `Ornaments`, `Loans`, `LoanOrnaments`, `Payments`, `Releases`) will be created automatically with styled headers!

### Step 3: Deploy as Web App
1. In Apps Script, click the blue **Deploy** button (top-right) ➔ **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and choose **Web app**.
3. Fill in:
   - **Description**: `Gold Loan API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: **`Anyone`** *(Required for mobile app fetch without Google login)*
4. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

---

## ⚙️ Configuring Your Backend URL

You can connect your deployed Google Apps Script URL in any of these **three ways**:

### Method 1: Inside the Mobile App (Easiest!)
1. Open the app on your phone or browser.
2. Tap the **Settings** tab.
3. Paste your Web App URL in the input field and tap **Test Ping**.
4. Tap **Save URL** — the app will automatically switch from Demo Mode to **Live Sheets**!

### Method 2: In `.env` File
Create a `.env` file in the root folder (copy from `.env.example`):
```env
EXPO_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Method 3: In `src/config/api.ts`
Edit [`src/config/api.ts`](./src/config/api.ts) directly:
```typescript
export const DEFAULT_GAS_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

---

## 📁 Project Structure

```text
c:\KISHAN\SOURCECODE\expo\
├── backend/
│   └── Code.gs                 # Ready-to-deploy Google Apps Script (REST API & Caching)
├── src/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # Bottom tabs navigation
│   │   │   ├── index.tsx       # Dashboard with live gold rates & KPIs
│   │   │   ├── customers.tsx   # Customer directory & search
│   │   │   ├── ornaments.tsx   # Gold vault inventory & valuation
│   │   │   ├── loans.tsx       # Active and closed loan book
│   │   │   └── settings.tsx    # API config, connection tester, cache controls
│   │   ├── customers/
│   │   │   ├── new.tsx         # Add customer modal form
│   │   │   └── [id].tsx        # Customer profile, bank accounts, and linked loans
│   │   ├── ornaments/
│   │   │   └── new.tsx         # Add gold ornament modal with live rates
│   │   ├── loans/
│   │   │   ├── new.tsx         # Originate loan wizard (customer + bank + ornaments)
│   │   │   ├── [id].tsx        # Loan details & record repayment modal
│   │   │   └── closure.tsx     # Settle loan & release ornaments
│   │   ├── _layout.tsx         # Root stack layout
│   │   └── index.tsx           # Entry redirect
│   ├── components/
│   │   ├── Badge.tsx           # Status badges (Pledged, Available, Released, Active)
│   │   ├── GoldRateTicker.tsx  # Live 24K, 22K, 18K Bangalore rates banner
│   │   ├── Header.tsx          # App header with sync indicator & demo/live tag
│   │   └── StatCard.tsx        # KPI metrics card
│   ├── config/
│   │   └── api.ts              # API URL, Spreadsheet ID, and mock mode manager
│   ├── constants/
│   │   └── theme.ts            # Gold brand colors and styling constants
│   ├── services/
│   │   ├── api.ts              # REST client for GAS with cache integration
│   │   ├── cache.ts            # Memory + AsyncStorage caching layer
│   │   └── mockData.ts         # Sample data for offline demo mode
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── .env.example                # Environment variables template
├── app.json                    # Expo project configuration
└── package.json
```

---

## 💡 Caching Behavior

- **Instant Cold Starts**: Cached data from `AsyncStorage` loads in 0 ms so screens never show blank white pages.
- **Stale-While-Revalidate**: Cached data is displayed immediately while a fresh copy is pulled from Google Sheets in the background.
- **Automatic Cache Invalidation**: When you originate a new loan, add a customer, add an ornament, or record a repayment, the corresponding cache keys are cleared immediately so updated totals appear across all screens.
- **Manual Clear**: You can reset your local cache anytime from the **Settings** tab.