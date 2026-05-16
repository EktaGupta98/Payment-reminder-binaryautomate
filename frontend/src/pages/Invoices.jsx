import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getInvoices, createInvoice, updateInvoice,
  deleteInvoice, sendBulkReminders, exportCSV,
} from "../api";
import { format } from "date-fns";
import "./Invoices.css";

const STATUS_OPTIONS = ["all", "pending", "overdue", "reminder_sent", "paid"];

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ─── Field-level error display ────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return <span className="field-error">⚠ {msg}</span>;
}

// ─── Warning toast (past due / duplicate client) ──────────────────────────────
function showWarnings(warnings) {
  if (warnings.pastDue) {
    toast("⚠️ Due date is in the past — invoice marked Overdue immediately.", {
      duration: 5000,
      style: { background: "#2d1f00", color: "#ffd166", border: "1px solid #ffd16633" },
    });
  }
  if (warnings.duplicateClient) {
    toast(`ℹ️ ${warnings.duplicateClient}`, {
      duration: 6000,
      style: { background: "#0d1f2d", color: "#85b7eb", border: "1px solid #85b7eb33" },
    });
  }
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────
function InvoiceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "",
    amount: "", dueDate: "", description: "", notes: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  // Client-side pre-validation for instant feedback
  const validateLocally = () => {
    const errs = {};
    if (!form.clientName.trim()) errs.clientName = "Client name is required";
    if (!form.clientEmail.trim()) errs.clientEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) errs.clientEmail = "Enter a valid email";
    if (!form.amount) errs.amount = "Amount is required";
    else if (parseFloat(form.amount) < 1) errs.amount = "Amount must be at least ₹1";
    if (!form.dueDate) errs.dueDate = "Due date is required";
    if (form.clientPhone && !/^[+\d\s\-()]{7,15}$/.test(form.clientPhone)) {
      errs.clientPhone = "Phone format is invalid";
    }
    return errs;
  };

  // Warn when due date is in the past (while typing)
  const isPastDue = form.dueDate && new Date(form.dueDate) < new Date(new Date().setHours(0,0,0,0));

  const handleSubmit = async () => {
    const localErrs = validateLocally();
    if (Object.keys(localErrs).length > 0) {
      setErrors(localErrs);
      return;
    }
    setSaving(true);
    try {
      const res = await createInvoice(form);
      toast.success(`✓ Invoice ${res.data.invoice.invoiceNumber} created!`);
      showWarnings(res.data.warnings);
      onSaved();
      onClose();
    } catch (e) {
      if (e.response?.data?.fields) {
        // Server validation errors
        setErrors(e.response.data.fields);
        toast.error("Please fix the errors below");
      } else {
        toast.error(e.response?.data?.error || "Failed to create invoice");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Invoice</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input
                className={`form-input ${errors.clientName ? "input-error" : ""}`}
                placeholder="Acme Corp"
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
              />
              <FieldError msg={errors.clientName} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Email *</label>
              <input
                className={`form-input ${errors.clientEmail ? "input-error" : ""}`}
                type="email"
                placeholder="client@email.com"
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
              />
              <FieldError msg={errors.clientEmail} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input
                className={`form-input ${errors.clientPhone ? "input-error" : ""}`}
                placeholder="+91 98765 43210"
                value={form.clientPhone}
                onChange={(e) => set("clientPhone", e.target.value)}
              />
              <FieldError msg={errors.clientPhone} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input
                className={`form-input ${errors.amount ? "input-error" : ""}`}
                type="number"
                min="1"
                placeholder="5000"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
              <FieldError msg={errors.amount} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input
              className={`form-input ${errors.dueDate ? "input-error" : ""}`}
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
            <FieldError msg={errors.dueDate} />
            {isPastDue && !errors.dueDate && (
              <span className="field-warning">⚠ This date is in the past — invoice will be marked Overdue</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="Web design, consulting, services…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Internal notes (not shown on invoice email)"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk action floating bar ─────────────────────────────────────────────────
function BulkBar({ count, onSendReminders, onClear, sending }) {
  if (count === 0) return null;
  return (
    <div className="bulk-bar">
      <span className="bulk-count">{count} selected</span>
      <button className="btn btn-primary btn-sm" onClick={onSendReminders} disabled={sending}>
        {sending ? "Sending…" : `📧 Send ${count} Reminder${count !== 1 ? "s" : ""}`}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
    </div>
  );
}

// ─── Main Invoices page ───────────────────────────────────────────────────────
export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    getInvoices({ search, status, sortBy })
      .then((r) => setInvoices(r.data))
      .finally(() => setLoading(false));
  }, [search, status, sortBy]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Checkbox logic
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const unpaid = invoices.filter((i) => i.status !== "paid");
    if (selected.size === unpaid.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unpaid.map((i) => i.id)));
    }
  };

  const handleBulkSend = async () => {
    setBulkSending(true);
    try {
      const res = await sendBulkReminders([...selected], "PayTrack");
      const { sent, failed, skipped } = res.data.results;
      toast.success(`✓ Sent: ${sent}${failed ? ` | Failed: ${failed}` : ""}${skipped ? ` | Skipped: ${skipped}` : ""}`);
      setSelected(new Set());
      fetchInvoices();
    } catch (e) {
      toast.error("Bulk send failed");
    } finally {
      setBulkSending(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateInvoice(id, { status: newStatus });
      toast.success("Status updated");
      fetchInvoices();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete invoice ${num}?`)) return;
    try {
      await deleteInvoice(id);
      toast.success("Deleted");
      fetchInvoices();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const unpaidCount = invoices.filter((i) => i.status !== "paid").length;

  return (
    <div className="page-enter">
      {showModal && (
        <InvoiceModal onClose={() => setShowModal(false)} onSaved={fetchInvoices} />
      )}

      <BulkBar
        count={selected.size}
        onSendReminders={handleBulkSend}
        onClear={() => setSelected(new Set())}
        sending={bulkSending}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} record{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => exportCSV(status)} title="Export current view as CSV">
            ↓ CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Invoice
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar card" style={{ marginBottom: 16, padding: "14px 16px" }}>
        <div className="filter-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="form-input search-input"
            placeholder="Search by name, email, or invoice number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-right">
          <select className="form-input filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Status" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          <select className="form-input filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">Sort: Newest</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="amount">Sort: Amount</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <p>No invoices found.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
              Create your first invoice
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="cb"
                      checked={selected.size > 0 && selected.size === unpaidCount}
                      onChange={toggleAll}
                      title="Select all unpaid"
                    />
                  </th>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={selected.has(inv.id) ? "row-selected" : ""}>
                    <td>
                      {inv.status !== "paid" && (
                        <input
                          type="checkbox"
                          className="cb"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                        />
                      )}
                    </td>
                    <td>
                      <span className="mono" style={{ color: "var(--text)", fontWeight: 500 }}>
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text)" }}>{inv.clientName}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{inv.clientEmail}</div>
                    </td>
                    <td>
                      <span className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>
                        {fmt(inv.amount)}
                      </span>
                    </td>
                    <td>
                      <span className="mono">{format(new Date(inv.dueDate), "dd MMM yyyy")}</span>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="reminder_sent">Reminder Sent</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link to={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
