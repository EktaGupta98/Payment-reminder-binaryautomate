const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const { readDB } = require("../db");

// ─── GET /api/pdf/:invoiceId  → streams a PDF ─────────────────────────────────
router.get("/:invoiceId", (req, res) => {
  const db = readDB();
  const invoice = db.invoices.find((inv) => inv.id === req.params.invoiceId);

  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  const reminderCount = db.reminders.filter((r) => r.invoiceId === invoice.id).length;

  // ── Setup PDF ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${invoice.invoiceNumber}.pdf"`
  );
  doc.pipe(res);

  const W = 595 - 100; // usable width (A4 minus margins)
  const PURPLE = "#6c63ff";
  const DARK = "#1a1a2e";
  const GRAY = "#6b7280";
  const LIGHT_BG = "#f3f4f6";
  const RED = "#dc2626";
  const GREEN = "#16a34a";

  const fmtCurrency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const statusColor = {
    paid: GREEN,
    overdue: RED,
    pending: "#d97706",
    reminder_sent: PURPLE,
  };

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 110).fill(DARK);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(26)
    .text("PayTrack", 50, 32);

  doc
    .fillColor("#a5b4fc")
    .font("Helvetica")
    .fontSize(11)
    .text("Payment Invoice System", 50, 62);

  // Invoice number top-right
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(invoice.invoiceNumber, 50, 82, { align: "right", width: W });

  doc.moveDown(0);

  // ── Invoice title & status ─────────────────────────────────────────────────
  let y = 130;

  doc
    .fillColor(DARK)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("INVOICE", 50, y);

  // Status pill
  const statusLabel = invoice.status.replace("_", " ").toUpperCase();
  const sColor = statusColor[invoice.status] || GRAY;
  doc
    .roundedRect(400, y, 145, 24, 12)
    .fill(sColor);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(statusLabel, 400, y + 7, { width: 145, align: "center" });

  y += 40;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#e5e7eb").lineWidth(1).stroke();
  y += 16;

  // ── Two-column: Bill To / Invoice Details ──────────────────────────────────
  // Left: Bill To
  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(9)
    .text("BILL TO", 50, y)
    .fillColor(DARK)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(invoice.clientName, 50, y + 14);

  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(10)
    .text(invoice.clientEmail, 50, y + 32);

  if (invoice.clientPhone) {
    doc.text(invoice.clientPhone, 50, y + 46);
  }

  // Right: Invoice meta
  const metaX = 370;
  const rows = [
    ["Invoice Number", invoice.invoiceNumber],
    ["Issue Date", fmtDate(invoice.createdAt)],
    ["Due Date", fmtDate(invoice.dueDate)],
    ["Reminders Sent", String(reminderCount)],
  ];

  rows.forEach(([label, value], i) => {
    const ry = y + i * 18;
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text(label, metaX, ry);
    doc
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(value, metaX + 90, ry, { width: 85, align: "right" });
  });

  y += 90;

  // ── Description section ────────────────────────────────────────────────────
  if (invoice.description) {
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text("DESCRIPTION", 50, y);
    doc
      .fillColor(DARK)
      .font("Helvetica")
      .fontSize(11)
      .text(invoice.description, 50, y + 14, { width: W });
    y += 40;
  }

  // ── Line item table ────────────────────────────────────────────────────────
  y += 8;
  doc.rect(50, y, W, 32).fill(PURPLE);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Description", 62, y + 11)
    .text("Amount", 50, y + 11, { width: W - 12, align: "right" });

  y += 32;
  doc.rect(50, y, W, 36).fill(LIGHT_BG);
  doc
    .fillColor(DARK)
    .font("Helvetica")
    .fontSize(11)
    .text(invoice.description || "Services rendered", 62, y + 12)
    .text(fmtCurrency(invoice.amount), 50, y + 12, { width: W - 12, align: "right" });

  y += 36;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

  // ── Total box ─────────────────────────────────────────────────────────────
  y += 12;
  doc.rect(370, y, 175, 48).fill(DARK);
  doc
    .fillColor("#a5b4fc")
    .font("Helvetica")
    .fontSize(9)
    .text("TOTAL AMOUNT DUE", 380, y + 10);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(fmtCurrency(invoice.amount), 370, y + 22, { width: 165, align: "right" });

  y += 68;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(9)
      .text("INTERNAL NOTES", 50, y);
    doc
      .fillColor(GRAY)
      .font("Helvetica")
      .fontSize(10)
      .text(invoice.notes, 50, y + 14, { width: W });
    y += 40;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc
    .moveTo(50, 770)
    .lineTo(545, 770)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor(GRAY)
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Generated by PayTrack · ${new Date().toLocaleDateString("en-IN")} · ${invoice.invoiceNumber}`,
      50,
      778,
      { align: "center", width: W }
    );

  doc.end();
});

module.exports = router;
