import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getInvoice, updateInvoice, deleteInvoice,
  sendReminder, getInvoiceReminders, downloadPDF,
} from "../api";
import { format } from "date-fns";
import "./InvoiceDetail.css";

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ─── Timeline component ───────────────────────────────────────────────────────
function Timeline({ invoice, reminders }) {
  const events = [
    {
      id: "created",
      type: "created",
      label: "Invoice created",
      sub: `${invoice.invoiceNumber} · ${fmt(invoice.amount)}`,
      time: invoice.createdAt,
      color: "var(--accent2)",
    },
    ...reminders.map((r) => ({
      id: r.id,
      type: r.status === "sent" ? "reminder" : "failed",
      label: r.status === "sent" ? "Reminder email sent" : "Reminder failed",
      sub: `To: ${r.clientEmail}`,
      time: r.sentAt,
      color: r.status === "sent" ? "var(--green)" : "var(--red)",
    })),
    ...(invoice.status === "paid"
      ? [{
          id: "paid",
          type: "paid",
          label: "Marked as paid",
          sub: fmt(invoice.amount) + " received",
          time: invoice.updatedAt,
          color: "var(--green)",
        }]
      : []),
  ].sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="timeline">
      {events.map((ev, i) => (
        <div key={ev.id} className="tl-item">
          <div className="tl-line-wrap">
            <div className="tl-dot" style={{ background: ev.color }} />
            {i < events.length - 1 && <div className="tl-line" />}
          </div>
          <div className="tl-body">
            <div className="tl-label">{ev.label}</div>
            <div className="tl-sub">{ev.sub}</div>
            <div className="tl-time mono">{format(new Date(ev.time), "dd MMM yyyy, HH:mm")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [businessName, setBusinessName] = useState("PayTrack");
  const [editErrors, setEditErrors] = useState({});

  const fetchData = async () => {
    try {
      const [invRes, remRes] = await Promise.all([getInvoice(id), getInvoiceReminders(id)]);
      setInvoice(invRes.data);
      setEditForm(invRes.data);
      setReminders(remRes.data);
    } catch {
      toast.error("Invoice not found");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSendReminder = async () => {
    setSending(true);
    try {
      const res = await sendReminder(id, businessName);
      if (res.status === 207) {
        toast.error("Logged but email failed — check .env credentials");
      } else {
        toast.success("📧 Reminder sent!");
      }
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoice(id, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleSaveEdit = async () => {
    // Validate edit form
    const errs = {};
    if (!editForm.clientName?.trim()) errs.clientName = "Required";
    if (!editForm.clientEmail?.trim()) errs.clientEmail = "Required";
    if (!editForm.amount || parseFloat(editForm.amount) < 1) errs.amount = "Must be ≥ ₹1";
    if (!editForm.dueDate) errs.dueDate = "Required";

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    try {
      await updateInvoice(id, {
        clientName: editForm.clientName,
        clientEmail: editForm.clientEmail,
        clientPhone: editForm.clientPhone,
        amount: editForm.amount,
        dueDate: editForm.dueDate,
        description: editForm.description,
        notes: editForm.notes,
      });
      toast.success("Invoice updated");
      setEditing(false);
      setEditErrors({});
      fetchData();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice permanently?")) return;
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      navigate("/invoices");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="loading-state">Loading invoice…</div>;
  if (!invoice) return null;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => navigate("/invoices")}>
            ← Back
          </button>
          <h1 className="page-title">{invoice.invoiceNumber}</h1>
          <p className="page-subtitle">Created {format(new Date(invoice.createdAt), "dd MMM yyyy")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* PDF Download */}
          <button
            className="btn btn-ghost"
            onClick={() => downloadPDF(invoice.id)}
            title="Download PDF invoice"
          >
            📄 Download PDF
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditing(!editing); setEditErrors({}); }}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: Invoice info / edit form */}
        <div className="card detail-main">
          {editing ? (
            <div className="edit-form">
              <h2 className="section-h" style={{ marginBottom: 14 }}>Edit Invoice</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client Name *</label>
                  <input
                    className={`form-input ${editErrors.clientName ? "input-error" : ""}`}
                    value={editForm.clientName}
                    onChange={(e) => { setEditForm(f => ({ ...f, clientName: e.target.value })); setEditErrors(e2 => ({ ...e2, clientName: null })); }}
                  />
                  {editErrors.clientName && <span className="field-error">⚠ {editErrors.clientName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Client Email *</label>
                  <input
                    className={`form-input ${editErrors.clientEmail ? "input-error" : ""}`}
                    value={editForm.clientEmail}
                    onChange={(e) => { setEditForm(f => ({ ...f, clientEmail: e.target.value })); setEditErrors(e2 => ({ ...e2, clientEmail: null })); }}
                  />
                  {editErrors.clientEmail && <span className="field-error">⚠ {editErrors.clientEmail}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={editForm.clientPhone} onChange={(e) => setEditForm(f => ({ ...f, clientPhone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    className={`form-input ${editErrors.amount ? "input-error" : ""}`}
                    type="number" min="1"
                    value={editForm.amount}
                    onChange={(e) => { setEditForm(f => ({ ...f, amount: e.target.value })); setEditErrors(e2 => ({ ...e2, amount: null })); }}
                  />
                  {editErrors.amount && <span className="field-error">⚠ {editErrors.amount}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input
                  className={`form-input ${editErrors.dueDate ? "input-error" : ""}`}
                  type="date" value={editForm.dueDate}
                  onChange={(e) => { setEditForm(f => ({ ...f, dueDate: e.target.value })); setEditErrors(e2 => ({ ...e2, dueDate: null })); }}
                />
                {editErrors.dueDate && <span className="field-error">⚠ {editErrors.dueDate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
                <button className="btn btn-ghost" onClick={() => { setEditing(false); setEditErrors({}); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {[
                ["Client", invoice.clientName],
                ["Email", invoice.clientEmail],
                invoice.clientPhone && ["Phone", invoice.clientPhone],
                ["Amount", <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{fmt(invoice.amount)}</span>],
                ["Due Date", <span className="mono">{format(new Date(invoice.dueDate), "dd MMMM yyyy")}</span>],
                invoice.description && ["Description", invoice.description],
                invoice.notes && ["Notes", <span style={{ color: "var(--text3)", fontStyle: "italic" }}>{invoice.notes}</span>],
              ].filter(Boolean).map(([label, value]) => (
                <div className="detail-row" key={label}>
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: Status + send reminder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 className="section-h">Status</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {["pending", "overdue", "reminder_sent", "paid"].map((s) => (
                <button
                  key={s}
                  className={`status-btn ${invoice.status === s ? "active" : ""}`}
                  data-status={s}
                  onClick={() => handleStatusChange(s)}
                >
                  {s === "reminder_sent" ? "Reminder Sent" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-h">Send Reminder</h3>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Business Name</label>
              <input
                className="form-input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12, width: "100%" }}
              onClick={handleSendReminder}
              disabled={sending || invoice.status === "paid"}
            >
              {sending ? "Sending…" : invoice.status === "paid" ? "Already Paid ✓" : "📧 Send Email Reminder"}
            </button>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
              To: <strong style={{ color: "var(--text2)" }}>{invoice.clientEmail}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="section-h" style={{ marginBottom: 16 }}>
          Activity Timeline ({reminders.length} reminder{reminders.length !== 1 ? "s" : ""})
        </h2>
        <Timeline invoice={invoice} reminders={reminders} />
      </div>
    </div>
  );
}
