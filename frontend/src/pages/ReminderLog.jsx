import { useEffect, useState } from "react";
import { getReminders } from "../api";
import { format } from "date-fns";
import { Link } from "react-router-dom";

function fmt(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function ReminderLog() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReminders()
      .then((r) => setReminders(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reminder Log</h1>
          <p className="page-subtitle">All reminder activity across invoices</p>
        </div>
        <span className="badge reminder_sent">{reminders.length} total</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state">Loading reminders…</div>
        ) : reminders.length === 0 ? (
          <div className="empty-state">
            <p>No reminders sent yet.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Go to an invoice and click "Send Email Reminder" to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id}>
                    <td><span className="mono" style={{ fontSize: 13 }}>{format(new Date(r.sentAt), "dd MMM yy, HH:mm")}</span></td>
                    <td>
                      <Link to={`/invoices/${r.invoiceId}`} style={{ color: "var(--accent2)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                        {r.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text)", fontWeight: 500 }}>{r.clientName}</td>
                    <td style={{ fontSize: 13 }}>{r.clientEmail}</td>
                    <td><span className="mono">{fmt(r.amount)}</span></td>
                    <td>
                      <span className={`badge ${r.status === "sent" ? "paid" : "overdue"}`}>
                        {r.status === "sent" ? "✓ Delivered" : "✗ Failed"}
                      </span>
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
