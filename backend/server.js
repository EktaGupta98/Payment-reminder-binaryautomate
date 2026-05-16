require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { readDB, writeDB } = require("./db");

const invoiceRoutes = require("./routes/invoices");
const reminderRoutes = require("./routes/reminders");
const dashboardRoutes = require("./routes/dashboard");
const pdfRoutes = require("./routes/pdf");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Auto Overdue Detection ───────────────────────────────────────────────────
function markOverdueInvoices() {
  const db = readDB();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;

  db.invoices.forEach((inv) => {
    if (inv.status !== "paid" && inv.status !== "overdue") {
      if (new Date(inv.dueDate) < today) {
        inv.status = "overdue";
        inv.updatedAt = new Date().toISOString();
        count++;
      }
    }
  });

  if (count > 0) {
    writeDB(db);
    console.log(`[Cron] Marked ${count} invoice(s) as overdue`);
  }
  return count;
}

// Run once on server startup
markOverdueInvoices();

// Schedule to run every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("[Cron] Running daily overdue check...");
  markOverdueInvoices();
});

app.locals.markOverdueInvoices = markOverdueInvoices;

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/pdf", pdfRoutes);

// Called on every frontend page load to keep overdue status fresh
app.get("/api/health", (req, res) => {
  const overdueMarked = markOverdueInvoices();
  res.json({ status: "ok", overdueMarked });
});

app.get("/", (req, res) => {
  res.json({ message: "PayTrack API is running" });
});

app.listen(PORT, () => {
  console.log(`[PayTrack] Server running on http://localhost:${PORT}`);
});
