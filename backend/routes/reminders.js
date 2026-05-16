const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../db");
const { sendReminderEmail } = require("../emailService");

// ─── GET all reminders (global log) ──────────────────────────────────────────
router.get("/", (req, res) => {
  const db = readDB();
  const reminders = db.reminders.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(reminders);
});

// ─── GET reminders for one invoice ───────────────────────────────────────────
router.get("/invoice/:invoiceId", (req, res) => {
  const db = readDB();
  const reminders = db.reminders
    .filter((r) => r.invoiceId === req.params.invoiceId)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(reminders);
});

// ─── POST send single reminder ────────────────────────────────────────────────
router.post("/send", async (req, res) => {
  const { invoiceId, businessName } = req.body;
  if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });

  const db = readDB();
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  if (invoice.status === "paid") return res.status(400).json({ error: "Invoice is already marked as paid" });

  let emailStatus = "sent";
  let emailError = null;

  try {
    await sendReminderEmail({
      to: invoice.clientEmail,
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      businessName: businessName || "PayTrack",
    });
  } catch (err) {
    console.error("Email send error:", err.message);
    emailStatus = "failed";
    emailError = err.message;
  }

  const reminder = {
    id: uuidv4(),
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    amount: invoice.amount,
    sentAt: new Date().toISOString(),
    status: emailStatus,
    error: emailError,
    businessName: businessName || "PayTrack",
  };

  db.reminders.push(reminder);

  const invIdx = db.invoices.findIndex((inv) => inv.id === invoiceId);
  if (invIdx !== -1 && db.invoices[invIdx].status !== "paid") {
    db.invoices[invIdx].status = "reminder_sent";
    db.invoices[invIdx].updatedAt = new Date().toISOString();
  }

  writeDB(db);

  if (emailStatus === "failed") {
    return res.status(207).json({ message: "Reminder logged but email failed", reminder, emailError });
  }

  res.json({ message: "Reminder sent successfully", reminder });
});

// ─── POST bulk send reminders ─────────────────────────────────────────────────
router.post("/bulk", async (req, res) => {
  const { invoiceIds, businessName } = req.body;

  if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({ error: "invoiceIds array is required" });
  }

  const db = readDB();
  const results = { sent: 0, failed: 0, skipped: 0, details: [] };

  for (const invoiceId of invoiceIds) {
    const invoice = db.invoices.find((inv) => inv.id === invoiceId);

    if (!invoice) {
      results.skipped++;
      results.details.push({ invoiceId, status: "skipped", reason: "Not found" });
      continue;
    }

    if (invoice.status === "paid") {
      results.skipped++;
      results.details.push({ invoiceId, invoiceNumber: invoice.invoiceNumber, status: "skipped", reason: "Already paid" });
      continue;
    }

    let emailStatus = "sent";
    let emailError = null;

    try {
      await sendReminderEmail({
        to: invoice.clientEmail,
        clientName: invoice.clientName,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        businessName: businessName || "PayTrack",
      });
      results.sent++;
    } catch (err) {
      emailStatus = "failed";
      emailError = err.message;
      results.failed++;
    }

    const reminder = {
      id: uuidv4(),
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      amount: invoice.amount,
      sentAt: new Date().toISOString(),
      status: emailStatus,
      error: emailError,
      businessName: businessName || "PayTrack",
    };

    db.reminders.push(reminder);

    const invIdx = db.invoices.findIndex((inv) => inv.id === invoiceId);
    if (invIdx !== -1 && db.invoices[invIdx].status !== "paid") {
      db.invoices[invIdx].status = "reminder_sent";
      db.invoices[invIdx].updatedAt = new Date().toISOString();
    }

    results.details.push({
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      status: emailStatus,
    });

    // Small delay between emails to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  writeDB(db);
  res.json({ message: "Bulk reminder complete", results });
});

module.exports = router;
