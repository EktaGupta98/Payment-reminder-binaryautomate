const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendReminderEmail({ to, clientName, invoiceNumber, amount, dueDate, businessName }) {
  const transporter = createTransporter();

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

  const formattedDue = new Date(dueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const mailOptions = {
    from: `"${businessName || "Payment Reminder"}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Payment Reminder: Invoice #${invoiceNumber} – ${formattedAmount} Due`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px;">
        <div style="background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">
          <div style="margin-bottom: 32px;">
            <h1 style="color: #111827; font-size: 24px; margin: 0 0 4px 0;">${businessName || "Payment Reminder"}</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment reminder notice</p>
          </div>

          <p style="color: #374151; font-size: 16px;">Dear <strong>${clientName}</strong>,</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            This is a friendly reminder that the following invoice is due for payment:
          </p>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Invoice Number</td>
                <td style="color: #111827; font-weight: 600; text-align: right;">#${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Amount Due</td>
                <td style="color: #dc2626; font-weight: 700; font-size: 18px; text-align: right;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Due Date</td>
                <td style="color: #111827; font-weight: 600; text-align: right;">${formattedDue}</td>
              </tr>
            </table>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Please arrange the payment at your earliest convenience to avoid any late fees.
            If you have already made the payment, please disregard this notice.
          </p>

          <p style="color: #374151; font-size: 15px; margin-top: 32px;">
            Thank you for your prompt attention to this matter.
          </p>

          <p style="color: #374151; font-size: 15px; margin-top: 8px;">
            Warm regards,<br/>
            <strong>${businessName || "The Billing Team"}</strong>
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated payment reminder. Please do not reply to this email.
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendReminderEmail };
