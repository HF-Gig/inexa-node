import sendEmail from '../helper/sendEmail.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sendPasswordResetMail = async ({ email, resetUrl }) => {
  try {
    if (!email || !resetUrl) {
      throw new Error('Email and resetUrl are required');
    }

    const subject = 'Inexa Password Reset';
    const html = `
      <div style="background:#fafafd;padding:32px 20px;">
        <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 2px 16px rgba(51,34,255,0.06);padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="cid:inexa-logo" alt="Inexa Logo" style="height:38px;margin-bottom:8px;letter-spacing:0.1em;" />
            <div style="font-family:Poppins,sans-serif;font-size:10px;color:#818181;">
              Interact.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Experience.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Accelerate.
            </div>
          </div>
          <div style="background:#fafafd;border-radius:16px;padding:32px 24px;border:1px solid #ededed;">
            <h2 style="font-family:Poppins, Tahoma,sans-serif;font-size:24px;font-weight:500;margin:0 0 12px 0;color:#222;">Hi,</h2>
            <p style="font-family:Montserrat, Verdana,sans-serif;font-size:16px;color:#222;margin:0 0 24px 0;font-weight:400">
              We have just received a password reset request. Please click the following button to do so.<br/><br/>Please disregard this e-mail if you did not request a password reset.
            </p>
            <a href="${resetUrl}" style="display:block;max-width:200px;margin-left:auto;margin-right:auto;padding:10px 32px;background:#3322ff;color:#fff;border-radius:20px;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;text-decoration:none;margin-bottom:24px;text-align:center;">
              Set Password
            </a>
            <p style="font-family:Montserrat, Verdana, sans-serif; font-size:16px; color:#222; margin:24px 0 8px 0;">
              Or copy this link and paste in your web browser.
            </p>
            <a href="${resetUrl}" style="font-family:Montserrat,Verdana,sans-serif;font-size:16px;color:#3322ff;word-break:break-all;">
              ${resetUrl}
            </a>
            <p style="font-family:Montserrat, Verdana,sans-serif;font-size:16px;color:#222;margin:24px 0 0 0;">
              Thank you,
            </p>
            <p style="font-family:Montserrat, Verdana,sans-serif;font-size:16px;color:#222;margin:24px 0 0 0;">
              Inexa Support Team
            </p>
          </div>
          <div style="text-align:center;font-family:Montserrat, Verdana,sans-serif;font-size:13px;color:#818181;margin-top:32px;">
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
    console.error('Error sending password reset mail:', error);
    throw error;
  }
};