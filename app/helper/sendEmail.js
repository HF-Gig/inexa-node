import nodemailer from 'nodemailer';
import initModels from '../../models/init_models.js';
import axios from 'axios';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


export default async function sendEmail({ to, subject, text, html, attachments }) {
  return transporter.sendMail({
    from: {
      name: 'Inexa',
      address: process.env.SMTP_USER
    },
    to,
    subject,
    text,
    html,
    attachments
  });
}

export async function sendInvoiceEmail(paymentId) {
  const db = await initModels();
  const payment = await db.payment.findByPk(paymentId, {
    include: [{ model: db.user, as: 'user' }]
  });
  if (!payment || !payment.invoice_pdf_url || !payment.user || !payment.user.email) {
    throw new Error('Payment, invoice PDF, or user email not found');
  }
  const response = await axios.get(payment.invoice_pdf_url, { responseType: 'arraybuffer' });
  const pdfBuffer = Buffer.from(response.data, 'binary');
  return sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: 'Your Invoice',
    text: 'Please find your invoice attached.',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
} 