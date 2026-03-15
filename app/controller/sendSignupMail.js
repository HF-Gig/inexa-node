import sendEmail from '../helper/sendEmail.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sendSignupMail = async (reqBody) => {
  try {
    const { email, verifyUrl } = reqBody;
    if (!email) {
      throw new Error('Email is required.');
    }

    const subject = 'Verify your email';
    const html = `
      <div style="background:#fafafd;padding:48px 20px;">
        <div style="max-width:800px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 2px 16px rgba(51,34,255,0.06);padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="cid:inexa-logo" alt="Inexa Logo" style="height:32px;margin-bottom:8px;" />
            <div style="font-family:Poppins,sans-serif;font-size:13px;color:#818181;letter-spacing:0.04em;">
              Interact. Experience. Accelerate.
            </div>
          </div>
          <div style="background:#fafafd;border-radius:16px;padding:24px;border:1px solid #ededed;">
            <h2 style="display:block;max-width:200px;margin-left:auto;margin-right:auto;color:#000;border-radius:20px;font-family:Poppins,sans-serif;font-size:24px;font-weight:600;text-decoration:none;margin-bottom:24px;text-align:center;">Verify Your Email</h2>
            <h2 style="font-family:Poppins,Tahoma,sans-serif;font-size:22px;font-weight:600;margin:0 0 12px 0;color:#222;">Hello,</h2>
            <p style="font-family:Montserrat,Verdana,sans-serif;font-size:15px;color:#222;margin:0 0 24px 0;">
              Please click the button below to verify your email address.
            </p>
            <a href="${verifyUrl}" style="display:block;max-width:200px;margin-left:auto;margin-right:auto;padding:10px 32px;background:#3322ff;color:#fff;border-radius:20px;font-family:Poppins,sans-serif;font-size:15px;font-weight:550;text-decoration:none;margin-bottom:24px;text-align:center;">
              Verify Email Address
            </a>
            <p style="font-family:Montserrat,Verdana,sans-serif;font-size:15px;color:#222;margin:0 0 24px 0;">
              You may also copy and paste this link in your web browser:<br/><br/><span style="color:#3322ff">${verifyUrl}<span/>
            </p>
            <p style="font-family:Montserrat,Verdana,sans-serif;font-size:13px;color:#222;margin:24px 0 0 0;">
              To ensure that you receive future emails from us, please add Inexa to your email contacts.
            </p>
          </div>
          <div style="text-align:center;font-family:Montserrat,Verdana,sans-serif;font-size:13px;color:#818181;margin-top:32px;">
            Need help? <a href="mailto:help@inexa.co.za" style="color:#3322ff;text-decoration:underline;">Contact Support</a>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
      attachments: [{
        filename: 'inexa_blkBlu.png',
        path: path.join(__dirname, '../../uploads/logos/partner-inexa.png'),
        cid: 'inexa-logo'
      }]
    });
    return true;
  } catch (error) {
    console.error('Sending error:', error);
    throw new Error('Failed to send email. Please try again later.');
  }
};