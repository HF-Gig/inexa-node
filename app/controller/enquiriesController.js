import initModels from '../../models/init_models.js';
import sendEmail from '../helper/sendEmail.js';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || null;
};

export const createEnquiry = async (req, res) => {
  try {
    const { full_name, email, phone, whatsapp_callback, course_id, course_title, source_page } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const db = await initModels();

    const user_id = req.user?.id || null;
    const ip_address = getClientIp(req);

    const enquiry = await db.enquiry.create({
      full_name,
      email,
      phone: phone || null,
      whatsapp_callback: whatsapp_callback || false,
      course_id: course_id || null,
      course_title: course_title || null,
      user_id,
      source_page: source_page || null,
      ip_address,
    });

    try {
      await sendEmail({
        to: 'sales@inexa.co.za',
        subject: `New Program Enquiry: ${course_title || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Enquiry Received</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${full_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="tel:${phone}">${phone}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">WhatsApp Callback:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${whatsapp_callback ? 'Yes, please call back' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Program:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${course_title || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Source Page:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${source_page || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Submitted:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</td>
              </tr>
            </table>
            
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              This enquiry was submitted via the Inexa website program detail page.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send enquiry notification email:', emailError);
    }

    res.status(201).json({
      message: 'Enquiry submitted successfully.',
      enquiry: {
        id: enquiry.id,
        full_name: enquiry.full_name,
        email: enquiry.email,
      },
    });
  } catch (error) {
    console.error('Enquiry submission error:', error);
    res.status(500).json({ error: 'Failed to submit enquiry. Please try again later.' });
  }
};

export const getEnquiries = async (req, res) => {
  try {
    const db = await initModels();
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: enquiries } = await db.enquiry.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: db.courses, as: 'course', attributes: ['id', 'title'] },
        { model: db.user, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });

    res.status(200).json({
      enquiries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries.' });
  }
};

export const checkEnquirySubmission = async (req, res) => {
  try {
    const { course_id } = req.params;
    
    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    const db = await initModels();
    const user_id = req.user?.id || null;
    const ip_address = getClientIp(req);

    let hasSubmitted = false;

    if (user_id) {
      const existingByUser = await db.enquiry.findOne({
        where: {
          course_id: parseInt(course_id),
          user_id,
        },
      });
      hasSubmitted = !!existingByUser;
    }

    if (!hasSubmitted && ip_address) {
      const existingByIp = await db.enquiry.findOne({
        where: {
          course_id: parseInt(course_id),
          ip_address,
        },
      });
      hasSubmitted = !!existingByIp;
    }

    res.status(200).json({
      course_id: parseInt(course_id),
      hasSubmitted,
    });
  } catch (error) {
    console.error('Error checking enquiry submission:', error);
    res.status(500).json({ error: 'Failed to check submission status.' });
  }
};
