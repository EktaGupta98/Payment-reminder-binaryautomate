# PayTrack 
### Payment Reminder System — Binary Automates 

---

## What is this?

PayTrack is a mini payment reminder system built for small businesses. It lets you:

- Create and manage invoices
- Track who owes you money and how much
- Send real payment reminder emails to clients
- See your revenue at a glance on a dashboard

---

## Features at a Glance

| Feature | What it does |
|---|---|
| 📄 Invoices | Create, edit, delete invoices with auto-generated numbers (INV-0001…) |
| 📊 Dashboard | Summary cards + monthly revenue bar chart (last 6 months) |
| 📧 Email Reminders | Send real emails via Gmail. Single or bulk (select multiple at once) |
| ⏰ Auto Overdue | Invoices past their due date are automatically marked Overdue on every page load + daily at midnight |
| 🔍 Search & Filter | Search by name, email, invoice number. Filter by status. Sort by date or amount |
| ✅ Validation | Field-level error messages, past-due warnings, duplicate client alerts |
| 📄 PDF Export | Download a professional PDF for any invoice |
| 📥 CSV Export | Export your invoice list to a spreadsheet |
| 🕐 Activity Timeline | Every invoice shows a visual history: created → reminders sent → paid |
| 📱 Responsive | Works on desktop and mobile |

---

## Tech Stack

| Part | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express |
| Database | JSON file (zero setup — auto-created on first run) |
| Email | Nodemailer with Gmail SMTP |
| Charts | Recharts |
| PDF | PDFKit |
| Validation | express-validator (backend) + custom (frontend) |
| Scheduling | node-cron (daily overdue check at midnight) |

---

## Project Structure

```
payment-reminder/
│
├── backend/
│   ├── routes/
│   │   ├── invoices.js      ← Create/read/update/delete invoices + CSV export
│   │   ├── reminders.js     ← Send single or bulk email reminders
│   │   ├── dashboard.js     ← Summary stats + chart data
│   │   └── pdf.js           ← PDF invoice generation
│   │
│   ├── data/
│   │   └── db.json          ← Auto-created on first run (your local database)
│   │
│   ├── db.js                ← Read/write helper for db.json
│   ├── emailService.js      ← Nodemailer email sender + HTML template
│   ├── server.js            ← Express app + cron job for overdue detection
│   ├── .env.example         ← Copy this to .env and fill in your details
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx        ← Stats cards + revenue chart + upcoming
    │   │   ├── Invoices.jsx         ← Invoice list + bulk select + search
    │   │   ├── InvoiceDetail.jsx    ← Invoice info + send reminder + PDF + timeline
    │   │   └── ReminderLog.jsx      ← Global log of all sent reminders
    │   │
    │   ├── api.js           ← All API calls in one place (Axios)
    │   ├── App.jsx          ← Sidebar layout + routing + overdue watcher
    │   └── index.css        ← Global styles and design tokens
    │
    ├── index.html
    ├── vite.config.js       ← Proxies /api to backend (no CORS issues in dev)
    └── package.json
```

---

## How to Run (Step by Step)

### What you need first
- **Node.js v18 or higher** — check by running `node -v` in terminal
- **A Gmail account** — to send reminder emails

---

### Step 1 — Download and open the project

If you cloned from GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/payment-reminder.git
cd payment-reminder
```

Open the folder in **VS Code**.

---

### Step 2 — Set up the backend

Open a terminal in VS Code and run:

```bash
cd backend
npm install
```

Then create your environment file:

```bash
cp .env.example .env
```

Open the `.env` file and fill it in:

```
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_16_character_app_password
PORT=5000
```

> ⚠️ `EMAIL_PASS` is NOT your Gmail login password. It is a special "App Password".
> See the section below on how to get it.

Now start the backend:

```bash
npm run dev
```

You should see:
```
[PayTrack] Server running on http://localhost:5000
[Cron] Marked X invoice(s) as overdue    ← only if you have past-due invoices
```

---

### Step 3 — Set up the frontend

Open a **second terminal** in VS Code (click the + button in the terminal panel) and run:

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE ready in Xs
➜  Local: http://localhost:3000/
```

Now open your browser and go to **http://localhost:3000**

---

### How to get a Gmail App Password

You need this so PayTrack can send emails on your behalf.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** on the left
3. Make sure **2-Step Verification** is turned ON (required)
4. Search for **"App Passwords"** in the search bar at the top
5. Select app: **Mail** → Select device: **Other** → type "PayTrack"
6. Click **Generate**
7. Copy the 16-character code (looks like: `abcd efgh ijkl mnop`)
8. Paste it as `EMAIL_PASS` in your `.env` file (without spaces)

---

## Using the App

### Dashboard
When you open the app you'll see:
- 4 stat cards: Total Invoices, Unpaid Amount, Overdue, Collected
- A bar chart showing the last 6 months of collected vs outstanding money
- A red banner if any invoices are overdue (click it to jump to them)
- Upcoming invoices due in the next 7 days
- Recent reminder activity

### Creating an Invoice
1. Click **New Invoice** (top right of any page)
2. Fill in the client's name, email, amount, and due date
3. The form shows errors immediately if something is wrong
4. If the due date is in the past, you'll see a warning — the invoice will be marked Overdue automatically
5. If this client already has an unpaid invoice, you'll get an alert

### Sending Reminders

**Single reminder:**
- Open any invoice → click **Send Email Reminder**
- The client receives a professional HTML email
- The reminder is logged with a timestamp in the Activity Timeline

**Bulk reminders:**
- On the Invoices page, check the boxes next to multiple invoices
- A floating bar appears at the bottom with a "Send N Reminders" button
- All selected clients get emailed. Result shows: Sent / Failed / Skipped

### Downloading a PDF
- Open any invoice → click **Download PDF**
- A professional PDF opens in a new tab with all invoice details

### Exporting to CSV
- On the Invoices page → click **↓ CSV** (top right)
- Downloads all currently filtered invoices as a spreadsheet

### Invoice Statuses
| Status | Meaning |
|---|---|
| `pending` | Invoice created, not yet due |
| `overdue` | Past due date, not paid |
| `reminder_sent` | A reminder email was sent |
| `paid` | Marked as paid manually |

You can change the status by clicking the dropdown next to any invoice, or using the buttons on the invoice detail page.

---

## API Reference

### Invoices
```
GET    /api/invoices                    → List all (use ?search= &status= &sortBy=)
GET    /api/invoices/:id                → Get one invoice
POST   /api/invoices                    → Create invoice (validates all fields)
PATCH  /api/invoices/:id                → Update invoice
DELETE /api/invoices/:id                → Delete invoice + its reminders
GET    /api/invoices/export/csv         → Download CSV (use ?status= to filter)
```

### Reminders
```
POST   /api/reminders/send              → Send one reminder  { invoiceId, businessName }
POST   /api/reminders/bulk              → Send many          { invoiceIds: [...], businessName }
GET    /api/reminders                   → All reminders (global log)
GET    /api/reminders/invoice/:id       → Reminders for one invoice
```

### Dashboard
```
GET    /api/dashboard                   → Summary stats + upcoming + recent reminders
GET    /api/dashboard/chart             → Last 6 months paid vs unpaid (for chart)
```

### PDF
```
GET    /api/pdf/:invoiceId              → Streams a PDF file for that invoice
```

### Health
```
GET    /api/health                      → Returns OK + runs overdue check
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EMAIL_USER` | Yes | Your Gmail address |
| `EMAIL_PASS` | Yes | Gmail App Password (16 characters) |
| `PORT` | No | Backend port (default: 5000) |

---

## Design Decisions (for reviewers)

**Why JSON file instead of a real database?**
Zero setup for the reviewer — no installing Postgres, no migrations, no config. The `db.json` file is created automatically on first run. The database layer is isolated in `db.js`, so swapping to SQLite or Postgres later is a one-file change.

**Why Vite instead of Create React App?**
Vite is the modern standard — 10-20x faster dev server, native ESM, smaller builds. The proxy config in `vite.config.js` routes `/api` to the backend, eliminating CORS during development.

**Why auto-overdue on every page load?**
Invoices don't get stale because the user can come back after days away. The `GET /api/health` endpoint runs a lightweight in-memory check on every route change (no extra DB write unless something actually changed). The `node-cron` job covers the overnight case.

**Why bulk send with a 300ms delay between emails?**
Gmail's SMTP has rate limits. Sending 20 emails simultaneously can trigger a block. The delay keeps delivery reliable without needing a queue.

**Why field-level validation on both frontend and backend?**
Frontend validation gives instant feedback (no waiting for a network round-trip). Backend validation via `express-validator` protects the API from bad data even if someone calls it directly (e.g. via curl or Postman). Both layers are needed.

**Why a timeline instead of a table for reminder history?**
The invoice detail page tells a story: created, reminded, paid. A timeline makes that story visual and scannable. A table of timestamps is data — a timeline is understanding.

---


## Common Problems

**"Cannot connect to backend" / API errors**
- Make sure the backend is running on port 5000
- Run `cd backend && npm run dev` in a separate terminal

**Email not sending**
- Double-check `EMAIL_USER` and `EMAIL_PASS` in your `.env`
- Make sure you used the App Password, not your Gmail login password
- Make sure 2-Step Verification is enabled on your Google account

**`node -v` shows version below 18**
- Download the latest Node.js from [nodejs.org](https://nodejs.org) (choose LTS)

**Port already in use**
- Change `PORT=5001` in `.env` and update the proxy in `frontend/vite.config.js` to match
