import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ─── Health / overdue refresh ─────────────────────────────────────────────────
export const healthCheck = () => api.get("/health");

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const getInvoices = (params) => api.get("/invoices", { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post("/invoices", data);
export const updateInvoice = (id, data) => api.patch(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);
export const exportCSV = (status) => {
  const url = `/api/invoices/export/csv${status && status !== "all" ? `?status=${status}` : ""}`;
  window.open(url, "_blank");
};

// ─── Reminders ────────────────────────────────────────────────────────────────
export const sendReminder = (invoiceId, businessName) =>
  api.post("/reminders/send", { invoiceId, businessName });
export const sendBulkReminders = (invoiceIds, businessName) =>
  api.post("/reminders/bulk", { invoiceIds, businessName });
export const getReminders = () => api.get("/reminders");
export const getInvoiceReminders = (invoiceId) =>
  api.get(`/reminders/invoice/${invoiceId}`);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get("/dashboard");
export const getChartData = () => api.get("/dashboard/chart");

// ─── PDF ──────────────────────────────────────────────────────────────────────
export const downloadPDF = (invoiceId) => {
  window.open(`/api/pdf/${invoiceId}`, "_blank");
};
