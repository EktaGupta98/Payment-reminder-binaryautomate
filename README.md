# PayTrack – Payment Reminder System

> Binary Automates 

A mini payment reminder system for small businesses to track who owes money, manage invoice/payment status, and send real email reminders.

---

## Features

- **Invoices** – Create, view, edit, and delete invoices with auto-generated invoice numbers
- **Status tracking** – `pending`, `overdue`, `reminder_sent`, `paid` — auto-marked overdue by due date
- **Real email reminders** – Sends actual emails via Gmail SMTP (Nodemailer) with a professional HTML template
- **Reminder activity log** – Every sent reminder is tracked with timestamp, delivery status, and invoice link
- **Search & filter** – Search by client name, email, or invoice number; filter by status; sort by date/amount
- **Dashboard** – Summary cards (total, unpaid, overdue, collected), upcoming payments, recent reminder activity
- **Responsive UI** – Works on desktop and mobile

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, React Router v6     |
| Backend  | Node.js, Express                    |
| Database | JSON file (local, zero-setup)       |
| Email    | Nodemailer + Gmail SMTP             |
| Styling  | Custom CSS (no UI library)          |

---

## Project Structure

```
payment-reminder/
├── backend/
│   ├── routes/
│   │   ├── invoices.js      # CRUD for invoices
│   │   ├── reminders.js     # Send & log reminders
│   │   └── dashboard.js     # Summary stats
│   ├── data/                # db.json auto-created here
│   ├── db.js                # JSON file DB helper
│   ├── emailService.js      # Nodemailer email sender
│   ├── server.js            # Express app entry point
│   ├── .env.example         # Environment variable template
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Invoices.jsx
    │   │   ├── InvoiceDetail.jsx
    │   │   └── ReminderLog.jsx
    │   ├── api.js            # Axios API calls
    │   ├── App.jsx           # Routing + sidebar layout
    │   └── index.css         # Design system / global styles
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup & Running

### Prerequisites
- **Node.js** v18+ (check: `node -v`)
- A Gmail account for sending emails

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/payment-reminder.git
cd payment-reminder
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
PORT=5000
```

> **Getting Gmail App Password:**
> 1. Go to your Google Account → Security → 2-Step Verification (must be enabled)
> 2. Search "App Passwords" → Generate one for "Mail"
> 3. Use the 16-character code as `EMAIL_PASS`

Start the backend:

```bash
npm run dev   # uses nodemon (auto-restart)
# or
npm start     # plain node
```

Backend runs on: `http://localhost:5000`

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

> The Vite dev server proxies `/api` requests to the backend automatically — no CORS issues.

---

## IDE Recommendation

Use **VS Code** for this project.

Recommended extensions:
- **ESLint** – `dbaeumer.vscode-eslint`
- **Prettier** – `esbenp.prettier-vscode`
- **REST Client** – `humao.rest-client` (test APIs inline)
- **Thunder Client** – lightweight Postman alternative inside VS Code

Open two terminals side-by-side:
- Terminal 1: `cd backend && npm run dev`
- Terminal 2: `cd frontend && npm run dev`

---

## API Endpoints

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all (supports `?search=&status=&sortBy=`) |
| GET | `/api/invoices/:id` | Get single invoice |
| POST | `/api/invoices` | Create invoice |
| PATCH | `/api/invoices/:id` | Update invoice |
| DELETE | `/api/invoices/:id` | Delete invoice |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reminders/send` | Send email reminder + log it |
| GET | `/api/reminders` | All reminder activity |
| GET | `/api/reminders/invoice/:id` | Reminders for one invoice |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Summary stats + upcoming + recent |

---

## Design Decisions

- **JSON file as DB** – Zero setup, no install, perfect for demo scope. Easy swap to SQLite/Postgres later.
- **Auto invoice numbering** – `INV-0001`, `INV-0002`… so users don't think about it.
- **Auto-overdue detection** – Dashboard and invoice creation auto-mark past-due invoices as `overdue`.
- **Email failure graceful handling** – If email fails (bad credentials), the reminder is still logged with error status so activity is tracked.
- **Vite proxy** – Frontend `/api` requests are proxied to backend during dev — no CORS config needed.
- **Responsive** – Sidebar collapses to top navigation on mobile.

---

## Pushing to GitHub (Step-by-step)

See the submission section below for full instructions.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EMAIL_USER` | Gmail address used to send reminders |
| `EMAIL_PASS` | Gmail App Password (not your login password) |
| `PORT` | Backend port (default: 5000) |

> `.env` is in `.gitignore` and will never be committed. Only `.env.example` is pushed.
