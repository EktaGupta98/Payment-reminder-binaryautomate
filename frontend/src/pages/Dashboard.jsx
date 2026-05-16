import { useEffect, useState } from "react";
import { getDashboard, getChartData } from "../api";
import { format, isToday, isTomorrow } from "date-fns";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import "./Dashboard.css";

function fmt(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function fmtShort(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

function dueDateLabel(d) {
  const date = new Date(d);
  if (isToday(date)) return "Due Today";
  if (isTomorrow(date)) return "Due Tomorrow";
  return `Due ${format(date, "dd MMM")}`;
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === "paid" ? "Collected" : "Outstanding"}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getChartData()])
      .then(([dash, chart]) => {
        setData(dash.data);
        setChartData(chart.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading dashboard…</div>;
  if (!data) return <div className="loading-state">Failed to load.</div>;

  const { summary, recentReminders, upcoming } = data;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your payment activity</p>
        </div>
        <Link to="/invoices" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Overdue alert banner */}
      {summary.overdue > 0 && (
        <div className="overdue-banner">
          <span>⚠️ {summary.overdue} invoice{summary.overdue !== 1 ? "s are" : " is"} overdue</span>
          <Link to="/invoices?status=overdue" className="banner-link">View overdue →</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Invoices"
          value={summary.total}
          sub={`${fmt(summary.totalAmount)} total`}
          color="neutral"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard
          label="Unpaid Amount"
          value={fmt(summary.unpaidAmount)}
          sub={`${summary.pending + summary.overdue + summary.reminderSent} invoices pending`}
          color="red"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
        <StatCard
          label="Overdue"
          value={summary.overdue}
          sub={fmt(summary.overdueAmount)}
          color="orange"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label="Collected"
          value={fmt(summary.paidAmount)}
          sub={`${summary.paid} invoices paid`}
          color="green"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>}
        />
      </div>

      {/* Revenue chart */}
      <div className="card chart-card">
        <div className="chart-header">
          <h2 className="section-title" style={{ margin: 0 }}>Revenue Overview</h2>
          <p className="chart-subtitle">Collected vs outstanding · last 6 months</p>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#5a5a70", fontSize: 12, fontFamily: "DM Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fill: "#5a5a70", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(108,99,255,0.06)" }} />
              <Legend
                formatter={(v) => v === "paid" ? "Collected" : "Outstanding"}
                wrapperStyle={{ fontSize: 12, color: "#9090a8", fontFamily: "DM Mono" }}
              />
              <Bar dataKey="paid" fill="#22c97a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="unpaid" fill="#ff4d6a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="dashboard-bottom">
        <div className="card">
          <h2 className="section-title">Upcoming (Next 7 Days)</h2>
          {upcoming.length === 0 ? (
            <p className="empty-small">No upcoming invoices in the next 7 days.</p>
          ) : (
            <div className="upcoming-list">
              {upcoming.map((inv) => (
                <Link to={`/invoices/${inv.id}`} key={inv.id} className="upcoming-item">
                  <div>
                    <div className="upcoming-name">{inv.clientName}</div>
                    <div className="upcoming-num mono">{inv.invoiceNumber}</div>
                  </div>
                  <div className="upcoming-right">
                    <div className="upcoming-amount">{fmt(inv.amount)}</div>
                    <div className="upcoming-due">{dueDateLabel(inv.dueDate)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Recent Reminders</h2>
          {recentReminders.length === 0 ? (
            <p className="empty-small">No reminders sent yet.</p>
          ) : (
            <div className="reminder-list">
              {recentReminders.map((r) => (
                <div key={r.id} className="reminder-item">
                  <div className="reminder-dot" style={{ background: r.status === "sent" ? "var(--green)" : "var(--red)" }} />
                  <div>
                    <div className="reminder-name">{r.clientName}</div>
                    <div className="reminder-meta mono">{r.invoiceNumber} · {fmt(r.amount)}</div>
                  </div>
                  <div className="reminder-time">{format(new Date(r.sentAt), "dd MMM, HH:mm")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
