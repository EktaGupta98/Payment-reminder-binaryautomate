const express = require("express");
const router = express.Router();
const { readDB } = require("../db");

// ─── GET dashboard summary ────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const db = readDB();
  const invoices = db.invoices;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paid = invoices.filter((i) => i.status === "paid");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const pending = invoices.filter((i) => i.status === "pending");
  const reminderSent = invoices.filter((i) => i.status === "reminder_sent");

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = paid.reduce((s, i) => s + i.amount, 0);
  const overdueAmount = overdue.reduce((s, i) => s + i.amount, 0);

  const next7 = new Date(today);
  next7.setDate(next7.getDate() + 7);
  const upcoming = invoices
    .filter((i) => i.status !== "paid" && new Date(i.dueDate) >= today && new Date(i.dueDate) <= next7)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const recentReminders = db.reminders
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 5);

  res.json({
    summary: {
      total: invoices.length,
      paid: paid.length,
      overdue: overdue.length,
      pending: pending.length,
      reminderSent: reminderSent.length,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      overdueAmount,
    },
    recentReminders,
    upcoming,
  });
});

// ─── GET chart data: last 6 months paid vs unpaid ─────────────────────────────
router.get("/chart", (req, res) => {
  const db = readDB();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);

    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });

    const monthInvoices = db.invoices.filter((inv) => {
      const created = new Date(inv.createdAt);
      return created.getFullYear() === year && created.getMonth() === month;
    });

    const paid = monthInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((s, inv) => s + inv.amount, 0);

    const unpaid = monthInvoices
      .filter((inv) => inv.status !== "paid")
      .reduce((s, inv) => s + inv.amount, 0);

    months.push({ label, paid: Math.round(paid), unpaid: Math.round(unpaid) });
  }

  res.json(months);
});

module.exports = router;
