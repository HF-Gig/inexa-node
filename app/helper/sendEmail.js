import initModels from '../../models/init_models.js';
import axios from 'axios';
import { readFile } from 'fs/promises';

export class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.code = 'EMAIL_DELIVERY_FAILED';
    this.statusCode = 503;
    this.cause = cause;
    this.providerCode = cause?.code;
    this.providerResponse = cause?.response;
    this.providerResponseCode = cause?.responseCode;
  }
}

export const isEmailDeliveryError = (error) => error instanceof EmailDeliveryError;

let cachedToken = null;

const getGraphConfig = () => ({
  tenantId: process.env.MICROSOFT_TENANT_ID || process.env.AZURE_TENANT_ID,
  clientId: process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET,
  sender: process.env.MICROSOFT_GRAPH_SENDER || process.env.SMTP_USER
});

const assertGraphConfig = (config) => {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Microsoft Graph email config: ${missing.join(', ')}`);
  }
};

const getContentType = (attachment) => {
  if (attachment.contentType) return attachment.contentType;
  if (attachment.filename?.toLowerCase().endsWith('.png')) return 'image/png';
  if (attachment.filename?.toLowerCase().endsWith('.jpg') || attachment.filename?.toLowerCase().endsWith('.jpeg')) return 'image/jpeg';
  if (attachment.filename?.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
};

const getAccessToken = async () => {
  const config = getGraphConfig();
  assertGraphConfig(config);

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await axios.post(tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + Number(response.data.expires_in || 3599) * 1000
  };

  return cachedToken.accessToken;
};

const normalizeRecipients = (value) => {
  const recipients = Array.isArray(value) ? value : String(value || '').split(',');
  return recipients
    .map((address) => String(address).trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
};

const normalizeAttachments = async (attachments = []) => Promise.all(
  attachments.map(async (attachment) => {
    const content = attachment.content ?? await readFile(attachment.path);
    return {
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.filename || attachment.name || 'attachment',
      contentType: getContentType(attachment),
      contentBytes: Buffer.isBuffer(content)
        ? content.toString('base64')
        : Buffer.from(String(content)).toString('base64'),
      isInline: Boolean(attachment.cid),
      contentId: attachment.cid
    };
  })
);

export default async function sendEmail({ to, subject, text, html, attachments }) {
  try {
    const config = getGraphConfig();
    assertGraphConfig(config);

    const accessToken = await getAccessToken();
    const graphAttachments = await normalizeAttachments(attachments);
    const message = {
      subject,
      body: {
        contentType: html ? 'HTML' : 'Text',
        content: html || text || ''
      },
      toRecipients: normalizeRecipients(to)
    };

    if (graphAttachments.length > 0) {
      message.attachments = graphAttachments;
    }

    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.sender)}/sendMail`,
      {
        message,
        saveToSentItems: true
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      accepted: normalizeRecipients(to).map((recipient) => recipient.emailAddress.address),
      messageId: response.headers['request-id'] || response.headers['client-request-id'],
      response: response.status
    };
  } catch (error) {
    throw new EmailDeliveryError('Email delivery failed', error);
  }
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
