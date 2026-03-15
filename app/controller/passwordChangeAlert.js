import sendEmail from '../helper/sendEmail.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const passwordChangeAlert = async (req, res) => {

  const { email } = req.body;
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const subject = 'Inexa Password Reset Alert';
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
              The password for your Inexa account was recently changed. If this was changed in error, please <a href="${process.env.FRONTEND_URL}" target="blank">reset your password</a> here as soon as possible and clicking Forgot your password.
            </p>
            <p style="font-family:Montserrat, Verdana,sans-serif;font-size:16px;color:#222;margin:24px 0 0 0;">
              Thank you,
            </p>
            <br/>
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

    return res.status(200).json({
      success: true,
      message: "Password change alert email sent"
    });
  } catch (error) {
    console.error('Error sending password reset mail:', error);
    throw error;
  }
};