import sendEmail from '../helper/sendEmail.js';
import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';

// POST /api/contact
export const submitContactForm = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, call, message, country } = req.body;
    const { contact } =  db;
    if (!fullName || !email || !message) {
      return res.status(400).json({ error: 'Full Name, Email, and Message are required.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const subject = 'New Contact Us Submission';
    const html = `
      <h2>New Contact Us Submission</h2>
      <p><strong>Full Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mobile Phone:</strong> ${mobileNumber || 'N/A'}</p>
      <p><strong>Country:</strong><br/>${country}</p>
      <p><strong>WhatsApp Call:</strong> ${call === 'yes' ? 'Call me back' : 'No'}</p>
      <p><strong>Message:</strong><br/>${message}</p>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      html
    });

    await contact.create({
      name: fullName,
      email,
      phone: mobileNumber,
      whatsapp_call: call,
      message,
      country
    });

    res.status(200).json({ message: 'Your message has been sent successfully.' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
};

// GET /api/contact/get-forms
export const getAllContactForms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;

    const { count, rows: contacts } = await db.contact.findAndCountAll({
      limit: pageSize,
      offset: offset,
      order: [['create_time', 'DESC']] // Assuming create_time is the field
    });

    const pagination = getPaginationMetadata({
      page,
      pageSize,
      totalItems: count
    });

    return res.json(formatPaginatedResponse({
      data: contacts,
      pagination
    }));
  } catch (error) {
    console.error('Error fetching contact forms:', error);
    res.status(500).json({ error: 'Failed to fetch contact forms' });
  }
};

// PUT /api/contact/:id/status
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const contact = await db.contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.update({ status });

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// DELETE /api/contact/:id
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await db.contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.destroy();

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
};


export const submitConsultationForm = async (req, res) => {
  try {
    const { firstName, email, phone, country } = req.body;
    if (!firstName || !email || !phone) {
      return res.status(400).json({ error: 'Full Name, Email, and Phone Number are required.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const subject = 'New Consultation Form Submission';
    const html = `
      <h2>New Consultation Form Submission</h2>
      <p><strong>Full Name:</strong> ${firstName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mobile Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Country:</strong><br/>${country}</p>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      html
    });

    res.status(200).json({ message: 'Your message has been sent successfully.' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
};