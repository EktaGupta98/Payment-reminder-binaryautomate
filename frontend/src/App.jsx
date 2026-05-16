import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { healthCheck } from "./api";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import ReminderLog from "./pages/ReminderLog";
import "./App.css";

// Calls /api/health on every route change → auto-marks overdue invoices
function OverdueWatcher() {
  const location = useLocation();
  useEffect(() => {
    healthCheck().catch(() => {}); // silent fail if server is down
  }, [location.pathname]);
  return null;
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">₹</div>
        <span className="brand-name">PayTrack</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </NavLink>
        <NavLink
          to="/invoices"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Invoices
        </NavLink>
        <NavLink
          to="/reminders"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Reminder Log
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <p className="sidebar-footer-text">Binary Automates</p>
      </div>
    </aside>
  );
}

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181f",
            color: "#f0f0f5",
            border: "1px solid #2a2a35",
            fontFamily: "'DM Sans', sans-serif",
          },
        }}
      />
      <OverdueWatcher />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/reminders" element={<ReminderLog />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
