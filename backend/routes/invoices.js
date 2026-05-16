const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { readDB, writeDB } = require("../db");

// ─── Validation rules ────────────────────────────────────────────────────────
const invoiceValidation = [
  body("clientName")
    .trim()
    .notEmpty().withMessage("Client name is required")
    .isLength({ min: 2 }).withMessage("Client name must be at least 2 characters"),

  body("clientEmail")
    .trim()
    .notEmpty().withMessage("Client email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("amount")
    .notEmpty().withMessage("Amount is required")
    .isFloat({ min: 1 }).withMessage("Amount must be at least ₹1")
    .toFloat(),

  body("dueDate")
    .notEmpty().withMessage("Due date is required")
    .isISO8601().withMessage("Due date must be a valid date"),

  body("clientPhone")
    .optional({ checkFalsy: true })
    .matches(/^[+\d\s\-()]{7,15}$/).withMessage("Phone number format is invalid"),
];

// ─── GET all invoices (search + filter + sort) ────────────────────────────────
router.get("/", (req, res) => {
  const db = readDB();
  let invoices = db.invoices;
  const { search, status, sortBy } = req.query;

  if (search) {
    const q = search.toLowerCase();
    invoices = invoices.filter(
      (inv) =>
        inv.clientName.toLowerCase().includes(q) ||
        inv.clientEmail.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q)
    );
  }

  if (status && status !== "all") {
    invoices = invoices.filter((inv) => inv.status === status);
  }

  if (sortBy === "dueDate") {
    invoices.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  } else if (sortBy === "amount") {
    invoices.sort((a, b) => b.amount - a.amount);
  } else {
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  res.json(invoices);
});

// ─── GET single invoice ───────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const db = readDB();
  const invoice = db.invoices.find((inv) => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  res.json(invoice);
});

// ─── POST create invoice (with validation) ────────────────────────────────────
router.post("/", invoiceValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed",
      fields: errors.array().reduce((acc, e) => {
        acc[e.path] = e.msg;
        return acc;
      }, {}),
    });
  }

  const { clientName, clientEmail, clientPhone, amount, dueDate, description, notes } = req.body;

  const db = readDB();

  // Warn: same client email already has unpaid invoice
  const existingUnpaid = db.invoices.find(
    (inv) => inv.clientEmail === clientEmail && inv.status !== "paid"
  );

  const count = db.invoices.length + 1;
  const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;
  const now = new Date().toISOString();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const isPastDue = due < today;

  const newInvoice = {
    id: uuidv4(),
    invoiceNumber,
    clientName,
    clientEmail,
    clientPhone: clientPhone || "",
    amount: parseFloat(amount),
    dueDate,
    description: description || "",
    notes: notes || "",
    status: isPastDue ? "overdue" : "pending",
    createdAt: now,
    updatedAt: now,
  };

  db.invoices.push(newInvoice);
  writeDB(db);

  res.status(201).json({
    invoice: newInvoice,
    warnings: {
      pastDue: isPastDue,
      duplicateClient: existingUnpaid
        ? `${clientName} already has an unpaid invoice (${existingUnpaid.invoiceNumber})`
        : null,
    },
  });
});

// ─── PATCH update invoice ─────────────────────────────────────────────────────
router.patch("/:id", (req, res) => {
  const db = readDB();
  const idx = db.invoices.findIndex((inv) => inv.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Invoice not found" });

  const allowed = ["clientName", "clientEmail", "clientPhone", "amount", "dueDate", "description", "notes", "status"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // If updating amount, parse float
  if (updates.amount) updates.amount = parseFloat(updates.amount);

  db.invoices[idx] = { ...db.invoices[idx], ...updates, updatedAt: new Date().toISOString() };
  writeDB(db);
  res.json(db.invoices[idx]);
});

// ─── DELETE invoice ───────────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const db = readDB();
  const idx = db.invoices.findIndex((inv) => inv.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Invoice not found" });

  db.invoices.splice(idx, 1);
  db.reminders = db.reminders.filter((r) => r.invoiceId !== req.params.id);
  writeDB(db);
  res.json({ message: "Invoice deleted" });
});

// ─── GET CSV export ───────────────────────────────────────────────────────────
router.get("/export/csv", (req, res) => {
  const db = readDB();
  let invoices = db.invoices;
  const { status } = req.query;
  if (status && status !== "all") {
    invoices = invoices.filter((inv) => inv.status === status);
  }

  const headers = ["Invoice #", "Client Name", "Client Email", "Phone", "Amount", "Due Date", "Status", "Description", "Created At"];
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.clientName,
    inv.clientEmail,
    inv.clientPhone,
    inv.amount,
    inv.dueDate,
    inv.status,
    `"${(inv.description || "").replace(/"/g, '""')}"`,
    new Date(inv.createdAt).toLocaleDateString("en-IN"),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="invoices-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = router;
